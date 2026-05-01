import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublisherAgentService } from "../src/publishing/publisher-agent.service.js";
import { FakeDatabase } from "./fake-database.js";
import { buildCampaignInput, jsonResponse } from "./helpers.js";

function seedDraft(db: FakeDatabase, options: { approved?: boolean; imagePublicUrl?: string } = {}) {
  const campaign = db.createCampaign(buildCampaignInput({ targetPageId: "page_1" }));
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
  const image =
    options.imagePublicUrl === undefined
      ? undefined
      : db.createImageAsset({
          campaignId: campaign.id,
          sourceUrl: "https://example.com/image.png",
          r2Key: "campaigns/camp_1/image.png",
          ...(options.imagePublicUrl ? { publicUrl: options.imagePublicUrl } : {}),
          mimeType: "image/png"
        });
  const draft = db.createDraft({
    campaignId: campaign.id,
    contentItemId: content.id,
    ...(image ? { imageAssetId: image.id } : {}),
    text: "Draft text",
    status: options.approved ? "APPROVED" : "PENDING_APPROVAL",
    riskScore: 0,
    riskFlags: [],
    approvalStatus: options.approved ? "APPROVED" : "PENDING"
  });
  return { campaign, content, image, draft };
}

describe("PublisherAgentService", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("requires approval before publishing", async () => {
    const db = new FakeDatabase();
    const { draft } = seedDraft(db);

    await expect(new PublisherAgentService(new ConfigService(), db).publishDraft(draft.id)).rejects.toThrow(BadRequestException);
  });

  it("publishes approved drafts in dry-run mode by default and marks the draft as published", async () => {
    const db = new FakeDatabase();
    const { draft } = seedDraft(db, { approved: true });

    const post = await new PublisherAgentService(new ConfigService(), db).publishDraft(draft.id);

    expect(post).toMatchObject({
      postDraftId: draft.id,
      facebookPageId: "page_1",
      facebookPostId: `dry_run_${draft.id}`,
      status: "DRY_RUN_PUBLISHED",
      publishPayload: {
        pageId: "page_1",
        message: "Draft text",
        campaignId: expect.any(String),
        draftId: draft.id
      }
    });
    expect(db.getDraft(draft.id)).toMatchObject({ status: "PUBLISHED", approvalStatus: "APPROVED" });
  });

  it("honors explicit dry-run publishing even when real publishing is configured", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const db = new FakeDatabase();
    const { draft } = seedDraft(db, { approved: true });
    const service = new PublisherAgentService(
      new ConfigService({ PUBLISH_DRY_RUN: "false", META_PAGE_ACCESS_TOKEN: "page_token" }),
      db
    );

    const post = await service.publishDraft(draft.id, { dryRun: true });

    expect(post).toMatchObject({ status: "DRY_RUN_PUBLISHED", facebookPostId: `dry_run_${draft.id}` });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publishes text posts through Meta Graph API when dry-run is disabled", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ id: "page_1_post_1" }));
    const db = new FakeDatabase();
    const { draft } = seedDraft(db, { approved: true });
    const service = new PublisherAgentService(
      new ConfigService({
        PUBLISH_DRY_RUN: "false",
        META_PAGE_ACCESS_TOKEN: "page_token",
        META_GRAPH_API_VERSION: "v20.0"
      }),
      db
    );

    const post = await service.publishDraft(draft.id);

    expect(post).toMatchObject({ status: "PUBLISHED", facebookPostId: "page_1_post_1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/page_1/feed",
      expect.objectContaining({ method: "POST", body: expect.any(URLSearchParams) })
    );
    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("access_token")).toBe("page_token");
    expect(body.get("message")).toBe("Draft text");
  });

  it("publishes image posts through the photos endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ post_id: "photo_post_1" }));
    const db = new FakeDatabase();
    const { draft } = seedDraft(db, { approved: true, imagePublicUrl: "https://cdn.example.com/image.png" });
    const service = new PublisherAgentService(
      new ConfigService({ PUBLISH_DRY_RUN: "false", META_PAGE_ACCESS_TOKEN: "page_token" }),
      db
    );

    const post = await service.publishDraft(draft.id);

    expect(post).toMatchObject({ status: "PUBLISHED", facebookPostId: "photo_post_1" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://graph.facebook.com/v20.0/page_1/photos");
    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("url")).toBe("https://cdn.example.com/image.png");
    expect(body.get("caption")).toBe("Draft text");
  });

  it("records a failed published-post attempt when Meta publishing fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ error: { message: "Meta rejected post" } }, { status: 400 }));
    const db = new FakeDatabase();
    const { draft } = seedDraft(db, { approved: true });
    const service = new PublisherAgentService(
      new ConfigService({ PUBLISH_DRY_RUN: "false", META_PAGE_ACCESS_TOKEN: "page_token" }),
      db
    );

    const post = await service.publishDraft(draft.id);

    expect(post).toMatchObject({ status: "FAILED", errorMessage: "Meta rejected post" });
    expect(db.getDraft(draft.id)).toMatchObject({ status: "APPROVED", approvalStatus: "APPROVED" });
  });

  it("records image publishing configuration failures without marking the draft as published", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const db = new FakeDatabase();
    const { draft } = seedDraft(db, { approved: true, imagePublicUrl: "" });
    const service = new PublisherAgentService(
      new ConfigService({ PUBLISH_DRY_RUN: "false", META_PAGE_ACCESS_TOKEN: "page_token" }),
      db
    );

    const post = await service.publishDraft(draft.id);

    expect(post).toMatchObject({ status: "FAILED", errorMessage: "Image draft requires R2_PUBLIC_BASE_URL" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.getDraft(draft.id)).toMatchObject({ status: "APPROVED", approvalStatus: "APPROVED" });
  });
});
