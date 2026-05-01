import { describe, expect, it, vi } from "vitest";
import { MultiAgentWorkflow } from "../src/workflow/multi-agent.workflow.js";
import { InMemoryDatabase } from "../src/persistence/in-memory.database.js";
import { buildCampaignInput, buildContentItem, buildImageAsset, buildPostDraft, buildRawItem, buildSource, buildUnderstood } from "./helpers.js";

function createWorkflowHarness(overrides: Partial<Record<string, unknown>> = {}) {
  const db = new InMemoryDatabase();
  const campaign = db.createCampaign(buildCampaignInput());
  const source = buildSource({ campaignId: campaign.id });
  const contentItem = buildContentItem({ campaignId: campaign.id });
  const imageAsset = buildImageAsset({ campaignId: campaign.id });
  const draft = buildPostDraft({ campaignId: campaign.id, contentItemId: contentItem.id, imageAssetId: imageAsset.id });
  const agents = {
    sourceDiscovery: { discover: vi.fn().mockResolvedValue([source]) },
    collector: { collect: vi.fn().mockResolvedValue([buildRawItem({ sourceId: source.id })]) },
    understanding: { understand: vi.fn().mockResolvedValue(buildUnderstood({ item: contentItem })) },
    copywriting: { write: vi.fn().mockResolvedValue("Draft text\n\nNguon: https://example.com/story") },
    image: { prepare: vi.fn().mockResolvedValue(imageAsset) },
    qa: { check: vi.fn().mockResolvedValue({ riskScore: 0, riskFlags: [], approvedForHumanReview: true }) },
    approvalGate: { save: vi.fn().mockResolvedValue(draft) },
    ...overrides
  };
  const workflow = new MultiAgentWorkflow(
    db,
    agents.sourceDiscovery as never,
    agents.collector as never,
    agents.understanding as never,
    agents.copywriting as never,
    agents.image as never,
    agents.qa as never,
    agents.approvalGate as never
  );

  return { db, campaign, source, contentItem, imageAsset, draft, agents, workflow };
}

describe("MultiAgentWorkflow", () => {
  it("runs all workflow nodes in order and returns the final state", async () => {
    const { db, campaign, source, contentItem, imageAsset, draft, agents, workflow } = createWorkflowHarness();

    const state = await workflow.run(campaign.id);

    expect(state).toMatchObject({
      campaign: { id: campaign.id },
      sources: [source],
      understood: { item: contentItem },
      draftText: "Draft text\n\nNguon: https://example.com/story",
      imageAsset,
      qa: { riskScore: 0, riskFlags: [] },
      draft
    });
    expect(agents.sourceDiscovery.discover).toHaveBeenCalledWith(campaign.id);
    expect(agents.collector.collect).toHaveBeenCalledWith([source]);
    expect(agents.understanding.understand).toHaveBeenCalledWith(expect.objectContaining({ id: campaign.id }), [
      buildRawItem({ sourceId: source.id })
    ]);
    expect(db.listAgentRuns(campaign.id).map((run) => run.nodeName)).toEqual([
      "load_campaign",
      "discover_sources",
      "collect_content",
      "understand_content",
      "generate_post",
      "prepare_image",
      "qa_check",
      "save_pending_approval"
    ]);
    expect(db.listAgentRuns(campaign.id).every((run) => run.status === "SUCCESS")).toBe(true);
  });

  it("records failed node details before rethrowing workflow errors", async () => {
    const error = new Error("LLM unavailable");
    const { db, campaign, workflow } = createWorkflowHarness({
      copywriting: { write: vi.fn().mockRejectedValue(error) }
    });

    await expect(workflow.run(campaign.id)).rejects.toThrow("LLM unavailable");

    const failedRun = db.listAgentRuns(campaign.id).find((run) => run.status === "FAILED");
    expect(failedRun).toMatchObject({
      nodeName: "generate_post",
      outputJson: {},
      errorMessage: "LLM unavailable"
    });
  });
});
