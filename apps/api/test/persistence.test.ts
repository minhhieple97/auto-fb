import { NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryDatabase } from "../src/persistence/in-memory.database.js";
import { buildCampaignInput, buildSourceInput } from "./helpers.js";

describe("InMemoryDatabase", () => {
  let db: InMemoryDatabase;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
    db = new InMemoryDatabase();
  });

  afterEach(() => vi.useRealTimers());

  it("creates, lists, gets and updates campaigns without exposing mutable state", () => {
    const campaign = db.createCampaign(buildCampaignInput());

    expect(db.listCampaigns()).toHaveLength(1);
    expect(db.getCampaign(campaign.id)).toMatchObject({ name: "Launch campaign", status: "ACTIVE" });

    const mutated = db.getCampaign(campaign.id);
    mutated.name = "Mutated outside database";

    vi.setSystemTime(new Date("2026-05-01T00:01:00.000Z"));
    const updated = db.updateCampaign(campaign.id, { status: "PAUSED", topic: "New topic" });

    expect(updated).toMatchObject({ name: "Launch campaign", status: "PAUSED", topic: "New topic" });
    expect(updated.updatedAt).toBe("2026-05-01T00:01:00.000Z");
  });

  it("throws NotFoundException when a campaign or source does not exist", () => {
    expect(() => db.getCampaign("missing")).toThrow(NotFoundException);
    expect(() => db.createSource("missing", buildSourceInput())).toThrow(NotFoundException);
    expect(() => db.getSource("missing")).toThrow(NotFoundException);
  });

  it("stores sources per campaign", () => {
    const firstCampaign = db.createCampaign(buildCampaignInput({ name: "First" }));
    const secondCampaign = db.createCampaign(buildCampaignInput({ name: "Second" }));
    const firstSource = db.createSource(firstCampaign.id, buildSourceInput({ url: "https://example.com/first" }));
    db.createSource(secondCampaign.id, buildSourceInput({ url: "https://example.com/second" }));

    expect(db.listSources(firstCampaign.id)).toEqual([firstSource]);
  });

  it("deduplicates content by campaign and hash only", () => {
    const firstCampaign = db.createCampaign(buildCampaignInput({ name: "First" }));
    const secondCampaign = db.createCampaign(buildCampaignInput({ name: "Second" }));
    const input = {
      campaignId: firstCampaign.id,
      sourceId: "src_1",
      sourceUrl: "https://example.com/story",
      title: "Story",
      rawText: "Text",
      summary: "Text",
      imageUrls: [],
      hash: "hash_1"
    };

    const created = db.createContentItem(input);
    const duplicate = db.createContentItem(input);
    const otherCampaign = db.createContentItem({ ...input, campaignId: secondCampaign.id });

    expect(created.duplicate).toBe(false);
    expect(duplicate).toMatchObject({ duplicate: true, item: { id: created.item.id } });
    expect(otherCampaign.duplicate).toBe(false);
    expect(db.hasContentHash(firstCampaign.id, "hash_1")).toBe(true);
  });

  it("hydrates drafts with content and image assets", () => {
    const campaign = db.createCampaign(buildCampaignInput());
    const content = db.createContentItem({
      campaignId: campaign.id,
      sourceId: "src_1",
      sourceUrl: "https://example.com/story",
      title: "Story",
      rawText: "Text",
      summary: "Summary",
      imageUrls: ["https://example.com/image.png"],
      hash: "hash_1"
    }).item;
    const image = db.createImageAsset({
      campaignId: campaign.id,
      sourceUrl: "https://example.com/image.png",
      r2Key: "campaigns/camp_1/image.png",
      publicUrl: "https://cdn.example.com/image.png",
      mimeType: "image/png"
    });

    const draft = db.createDraft({
      campaignId: campaign.id,
      contentItemId: content.id,
      imageAssetId: image.id,
      text: "Draft",
      status: "PENDING_APPROVAL",
      riskScore: 25,
      riskFlags: ["flag"],
      approvalStatus: "PENDING"
    });

    expect(draft.contentItem).toMatchObject({ id: content.id });
    expect(draft.imageAsset).toMatchObject({ id: image.id });
    expect(db.updateDraftStatus(draft.id, "APPROVED", "APPROVED")).toMatchObject({
      status: "APPROVED",
      approvalStatus: "APPROVED",
      contentItem: { id: content.id },
      imageAsset: { id: image.id }
    });
  });

  it("records published posts and agent runs, then clears all collections", () => {
    const campaign = db.createCampaign(buildCampaignInput());
    const post = db.createPublishedPost({
      postDraftId: "draft_1",
      facebookPageId: "page_1",
      facebookPostId: "fb_1",
      status: "PUBLISHED",
      publishPayload: { message: "hello" },
      publishedAt: "2026-05-01T00:00:00.000Z"
    });
    const run = db.addAgentRun({
      campaignId: campaign.id,
      graphRunId: "graph_1",
      nodeName: "load_campaign",
      inputJson: {},
      outputJson: {},
      status: "SUCCESS"
    });

    expect(db.listPublishedPosts()).toEqual([post]);
    expect(db.listAgentRuns(campaign.id)).toEqual([run]);

    db.clear();

    expect(db.listCampaigns()).toEqual([]);
    expect(db.listPublishedPosts()).toEqual([]);
    expect(db.listAgentRuns()).toEqual([]);
  });
});
