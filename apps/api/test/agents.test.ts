import { describe, expect, it, vi } from "vitest";
import { ApprovalGateAgent } from "../src/agents/approval-gate.agent.js";
import { CollectorAgent } from "../src/agents/collector.agent.js";
import { CopywritingAgent } from "../src/agents/copywriting.agent.js";
import { ImageAgent } from "../src/agents/image.agent.js";
import { QaComplianceAgent } from "../src/agents/qa-compliance.agent.js";
import { SourceDiscoveryAgent } from "../src/agents/source-discovery.agent.js";
import { UnderstandingAgent } from "../src/agents/understanding.agent.js";
import { FakeDatabase } from "./fake-database.js";
import {
  buildCampaign,
  buildCampaignInput,
  buildContentItem,
  buildImageAsset,
  buildRawItem,
  buildSource,
  buildSourceInput,
  buildUnderstood
} from "./helpers.js";

describe("SourceDiscoveryAgent", () => {
  it("returns only enabled sources for a campaign", async () => {
    const db = new FakeDatabase();
    const campaign = db.createCampaign(buildCampaignInput());
    const enabled = db.createSource(campaign.id, buildSourceInput({ url: "https://example.com/enabled" }));
    db.createSource(campaign.id, buildSourceInput({ url: "https://example.com/disabled", enabled: false }));

    await expect(new SourceDiscoveryAgent(db).discover(campaign.id)).resolves.toEqual([enabled]);
  });

  it("throws when the campaign has no enabled sources", async () => {
    const db = new FakeDatabase();
    const campaign = db.createCampaign(buildCampaignInput());
    db.createSource(campaign.id, buildSourceInput({ enabled: false }));

    await expect(new SourceDiscoveryAgent(db).discover(campaign.id)).rejects.toThrow("Campaign has no enabled whitelist sources");
  });
});

describe("CollectorAgent", () => {
  it("filters unusable empty content", async () => {
    const collector = {
      collect: vi.fn().mockResolvedValue([buildRawItem({ text: "   " }), buildRawItem({ title: "Usable", text: "Content" })])
    };
    const agent = new CollectorAgent(collector as never);

    await expect(agent.collect([buildSource()])).resolves.toMatchObject([{ title: "Usable", text: "Content" }]);
  });

  it("throws when no collected content is usable", async () => {
    const collector = { collect: vi.fn().mockResolvedValue([buildRawItem({ text: "" })]) };
    const agent = new CollectorAgent(collector as never);

    await expect(agent.collect([buildSource()])).rejects.toThrow("No usable content found from enabled sources");
  });
});

describe("UnderstandingAgent", () => {
  it("selects the first raw item, stores content and extracts facts", async () => {
    const db = new FakeDatabase();
    const campaign = db.createCampaign(buildCampaignInput());
    const agent = new UnderstandingAgent(db);

    const result = await agent.understand(campaign, [
      buildRawItem({
        title: "Selected",
        text: " First sentence. Second sentence! Third sentence? Fifth sentence. Extra sentence.",
        images: ["https://example.com/image.png"]
      })
    ]);

    expect(result).toMatchObject({
      duplicate: false,
      summary: "First sentence. Second sentence! Third sentence? Fifth sentence. Extra sentence.",
      keyFacts: ["First sentence.", "Second sentence!", "Third sentence?", "Fifth sentence."],
      item: {
        campaignId: campaign.id,
        title: "Selected",
        imageUrls: ["https://example.com/image.png"]
      }
    });
    expect(db.listContentItems(campaign.id)).toHaveLength(1);
  });

  it("marks duplicate content for the same campaign", async () => {
    const db = new FakeDatabase();
    const campaign = db.createCampaign(buildCampaignInput());
    const agent = new UnderstandingAgent(db);
    const rawItem = buildRawItem({ title: "Same", text: "Same text" });

    await agent.understand(campaign, [rawItem]);
    const duplicate = await agent.understand(campaign, [rawItem]);

    expect(duplicate.duplicate).toBe(true);
  });

  it("throws when no raw item is available", async () => {
    await expect(new UnderstandingAgent(new FakeDatabase()).understand(buildCampaign(), [])).rejects.toThrow(
      "No content item selected for understanding"
    );
  });
});

describe("CopywritingAgent", () => {
  it("delegates to LlmService with campaign and understood content context", async () => {
    const llm = {
      generatePost: vi.fn().mockResolvedValue({ text: "  Draft text  ", provider: "mock", model: "mock-copywriter-v1" })
    };
    const agent = new CopywritingAgent(llm as never);
    const campaign = buildCampaign({ topic: "Automation" });
    const understood = buildUnderstood();

    await expect(agent.write(campaign, understood)).resolves.toBe("Draft text");
    expect(llm.generatePost).toHaveBeenCalledWith({
      provider: "mock",
      model: "mock-copywriter-v1",
      topic: "Automation",
      language: "vi",
      brandVoice: "helpful, concise, practical",
      summary: understood.summary,
      keyFacts: understood.keyFacts,
      sourceUrl: understood.item.sourceUrl
    });
  });

  it("throws when the LLM returns empty text", async () => {
    const llm = { generatePost: vi.fn().mockResolvedValue({ text: "   " }) };

    await expect(new CopywritingAgent(llm as never).write(buildCampaign(), buildUnderstood())).rejects.toThrow(
      "LLM returned empty post text"
    );
  });
});

