import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseDatabase } from "../src/persistence/supabase.database.js";
import { buildCampaignInput } from "./helpers.js";

const campaignRow = {
  id: "camp_1",
  name: "Launch campaign",
  topic: "AI operations",
  language: "vi",
  brand_voice: "helpful, concise, practical",
  target_page_id: "page_1",
  llm_provider: "mock",
  llm_model: "mock-copywriter-v1",
  status: "ACTIVE",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z"
};

const contentRow = {
  id: "content_1",
  campaign_id: "camp_1",
  source_id: "src_1",
  source_url: "https://example.com/story",
  title: "Story",
  raw_text: "Text",
  summary: "Summary",
  image_urls: ["https://example.com/image.png"],
  hash: "hash_1",
  created_at: "2026-05-01T00:00:00.000Z"
};

const fanpageRow = {
  id: "fanpage_1",
  campaign_id: "camp_1",
  name: "Launch fanpage",
  facebook_page_id: "page_1",
  environment: "sandbox",
  topic: "AI operations",
  language: "vi",
  brand_voice: "helpful, concise, practical",
  llm_provider: "mock",
  llm_model: "mock-copywriter-v1",
  schedule_enabled: true,
  schedule_posts_per_day: 2,
  schedule_interval_minutes: 240,
  schedule_start_time_local: "09:00",
  schedule_timezone: "Asia/Saigon",
  encrypted_page_access_token: "encrypted-token",
  page_access_token_mask: "****1234",
  status: "ACTIVE",
  last_scheduled_at: null,
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z"
};

function db() {
  return new SupabaseDatabase(
    new ConfigService({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_test"
    })
  );
}

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(payload), { ...init, headers });
}

