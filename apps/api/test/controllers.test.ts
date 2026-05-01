import { describe, expect, it, vi } from "vitest";
import { AgentRunsController } from "../src/workflow/agent-runs.controller.js";
import { CampaignsController } from "../src/campaigns/campaigns.controller.js";
import { DraftsController } from "../src/drafts/drafts.controller.js";
import { PublishingController } from "../src/publishing/publishing.controller.js";
import { SourcesController } from "../src/sources/sources.controller.js";
import {
  buildAgentRun,
  buildCampaign,
  buildCampaignInput,
  buildPostDraft,
  buildPublishedPost,
  buildSource,
  buildSourceInput
} from "./helpers.js";

describe("CampaignsController", () => {
  it("delegates campaign CRUD operations to the database", async () => {
    const db = {
      createCampaign: vi.fn().mockReturnValue(buildCampaign()),
      listCampaigns: vi.fn().mockReturnValue([buildCampaign()]),
      getCampaign: vi.fn().mockReturnValue(buildCampaign({ id: "camp_2" })),
      updateCampaign: vi.fn().mockReturnValue(buildCampaign({ status: "PAUSED" }))
    };
    const controller = new CampaignsController(db as never);

    await expect(controller.create(buildCampaignInput())).resolves.toMatchObject({ id: "camp_1" });
    await expect(controller.list()).resolves.toHaveLength(1);
    await expect(controller.get("camp_2")).resolves.toMatchObject({ id: "camp_2" });
    await expect(controller.update("camp_1", { status: "PAUSED" })).resolves.toMatchObject({ status: "PAUSED" });
    expect(db.updateCampaign).toHaveBeenCalledWith("camp_1", { status: "PAUSED" });
  });
});

describe("SourcesController", () => {
  it("creates and lists campaign sources", async () => {
    const db = {
      createSource: vi.fn().mockReturnValue(buildSource()),
      listSources: vi.fn().mockReturnValue([buildSource()])
    };
    const controller = new SourcesController(db as never);

    await expect(controller.create("camp_1", buildSourceInput())).resolves.toMatchObject({ campaignId: "camp_1" });
    await expect(controller.list("camp_1")).resolves.toHaveLength(1);
    expect(db.createSource).toHaveBeenCalledWith("camp_1", buildSourceInput());
    expect(db.listSources).toHaveBeenCalledWith("camp_1");
  });
});

describe("DraftsController", () => {
  it("lists drafts with optional status parsing", async () => {
    const db = { listDrafts: vi.fn().mockReturnValue([buildPostDraft()]) };
    const controller = new DraftsController(db as never, {} as never);

    await expect(controller.list("PENDING_APPROVAL")).resolves.toHaveLength(1);
    expect(db.listDrafts).toHaveBeenCalledWith("PENDING_APPROVAL");
    await expect(controller.list("INVALID" as never)).rejects.toThrow();
  });

  it("approves and publishes drafts", async () => {
    const db = { updateDraftStatus: vi.fn().mockReturnValue(buildPostDraft({ status: "APPROVED", approvalStatus: "APPROVED" })) };
    const publisher = { publishDraft: vi.fn().mockResolvedValue(buildPublishedPost({ status: "DRY_RUN_PUBLISHED" })) };
    const controller = new DraftsController(db as never, publisher as never);

    await expect(controller.approve("draft_1", { dryRun: true })).resolves.toMatchObject({ status: "DRY_RUN_PUBLISHED" });
    expect(db.updateDraftStatus).toHaveBeenCalledWith("draft_1", "APPROVED", "APPROVED");
    expect(publisher.publishDraft).toHaveBeenCalledWith("draft_1", { dryRun: true });
  });

  it("rejects drafts without publishing", async () => {
    const rejected = buildPostDraft({ status: "REJECTED", approvalStatus: "REJECTED" });
    const db = { updateDraftStatus: vi.fn().mockReturnValue(rejected) };
    const publisher = { publishDraft: vi.fn() };
    const controller = new DraftsController(db as never, publisher as never);

    await expect(controller.reject("draft_1")).resolves.toEqual(rejected);
    expect(db.updateDraftStatus).toHaveBeenCalledWith("draft_1", "REJECTED", "REJECTED");
    expect(publisher.publishDraft).not.toHaveBeenCalled();
  });
});

describe("PublishingController", () => {
  it("publishes drafts and lists published posts", async () => {
    const publishedPost = buildPublishedPost();
    const publisher = { publishDraft: vi.fn().mockResolvedValue(publishedPost) };
    const db = { listPublishedPosts: vi.fn().mockReturnValue([publishedPost]) };
    const controller = new PublishingController(publisher as never, db as never);

    await expect(controller.publish("draft_1", { dryRun: true })).resolves.toEqual(publishedPost);
    await expect(controller.list()).resolves.toEqual([publishedPost]);
    expect(publisher.publishDraft).toHaveBeenCalledWith("draft_1", { dryRun: true });
  });
});

describe("AgentRunsController", () => {
  it("starts workflow runs and lists agent run history", async () => {
    const workflowState = { campaignId: "camp_1", graphRunId: "graph_1" };
    const workflow = { run: vi.fn().mockResolvedValue(workflowState) };
    const db = { listAgentRuns: vi.fn().mockReturnValue([buildAgentRun()]) };
    const controller = new AgentRunsController(workflow as never, db as never);

    await expect(controller.run("camp_1")).resolves.toEqual(workflowState);
    await expect(controller.list("camp_1")).resolves.toHaveLength(1);
    expect(workflow.run).toHaveBeenCalledWith("camp_1");
    expect(db.listAgentRuns).toHaveBeenCalledWith("camp_1");
  });
});
