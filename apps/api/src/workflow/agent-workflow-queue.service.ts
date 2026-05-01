import { Inject, Injectable, InternalServerErrorException, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { Queue, Worker } from "bullmq";
import { agentWorkflowRunStatuses, type AgentWorkflowRunDetail } from "@auto-fb/shared";
import type { SupabaseActor } from "../auth/supabase-auth.service.js";
import { envKeys } from "../common/app.constants.js";
import { nowIso } from "../common/time.js";
import { DATABASE_REPOSITORY, type DatabaseRepository, type UpdateAgentWorkflowRunInput } from "../persistence/database.repository.js";
import { agentWorkflowQueueConfig } from "../worker/queue.constants.js";
import { redisConnection } from "../worker/redis-connection.js";
import { AgentWorkflowEventsService } from "./agent-workflow-events.service.js";
import { MultiAgentWorkflow } from "./multi-agent.workflow.js";

type AgentWorkflowJob = {
  campaignId: string;
  graphRunId: string;
};

type EnqueueWorkflowOptions = {
  graphRunId?: string;
};

@Injectable()
export class AgentWorkflowQueueService implements OnModuleDestroy {
  private readonly queue?: Queue<AgentWorkflowJob>;
  private readonly worker?: Worker<AgentWorkflowJob>;

  constructor(
    config: ConfigService,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository,
    private readonly workflow: MultiAgentWorkflow,
    private readonly events: AgentWorkflowEventsService
  ) {
    const redisUrl = config.get<string>(envKeys.redisUrl);
    if (redisUrl) {
      const connection = redisConnection(redisUrl);
      this.queue = new Queue<AgentWorkflowJob>(agentWorkflowQueueConfig.name, { connection });
      this.worker = new Worker<AgentWorkflowJob>(agentWorkflowQueueConfig.name, (job) => this.process(job.data), { connection });
    }
  }

  async enqueue(campaignId: string, actor: SupabaseActor, options: EnqueueWorkflowOptions = {}): Promise<AgentWorkflowRunDetail> {
    if (!this.queue) {
      throw new InternalServerErrorException(`${envKeys.redisUrl} is required to enqueue agent workflow runs`);
    }

    const graphRunId = options.graphRunId ?? randomUUID();
    const run = await this.db.createAgentWorkflowRun({
      campaignId,
      graphRunId,
      status: agentWorkflowRunStatuses.queued,
      triggeredByUserId: actor.id,
      ...(actor.email ? { triggeredByEmail: actor.email } : {})
    });

    try {
      await this.queue.add(
        agentWorkflowQueueConfig.jobName,
        { campaignId, graphRunId },
        {
          jobId: graphRunId,
          attempts: agentWorkflowQueueConfig.attempts,
          removeOnComplete: agentWorkflowQueueConfig.removeOnComplete,
          removeOnFail: agentWorkflowQueueConfig.removeOnFail
        }
      );
    } catch (error) {
      await this.updateWorkflowRun(graphRunId, { status: agentWorkflowRunStatuses.failed, finishedAt: nowIso() }).catch(() => undefined);
      throw error;
    }

    this.events.emit(run);
    return run;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.queue?.close(), this.worker?.close()]);
  }

  private async process(job: AgentWorkflowJob): Promise<void> {
    await this.updateWorkflowRun(job.graphRunId, { status: agentWorkflowRunStatuses.running, startedAt: nowIso() });

    try {
      await this.workflow.run(job.campaignId, {
        graphRunId: job.graphRunId,
        onStepStarted: async (step) => {
          await this.updateWorkflowRun(job.graphRunId, { status: agentWorkflowRunStatuses.running, currentNodeName: step.nodeName });
        },
        onStepCompleted: async () => {
          this.events.emit(await this.db.getAgentWorkflowRun(job.graphRunId));
        },
        onStepFailed: async (step) => {
          await this.updateWorkflowRun(job.graphRunId, { status: agentWorkflowRunStatuses.running, currentNodeName: step.nodeName });
        }
      });

      await this.updateWorkflowRun(job.graphRunId, { status: agentWorkflowRunStatuses.success, currentNodeName: null, finishedAt: nowIso() });
    } catch (error) {
      await this.updateWorkflowRun(job.graphRunId, { status: agentWorkflowRunStatuses.failed, finishedAt: nowIso() });
      throw error;
    }
  }

  private async updateWorkflowRun(graphRunId: string, input: UpdateAgentWorkflowRunInput): Promise<AgentWorkflowRunDetail> {
    const run = await this.db.updateAgentWorkflowRun(graphRunId, input);
    this.events.emit(run);
    return run;
  }
}
