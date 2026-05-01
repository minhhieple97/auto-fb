import { describe, expect, it, vi } from "vitest";
import { permissionsForRole } from "@auto-fb/shared";
import { AgentRunsController } from "../src/workflow/agent-runs.controller.js";
import { CampaignsController } from "../src/campaigns/campaigns.controller.js";
import { DraftsController } from "../src/drafts/drafts.controller.js";
import { PublishingController } from "../src/publishing/publishing.controller.js";
import { SearchAgentController } from "../src/agents/search-agent.controller.js";
import { SourcesController } from "../src/sources/sources.controller.js";
import { FanpagesController } from "../src/fanpages/fanpages.controller.js";
import {
  buildAgentRun,
  buildAgentWorkflowRun,
  buildCampaign,
  buildCampaignInput,
  buildContentItem,
  buildFanpage,
  buildFanpageInput,
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

describe("FanpagesController", () => {
  it("delegates fanpage CRUD, source, run, and token test operations", async () => {
    const fanpage = buildFanpage();
    const fanpages = {
      create: vi.fn().mockResolvedValue(fanpage),
      list: vi.fn().mockResolvedValue([fanpage]),
      get: vi.fn().mockResolvedValue(fanpage),
      update: vi.fn().mockResolvedValue({ ...fanpage, status: "PAUSED" }),
      updateSchedule: vi.fn().mockResolvedValue(fanpage),
      updateToken: vi.fn().mockResolvedValue(fanpage),
      testConnection: vi.fn().mockResolvedValue({ ok: true, facebookPageId: "page_1", environment: "sandbox" })
    };
    const queue = { enqueue: vi.fn().mockResolvedValue(buildAgentWorkflowRun()) };
    const db = {
      getFanpage: vi.fn().mockResolvedValue(fanpage),
      createSource: vi.fn().mockResolvedValue(buildSource()),
      listSources: vi.fn().mockResolvedValue([buildSource()])
    };
    const controller = new FanpagesController(fanpages as never, queue as never, db as never);
    const actor = {
      authUserId: "user_1",
      email: "admin@example.com",
      id: "user_1",
      permissions: permissionsForRole("owner"),
      role: "owner" as const,
      status: "active" as const
    };

    await expect(controller.create(buildFanpageInput())).resolves.toMatchObject({ id: "fanpage_1" });
    await expect(controller.list()).resolves.toHaveLength(1);
    await expect(controller.get("fanpage_1")).resolves.toEqual(fanpage);
    await expect(controller.update("fanpage_1", { status: "PAUSED" })).resolves.toMatchObject({ status: "PAUSED" });
    await expect(controller.updateSchedule("fanpage_1", fanpage.scheduleConfig)).resolves.toEqual(fanpage);
    await expect(controller.updateToken("fanpage_1", { pageAccessToken: "token_1234" })).resolves.toEqual(fanpage);
    await expect(controller.testConnection("fanpage_1")).resolves.toMatchObject({ ok: true });
    await expect(controller.createSource("fanpage_1", buildSourceInput())).resolves.toMatchObject({ campaignId: "camp_1" });
    await expect(controller.listSources("fanpage_1")).resolves.toHaveLength(1);
    await expect(controller.run("fanpage_1", { headers: {}, user: actor })).resolves.toMatchObject({ graphRunId: "graph_1" });

    expect(db.createSource).toHaveBeenCalledWith("camp_1", buildSourceInput());
    expect(queue.enqueue).toHaveBeenCalledWith("camp_1", actor);
  });
});

describe("SearchAgentController", () => {
  it("delegates search and selected-result generation to the search agent", async () => {
    const searchResult = {
      id: "result-1",
      title: "AI automation source",
      url: "https://example.com/story",
      snippet: "Useful source context.",
      sourceName: "example.com"
    };
    const searchResponse = {
      query: "AI automation",
      provider: "gemini" as const,
      model: "gemini-2.5-flash",
      searchQueries: ["AI automation"],
      results: [searchResult]
    };
    const generateResponse = {
      draft: buildPostDraft(),
      contentItem: buildContentItem(),
      duplicate: false
    };
    const searchAgent = {
      search: vi.fn().mockResolvedValue(searchResponse),
      generate: vi.fn().mockResolvedValue(generateResponse)
    };
    const controller = new SearchAgentController(searchAgent as never);

    await expect(
      controller.search("camp_1", { query: "AI automation", limit: 10, provider: "gemini", model: "gemini-2.5-flash" })
    ).resolves.toEqual(searchResponse);
    await expect(
      controller.generate("camp_1", { selectedResults: [searchResult], provider: "gemini", model: "gemini-2.5-flash" })
    ).resolves.toEqual(generateResponse);
    expect(searchAgent.search).toHaveBeenCalledWith("camp_1", {
      query: "AI automation",
      limit: 10,
      provider: "gemini",
      model: "gemini-2.5-flash"
    });
    expect(searchAgent.generate).toHaveBeenCalledWith("camp_1", {
      selectedResults: [searchResult],
      provider: "gemini",
      model: "gemini-2.5-flash"
    });
  });
});

describe("DraftsController", () => {
  it("lists drafts with optional status parsing", async () => {
    const db = { listDrafts: vi.fn().mockReturnValue([buildPostDraft()]) };
    const controller = new DraftsController(db as never, {} as never);

    await expect(controller.list("PENDING_APPROVAL")).resolves.toHaveLength(1);
    expect(db.listDrafts).toHaveBeenCalledWith({ status: "PENDING_APPROVAL" });
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
    await expect(controller.list("fanpage_1")).resolves.toEqual([publishedPost]);
    expect(publisher.publishDraft).toHaveBeenCalledWith("draft_1", { dryRun: true });
    expect(db.listPublishedPosts).toHaveBeenCalledWith({ fanpageId: "fanpage_1" });
  });
});

describe("AgentRunsController", () => {
  it("enqueues workflow runs and lists workflow and step history", async () => {
    const workflowRun = buildAgentWorkflowRun();
    const queue = { enqueue: vi.fn().mockResolvedValue(workflowRun) };
    const events = { stream: vi.fn() };
    const db = {
      listAgentRuns: vi.fn().mockReturnValue([buildAgentRun()]),
      listAgentWorkflowRuns: vi.fn().mockReturnValue([workflowRun])
    };
    const controller = new AgentRunsController(queue as never, events as never, db as never);
    const actor = {
      authUserId: "user_1",
      email: "admin@example.com",
      id: "user_1",
      permissions: permissionsForRole("owner"),
      role: "owner" as const,
      status: "active" as const
    };

    await expect(controller.run("camp_1", { headers: {}, user: actor })).resolves.toEqual(workflowRun);
    await expect(controller.list("camp_1", "graph_1")).resolves.toHaveLength(1);
    await expect(controller.listWorkflowRuns("camp_1", "QUEUED", "25")).resolves.toHaveLength(1);
    expect(queue.enqueue).toHaveBeenCalledWith("camp_1", actor);
    expect(db.listAgentRuns).toHaveBeenCalledWith({ campaignId: "camp_1", graphRunId: "graph_1" });
    expect(db.listAgentWorkflowRuns).toHaveBeenCalledWith({ campaignId: "camp_1", status: "QUEUED", limit: 25 });
  });
});