describe("ImageAgent", () => {
  it("skips image preparation when the content has no images", async () => {
    const storage = { uploadRemoteImage: vi.fn() };
    const asset = await new ImageAgent(storage as never).prepare(buildCampaign(), buildUnderstood());

    expect(asset).toBeUndefined();
    expect(storage.uploadRemoteImage).not.toHaveBeenCalled();
  });

  it("uploads the first content image", async () => {
    const image = buildImageAsset();
    const storage = { uploadRemoteImage: vi.fn().mockResolvedValue(image) };
    const campaign = buildCampaign({ id: "camp_image" });
    const understood = buildUnderstood({ item: buildContentItem({ imageUrls: ["https://example.com/a.png", "https://example.com/b.png"] }) });

    await expect(new ImageAgent(storage as never).prepare(campaign, understood)).resolves.toEqual(image);
    expect(storage.uploadRemoteImage).toHaveBeenCalledWith({ campaignId: "camp_image", sourceUrl: "https://example.com/a.png" });
  });
});

describe("QaComplianceAgent", () => {
  it("approves clean drafts for human review", async () => {
    const result = await new QaComplianceAgent().check({
      understood: buildUnderstood(),
      draftText: "Draft text\n\nNguon: https://example.com/story"
    });

    expect(result).toEqual({ riskScore: 0, riskFlags: [], approvedForHumanReview: true });
  });

  it("flags duplicate, attribution, length, image and sensitive claim risks", async () => {
    const result = await new QaComplianceAgent().check({
      understood: buildUnderstood({
        duplicate: true,
        item: buildContentItem({ sourceUrl: "https://example.com/source", imageUrls: ["https://example.com/image.png"] })
      }),
      draftText: `${"x".repeat(3001)} guaranteed`
    });

    expect(result.riskFlags).toEqual([
      "duplicate_content",
      "missing_source_attribution",
      "post_too_long",
      "image_not_prepared",
      "sensitive_or_unverified_claim"
    ]);
    expect(result.riskScore).toBe(100);
    expect(result.approvedForHumanReview).toBe(false);
  });

  it("flags Vietnamese sensitive claims with diacritics", async () => {
    const result = await new QaComplianceAgent().check({
      understood: buildUnderstood({ item: buildContentItem({ sourceUrl: "https://example.com/source" }) }),
      draftText: "Liệu trình cam kết chữa khỏi 100% trong 7 ngày. https://example.com/source"
    });

    expect(result.riskFlags).toContain("sensitive_or_unverified_claim");
  });

  it("does not flag image preparation when an image asset exists", async () => {
    const result = await new QaComplianceAgent().check({
      understood: buildUnderstood({
        item: buildContentItem({ sourceUrl: "https://example.com/source", imageUrls: ["https://example.com/image.png"] })
      }),
      draftText: "Draft text\n\nNguon: https://example.com/source",
      imageAsset: buildImageAsset()
    });

    expect(result).toEqual({ riskScore: 0, riskFlags: [], approvedForHumanReview: true });
  });
});

describe("ApprovalGateAgent", () => {
  it("persists a pending approval draft with QA metadata and optional image asset", async () => {
    const db = new FakeDatabase();
    const campaign = db.createCampaign(buildCampaignInput());
    const content = db.createContentItem({
      campaignId: campaign.id,
      sourceId: "src_1",
      sourceUrl: "https://example.com/story",
      title: "Story",
      rawText: "Text",
      summary: "Summary",
      imageUrls: [],
      hash: "hash_1"
    }).item;
    const image = db.createImageAsset({
      campaignId: campaign.id,
      sourceUrl: "https://example.com/image.png",
      r2Key: "campaigns/camp_1/image.png",
      publicUrl: "https://cdn.example.com/image.png",
      mimeType: "image/png"
    });

    const draft = await new ApprovalGateAgent(db).save({
      campaign,
      understood: buildUnderstood({ item: content }),
      draftText: "Draft",
      qa: { riskScore: 25, riskFlags: ["missing_source_attribution"], approvedForHumanReview: true },
      imageAsset: image
    });

    expect(draft).toMatchObject({
      campaignId: campaign.id,
      contentItemId: content.id,
      imageAssetId: image.id,
      status: "PENDING_APPROVAL",
      riskScore: 25,
      riskFlags: ["missing_source_attribution"],
      approvalStatus: "PENDING"
    });
  });

  it("persists pending approval drafts without image assets", async () => {
    const db = new FakeDatabase();
    const campaign = db.createCampaign(buildCampaignInput());
    const content = db.createContentItem({
      campaignId: campaign.id,
      sourceId: "src_1",
      sourceUrl: "https://example.com/story",
      title: "Story",
      rawText: "Text",
      summary: "Summary",
      imageUrls: [],
      hash: "hash_1"
    }).item;

    const draft = await new ApprovalGateAgent(db).save({
      campaign,
      understood: buildUnderstood({ item: content }),
      draftText: "Draft",
      qa: { riskScore: 0, riskFlags: [], approvedForHumanReview: true }
    });

    expect(draft).toMatchObject({
      campaignId: campaign.id,
      contentItemId: content.id,
      status: "PENDING_APPROVAL",
      approvalStatus: "PENDING"
    });
    expect(draft.imageAssetId).toBeUndefined();
  });
});