describe("SupabaseDatabase", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("maps campaign writes to Supabase REST with server-side headers", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse([campaignRow], { status: 201 }));

    const campaign = await db().createCampaign(buildCampaignInput());

    expect(campaign).toMatchObject({
      id: "camp_1",
      brandVoice: "helpful, concise, practical",
      targetPageId: "page_1",
      llmProvider: "mock"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/campaigns?select=*",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "sb_secret_test",
          Authorization: "Bearer sb_secret_test",
          "Content-Profile": "public",
          Prefer: "return=representation"
        }),
        body: expect.stringContaining("\"brand_voice\":\"helpful, concise, practical\"")
      })
    );
  });

  it("uses custom schemas and service-role fallback keys for Supabase REST calls", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse([campaignRow]));
    const database = new SupabaseDatabase(
      new ConfigService({
        SUPABASE_URL: "https://project.supabase.co/",
        SUPABASE_SERVICE_ROLE_KEY: "legacy_service_role",
        SUPABASE_SCHEMA: "app"
      })
    );

    await expect(database.listCampaigns()).resolves.toHaveLength(1);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/campaigns?select=*&order=created_at.desc",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "legacy_service_role",
          Authorization: "Bearer legacy_service_role",
          "Accept-Profile": "app",
          "Content-Profile": "app"
        })
      })
    );
  });

  it("patches only supplied campaign fields during updates", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([{ ...campaignRow, brand_voice: "direct", status: "PAUSED" }]))
      .mockResolvedValueOnce(jsonResponse([]));

    const campaign = await db().updateCampaign("camp_1", { brandVoice: "direct", status: "PAUSED" });

    expect(campaign).toMatchObject({ brandVoice: "direct", status: "PAUSED" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/campaigns?select=*&id=eq.camp_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          updated_at: "2026-05-01T00:00:00.000Z",
          brand_voice: "direct",
          status: "PAUSED"
        })
      })
    );
  });

  it("creates and maps fanpages with redacted token metadata", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([campaignRow], { status: 201 }))
      .mockResolvedValueOnce(jsonResponse([fanpageRow], { status: 201 }));

    const fanpage = await db().createFanpage({
      name: "Launch fanpage",
      facebookPageId: "page_1",
      environment: "sandbox",
      topic: "AI operations",
      language: "vi",
      brandVoice: "helpful, concise, practical",
      llmProvider: "mock",
      llmModel: "mock-copywriter-v1",
      scheduleConfig: {
        enabled: true,
        postsPerDay: 2,
        intervalMinutes: 240,
        startTimeLocal: "09:00",
        timezone: "Asia/Saigon"
      },
      encryptedPageAccessToken: "encrypted-token",
      pageAccessTokenMask: "****1234"
    });

    expect(fanpage).toMatchObject({
      id: "fanpage_1",
      campaignId: "camp_1",
      environment: "sandbox",
      scheduleConfig: { enabled: true, postsPerDay: 2 },
      hasPageAccessToken: true,
      pageAccessTokenMask: "****1234"
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://project.supabase.co/rest/v1/facebook_pages?select=*");
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"encrypted_page_access_token\":\"encrypted-token\"")
      })
    );
  });

  it("throws NotFoundException when a selected row is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse([]));

    await expect(db().getCampaign("missing")).rejects.toThrow(NotFoundException);
  });

  it("throws NotFoundException when an update returns no rows", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse([]));

    await expect(db().updateCampaign("missing", { status: "PAUSED" })).rejects.toThrow(NotFoundException);
  });

  it("hydrates joined draft rows with content and image assets", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "draft_1",
            campaign_id: "camp_1",
            content_item_id: "content_1",
            image_asset_id: "image_1",
            text: "Draft",
            status: "PENDING_APPROVAL",
            risk_score: 25,
            risk_flags: ["flag"],
            approval_status: "PENDING",
            created_at: "2026-05-01T00:00:00.000Z",
            updated_at: "2026-05-01T00:00:00.000Z",
            content_items: contentRow,
            image_assets: {
              id: "image_1",
              campaign_id: "camp_1",
              source_url: "https://example.com/image.png",
              r2_key: "campaigns/camp_1/image.png",
              public_url: "https://cdn.example.com/image.png",
              mime_type: "image/png",
              created_at: "2026-05-01T00:00:00.000Z"
            }
          }
        ])
      )
      .mockResolvedValueOnce(jsonResponse([fanpageRow]));

    const drafts = await db().listDrafts("PENDING_APPROVAL");

    expect(drafts).toEqual([
      expect.objectContaining({
        id: "draft_1",
        contentItem: expect.objectContaining({ id: "content_1", rawText: "Text" }),
        imageAsset: expect.objectContaining({ id: "image_1", publicUrl: "https://cdn.example.com/image.png" }),
        fanpage: expect.objectContaining({ id: "fanpage_1", environment: "sandbox" })
      })
    ]);
  });

  it("rejects Supabase JSON list fields that do not match shared DTO arrays", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse([{ ...contentRow, image_urls: ["ok", 42] }]));

    await expect(db().listContentItems("camp_1")).rejects.toThrow("Supabase content_items.image_urls must be a string array");
  });

  it("returns the existing content item when Supabase reports a unique hash conflict", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ code: "23505", message: "duplicate key value violates unique constraint" }, { status: 409 }))
      .mockResolvedValueOnce(jsonResponse([contentRow]));

    const result = await db().createContentItem({
      campaignId: "camp_1",
      sourceId: "src_1",
      sourceUrl: "https://example.com/story",
      title: "Story",
      rawText: "Text",
      summary: "Summary",
      imageUrls: [],
      hash: "hash_1"
    });

    expect(result).toMatchObject({ duplicate: true, item: { id: "content_1" } });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://project.supabase.co/rest/v1/content_items?select=*&campaign_id=eq.camp_1&hash=eq.hash_1&limit=1"
    );
  });

  it("rethrows a unique hash conflict when the existing row cannot be loaded", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ code: "23505", message: "duplicate key value violates unique constraint" }, { status: 409 }))
      .mockResolvedValueOnce(jsonResponse([]));

    await expect(
      db().createContentItem({
        campaignId: "camp_1",
        sourceId: "src_1",
        sourceUrl: "https://example.com/story",
        title: "Story",
        rawText: "Text",
        summary: "Summary",
        imageUrls: [],
        hash: "hash_1"
      })
    ).rejects.toThrow("duplicate key value violates unique constraint");
  });

  it("maps published posts and agent runs from snake_case rows", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "post_1",
            post_draft_id: "draft_1",
            facebook_page_id: "page_1",
            facebook_post_id: null,
            status: "FAILED",
            publish_payload: { draftId: "draft_1" },
            error_message: "Meta rejected post",
            published_at: null,
            created_at: "2026-05-01T00:00:00.000Z"
          }
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "draft_1",
            campaign_id: "camp_1",
            content_item_id: "content_1",
            image_asset_id: null,
            text: "Draft",
            status: "PUBLISHED",
            risk_score: 0,
            risk_flags: [],
            approval_status: "APPROVED",
            created_at: "2026-05-01T00:00:00.000Z",
            updated_at: "2026-05-01T00:00:00.000Z",
            content_items: contentRow,
            image_assets: null
          }
        ])
      )
      .mockResolvedValueOnce(jsonResponse([fanpageRow]))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "run_1",
            campaign_id: "camp_1",
            graph_run_id: "graph_1",
            node_name: "qa_check",
            input_json: { node: "qa_check" },
            output_json: { riskScore: 25 },
            status: "FAILED",
            error_message: "QA unavailable",
            started_at: "2026-05-01T00:00:01.000Z",
            completed_at: "2026-05-01T00:00:05.000Z",
            created_at: "2026-05-01T00:00:00.000Z"
          }
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "workflow_1",
            campaign_id: "camp_1",
            graph_run_id: "graph_1",
            status: "FAILED",
            current_node_name: "qa_check",
            triggered_by_user_id: "user_1",
            triggered_by_email: "admin@example.com",
            created_at: "2026-05-01T00:00:00.000Z",
            started_at: "2026-05-01T00:00:01.000Z",
            finished_at: "2026-05-01T00:00:05.000Z"
          }
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "run_1",
            campaign_id: "camp_1",
            graph_run_id: "graph_1",
            node_name: "qa_check",
            input_json: { node: "qa_check" },
            output_json: { riskScore: 25 },
            status: "FAILED",
            error_message: "QA unavailable",
            started_at: "2026-05-01T00:00:01.000Z",
            completed_at: "2026-05-01T00:00:05.000Z",
            created_at: "2026-05-01T00:00:00.000Z"
          }
        ])
      );

    await expect(db().listPublishedPosts()).resolves.toEqual([
      {
        id: "post_1",
        postDraftId: "draft_1",
        facebookPageId: "page_1",
        status: "FAILED",
        publishPayload: { draftId: "draft_1" },
        errorMessage: "Meta rejected post",
        fanpage: {
          id: "fanpage_1",
          campaignId: "camp_1",
          name: "Launch fanpage",
          facebookPageId: "page_1",
          environment: "sandbox",
          status: "ACTIVE"
        },
        createdAt: "2026-05-01T00:00:00.000Z"
      }
    ]);
    await expect(db().listAgentRuns("camp_1")).resolves.toEqual([
      {
        id: "run_1",
        campaignId: "camp_1",
        graphRunId: "graph_1",
        nodeName: "qa_check",
        inputJson: { node: "qa_check" },
        outputJson: { riskScore: 25 },
        status: "FAILED",
        errorMessage: "QA unavailable",
        startedAt: "2026-05-01T00:00:01.000Z",
        completedAt: "2026-05-01T00:00:05.000Z",
        createdAt: "2026-05-01T00:00:00.000Z"
      }
    ]);
    await expect(db().listAgentWorkflowRuns({ campaignId: "camp_1", status: "FAILED", limit: 10 })).resolves.toEqual([
      {
        id: "workflow_1",
        campaignId: "camp_1",
        graphRunId: "graph_1",
        status: "FAILED",
        currentNodeName: "qa_check",
        triggeredByUserId: "user_1",
        triggeredByEmail: "admin@example.com",
        createdAt: "2026-05-01T00:00:00.000Z",
        startedAt: "2026-05-01T00:00:01.000Z",
        finishedAt: "2026-05-01T00:00:05.000Z",
        steps: [
          {
            id: "run_1",
            campaignId: "camp_1",
            graphRunId: "graph_1",
            nodeName: "qa_check",
            inputJson: { node: "qa_check" },
            outputJson: { riskScore: 25 },
            status: "FAILED",
            errorMessage: "QA unavailable",
            startedAt: "2026-05-01T00:00:01.000Z",
            completedAt: "2026-05-01T00:00:05.000Z",
            createdAt: "2026-05-01T00:00:00.000Z"
          }
        ]
      }
    ]);
  });

  it("wraps fetch failures with a Supabase request error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));

    await expect(db().listCampaigns()).rejects.toThrow("Supabase request failed: network down");
  });
});
