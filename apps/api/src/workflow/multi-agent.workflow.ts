import { Inject, Injectable } from "@nestjs/common";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";
import type { AgentRun } from "@auto-fb/shared";
import { ApprovalGateAgent } from "../agents/approval-gate.agent.js";
import type { WorkflowState } from "../agents/agent.types.js";
import { CollectorAgent } from "../agents/collector.agent.js";
import { CopywritingAgent } from "../agents/copywriting.agent.js";
import { ImageAgent } from "../agents/image.agent.js";
import { QaComplianceAgent } from "../agents/qa-compliance.agent.js";
import { SourceDiscoveryAgent } from "../agents/source-discovery.agent.js";
import { UnderstandingAgent } from "../agents/understanding.agent.js";
import { nowIso } from "../common/time.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";

const WorkflowAnnotation = Annotation.Root({
  campaignId: Annotation<string>(),
  graphRunId: Annotation<string>(),
  campaign: Annotation<WorkflowState["campaign"]>(),
  sources: Annotation<WorkflowState["sources"]>(),
  rawItems: Annotation<WorkflowState["rawItems"]>(),
  understood: Annotation<WorkflowState["understood"]>(),
  draftText: Annotation<WorkflowState["draftText"]>(),
  imageAsset: Annotation<WorkflowState["imageAsset"]>(),
  qa: Annotation<WorkflowState["qa"]>(),
  draft: Annotation<WorkflowState["draft"]>()
});

type Awaitable<T> = T | Promise<T>;

export type WorkflowRunOptions = {
  graphRunId?: string;
  onStepStarted?: (run: AgentRun) => Awaitable<void>;
  onStepCompleted?: (run: AgentRun) => Awaitable<void>;
  onStepFailed?: (run: AgentRun) => Awaitable<void>;
};

@Injectable()
export class MultiAgentWorkflow {
  constructor(
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository,
    @Inject(SourceDiscoveryAgent) private readonly sourceDiscoveryAgent: SourceDiscoveryAgent,
    @Inject(CollectorAgent) private readonly collectorAgent: CollectorAgent,
    @Inject(UnderstandingAgent) private readonly understandingAgent: UnderstandingAgent,
    @Inject(CopywritingAgent) private readonly copywritingAgent: CopywritingAgent,
    @Inject(ImageAgent) private readonly imageAgent: ImageAgent,
    @Inject(QaComplianceAgent) private readonly qaComplianceAgent: QaComplianceAgent,
    @Inject(ApprovalGateAgent) private readonly approvalGateAgent: ApprovalGateAgent
  ) {}

  async run(campaignId: string, options: WorkflowRunOptions = {}): Promise<WorkflowState> {
    const graphRunId = options.graphRunId ?? randomUUID();
    const graph = new StateGraph(WorkflowAnnotation)
      .addNode("load_campaign", (state) =>
        this.runNode("load_campaign", state, options, async () => ({
          campaign: await this.db.getCampaign(state.campaignId)
        }))
      )
      .addNode("discover_sources", (state) =>
        this.runNode("discover_sources", state, options, async () => ({
          sources: await this.sourceDiscoveryAgent.discover(state.campaignId)
        }))
      )
      .addNode("collect_content", (state) =>
        this.runNode("collect_content", state, options, async () => ({
          rawItems: await this.collectorAgent.collect(required(state.sources, "sources"))
        }))
      )
      .addNode("understand_content", (state) =>
        this.runNode("understand_content", state, options, async () => ({
          understood: await this.understandingAgent.understand(
            required(state.campaign, "campaign"),
            required(state.rawItems, "rawItems")
          )
        }))
      )
      .addNode("generate_post", (state) =>
        this.runNode("generate_post", state, options, async () => ({
          draftText: await this.copywritingAgent.write(required(state.campaign, "campaign"), required(state.understood, "understood"))
        }))
      )
      .addNode("prepare_image", (state) =>
        this.runNode("prepare_image", state, options, async () => ({
          imageAsset: await this.imageAgent.prepare(required(state.campaign, "campaign"), required(state.understood, "understood"))
        }))
      )
      .addNode("qa_check", (state) =>
        this.runNode("qa_check", state, options, async () => ({
          qa: await this.qaComplianceAgent.check({
            understood: required(state.understood, "understood"),
            draftText: required(state.draftText, "draftText"),
            ...(state.imageAsset ? { imageAsset: state.imageAsset } : {})
          })
        }))
      )
      .addNode("save_pending_approval", (state) =>
        this.runNode("save_pending_approval", state, options, async () => ({
          draft: await this.approvalGateAgent.save({
            campaign: required(state.campaign, "campaign"),
            understood: required(state.understood, "understood"),
            draftText: required(state.draftText, "draftText"),
            qa: required(state.qa, "qa"),
            ...(state.imageAsset ? { imageAsset: state.imageAsset } : {})
          })
        }))
      )
      .addEdge(START, "load_campaign")
      .addEdge("load_campaign", "discover_sources")
      .addEdge("discover_sources", "collect_content")
      .addEdge("collect_content", "understand_content")
      .addEdge("understand_content", "generate_post")
      .addEdge("generate_post", "prepare_image")
      .addEdge("prepare_image", "qa_check")
      .addEdge("qa_check", "save_pending_approval")
      .addEdge("save_pending_approval", END)
      .compile();

    return graph.invoke({
      campaignId,
      graphRunId,
      campaign: undefined,
      sources: undefined,
      rawItems: undefined,
      understood: undefined,
      draftText: undefined,
      imageAsset: undefined,
      qa: undefined,
      draft: undefined
    });
  }

  private async runNode(
    nodeName: string,
    state: WorkflowState,
    options: WorkflowRunOptions,
    handler: () => Promise<Partial<WorkflowState>> | Partial<WorkflowState>
  ): Promise<Partial<WorkflowState>> {
    const startedAt = nowIso();
    const run = await this.db.addAgentRun({
      campaignId: state.campaignId,
      graphRunId: state.graphRunId,
      nodeName,
      inputJson: safeJson(state),
      outputJson: {},
      status: "RUNNING",
      startedAt
    });
    await options.onStepStarted?.(run);

    try {
      const output = await handler();
      const completedRun = await this.db.updateAgentRun(run.id, {
        outputJson: safeJson(output),
        status: "SUCCESS",
        completedAt: nowIso()
      });
      await options.onStepCompleted?.(completedRun);
      return output;
    } catch (error) {
      const failedRun = await this.db.updateAgentRun(run.id, {
        outputJson: {},
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: nowIso()
      });
      await options.onStepFailed?.(failedRun);
      throw error;
    }
  }
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing workflow state: ${name}`);
  return value;
}

function safeJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}
