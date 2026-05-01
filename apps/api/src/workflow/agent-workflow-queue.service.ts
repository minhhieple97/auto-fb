import { Inject, Injectable, InternalServerErrorException, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { Queue, Worker } from "bullmq";
import type { AgentWorkflowRunDetail } from "@auto-fb/shared";
import type { SupabaseActor } from "../auth/supabase-auth.service.js";
import { nowIso } from "../common/time.js";
import { DATABASE_REPOSITORY, type DatabaseRepository, type UpdateAgentWorkflowRunInput } from "../persistence/database.repository.js";
import { AgentWorkflowEventsService } from "./agent-workflow-events.service.js";
import { MultiAgentWorkflow } from "./multi-agent.workflow.js";

type AgentWorkflowJob = {
  campaignId: string;
  graphRunId: string;
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
    const redisUrl = config.get<string>("REDIS_URL");
    if (redisUrl) {
      const connection = redisConnection(redisUrl);
      this.queue = new Queue<AgentWorkflowJob>("agent-workflow", { connection });
      this.worker = new Worker<AgentWorkflowJob>("agent-workflow", (job) => this.process(job.data), { connection });
    }
  }

  async enqueue(campaignId: string, actor: SupabaseActor): Promise<AgentWorkflowRunDetail> {
    if (!this.queue) {
      throw new InternalServerErrorException("REDIS_URL is required to enqueue agent workflow runs");
    }

    const graphRunId = randomUUID();
    const run = await this.db.createAgentWorkflowRun({
      campaignId,
      graphRunId,
      status: "QUEUED",
      triggeredByUserId: actor.id,
      ...(actor.email ? { triggeredByEmail: actor.email } : {})
    });

    try {
      await this.queue.add(
        "run-agent-workflow",
        { campaignId, graphRunId },
        { jobId: graphRunId, attempts: 1, removeOnComplete: 100, removeOnFail: 100 }
      );
    } catch (error) {
      await this.updateWorkflowRun(graphRunId, { status: "FAILED", finishedAt: nowIso() }).catch(() => undefined);
      throw error;
    }

    this.events.emit(run);
    return run;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.queue?.close(), this.worker?.close()]);
  }

  private async process(job: AgentWorkflowJob): Promise<void> {
    await this.updateWorkflowRun(job.graphRunId, { status: "RUNNING", startedAt: nowIso() });

    try {
      await this.workflow.run(job.campaignId, {
        graphRunId: job.graphRunId,
        onStepStarted: async (step) => {
          await this.updateWorkflowRun(job.graphRunId, { status: "RUNNING", currentNodeName: step.nodeName });
        },
        onStepCompleted: async () => {
          this.events.emit(await this.db.getAgentWorkflowRun(job.graphRunId));
        },
        onStepFailed: async (step) => {
          await this.updateWorkflowRun(job.graphRunId, { status: "RUNNING", currentNodeName: step.nodeName });
        }
      });

      await this.updateWorkflowRun(job.graphRunId, { status: "SUCCESS", currentNodeName: null, finishedAt: nowIso() });
    } catch (error) {
      await this.updateWorkflowRun(job.graphRunId, { status: "FAILED", finishedAt: nowIso() });
      throw error;
    }
  }

  private async updateWorkflowRun(graphRunId: string, input: UpdateAgentWorkflowRunInput): Promise<AgentWorkflowRunDetail> {
    const run = await this.db.updateAgentWorkflowRun(graphRunId, input);
    this.events.emit(run);
    return run;
  }
}

function redisConnection(redisUrl: string) {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    ...(parsed.password ? { password: parsed.password } : {})
  };
}
