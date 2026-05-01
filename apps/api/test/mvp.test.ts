import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { contentHash, normalizeForDedupe } from "../src/common/hash.js";
import { ApiAdapter } from "../src/collector/api.adapter.js";
import { RssAdapter } from "../src/collector/rss.adapter.js";
import { StaticHtmlAdapter } from "../src/collector/static-html.adapter.js";
import { providerDefinitions } from "../src/llm/provider-registry.js";
import { LlmService } from "../src/llm/llm.service.js";
import { InMemoryDatabase } from "../src/persistence/in-memory.database.js";
import { PublisherAgentService } from "../src/publishing/publisher-agent.service.js";
import { StorageService } from "../src/storage/storage.service.js";
import { MultiAgentWorkflow } from "../src/workflow/multi-agent.workflow.js";
import { SourceDiscoveryAgent } from "../src/agents/source-discovery.agent.js";
import { CollectorAgent } from "../src/agents/collector.agent.js";
import { CollectorService } from "../src/collector/collector.service.js";
import { UnderstandingAgent } from "../src/agents/understanding.agent.js";
import { CopywritingAgent } from "../src/agents/copywriting.agent.js";
import { ImageAgent } from "../src/agents/image.agent.js";
import { QaComplianceAgent } from "../src/agents/qa-compliance.agent.js";
import { ApprovalGateAgent } from "../src/agents/approval-gate.agent.js";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
}

function textResponse(payload: string, contentType = "text/html"): Response {
  return new Response(payload, { status: 200, headers: { "content-type": contentType } });
}

describe("source adapters", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("collects JSON API items", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([{ url: "https://example.com/a", title: "A", text: "Text A", imageUrl: "https://example.com/a.jpg" }])
    );
    const items = await new ApiAdapter().collect({
      id: "src_1",
      campaignId: "camp_1",
      type: "api",
      url: "https://example.com/api",
      crawlPolicy: "whitelist_only",
      enabled: true,
      createdAt: new Date().toISOString()
    });
    expect(items[0]?.title).toBe("A");
    expect(items[0]?.images).toEqual(["https://example.com/a.jpg"]);
  });

  it("collects static HTML metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      textResponse("<title>Hello</title><meta property=\"og:image\" content=\"/image.jpg\"><article>Article body</article>")
    );
    const items = await new StaticHtmlAdapter().collect({
      id: "src_1",
      campaignId: "camp_1",
      type: "static_html",
      url: "https://example.com/page",
      crawlPolicy: "whitelist_only",
      enabled: true,
      createdAt: new Date().toISOString()
    });
    expect(items[0]?.title).toBe("Hello");
    expect(items[0]?.images).toEqual(["https://example.com/image.jpg"]);
  });

  it("collects RSS items", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      textResponse(
        `<?xml version="1.0"?><rss version="2.0"><channel><item><title>RSS title</title><link>https://example.com/rss-a</link><description>RSS body</description></item></channel></rss>`,
        "application/rss+xml"
      )
    );
    const items = await new RssAdapter().collect({
      id: "src_1",
      campaignId: "camp_1",
      type: "rss",
      url: "https://example.com/feed.xml",
      crawlPolicy: "whitelist_only",
      enabled: true,
      createdAt: new Date().toISOString()
    });
    expect(items[0]?.title).toBe("RSS title");
  });
});

describe("dedupe and providers", () => {
  it("normalizes content before hashing", () => {
    expect(normalizeForDedupe("Xin CHAO!!!  https://example.com")).toBe("xin chao");
    expect(contentHash("Hello!!!")).toBe(contentHash("hello"));
  });

  it("registers all MVP LLM providers", () => {
    expect(providerDefinitions.map((definition) => definition.provider).sort()).toEqual([
      "anthropic",
      "deepseek",
      "gemini",
      "mock",
      "openai"
    ]);
  });
});

describe("storage and publisher", () => {
  it("builds R2 public URLs", () => {
    const db = new InMemoryDatabase();
    const storage = new StorageService(new ConfigService({ R2_PUBLIC_BASE_URL: "https://cdn.example.com/assets" }), db);
    expect(storage.publicUrlForKey("campaigns/a/image.jpg")).toBe("https://cdn.example.com/assets/campaigns/a/image.jpg");
  });

  it("publishes approved drafts in dry-run mode", async () => {
    const db = new InMemoryDatabase();
    const config = new ConfigService({ PUBLISH_DRY_RUN: "true" });
    const campaign = db.createCampaign({
      name: "Campaign",
      topic: "AI",
      language: "vi",
      brandVoice: "practical",
      targetPageId: "page_1",
      llmProvider: "mock",
      llmModel: "mock-copywriter-v1"
    });
    const source = db.createSource(campaign.id, {
      type: "api",
      url: "https://example.com/api",
      crawlPolicy: "whitelist_only",
      enabled: true
    });
    const content = db.createContentItem({
      campaignId: campaign.id,
      sourceId: source.id,
      sourceUrl: "https://example.com/a",
      title: "A",
      rawText: "Useful text",
      summary: "Useful text",
      imageUrls: [],
      hash: "h1"
    }).item;
    const draft = db.createDraft({
      campaignId: campaign.id,
      contentItemId: content.id,
      text: "Useful text\n\nNguon: https://example.com/a",
      status: "PENDING_APPROVAL",
      riskScore: 0,
      riskFlags: [],
      approvalStatus: "PENDING"
    });
    db.updateDraftStatus(draft.id, "APPROVED", "APPROVED");
    const result = await new PublisherAgentService(config, db).publishDraft(draft.id);
    expect(result.status).toBe("DRY_RUN_PUBLISHED");
    expect(result.facebookPostId).toContain("dry_run_");
  });
});

describe("multi-agent workflow", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("creates a pending approval draft and logs specialist nodes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([{ url: "https://example.com/a", title: "AI tools", text: "AI tools help teams save time. Teams should verify sources." }])
    );
    const db = new InMemoryDatabase();
    const config = new ConfigService({ NODE_ENV: "test" });
    const campaign = db.createCampaign({
      name: "Campaign",
      topic: "AI tools",
      language: "vi",
      brandVoice: "practical",
      targetPageId: "page_1",
      llmProvider: "mock",
      llmModel: "mock-copywriter-v1"
    });
    db.createSource(campaign.id, {
      type: "api",
      url: "https://example.com/api",
      crawlPolicy: "whitelist_only",
      enabled: true
    });
    const workflow = new MultiAgentWorkflow(
      db,
      new SourceDiscoveryAgent(db),
      new CollectorAgent(new CollectorService()),
      new UnderstandingAgent(db),
      new CopywritingAgent(new LlmService(config)),
      new ImageAgent(new StorageService(config, db)),
      new QaComplianceAgent(),
      new ApprovalGateAgent(db)
    );

    const state = await workflow.run(campaign.id);

    expect(state.draft?.status).toBe("PENDING_APPROVAL");
    expect(db.listDrafts("PENDING_APPROVAL")).toHaveLength(1);
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
  });
});
