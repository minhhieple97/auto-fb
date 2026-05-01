import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createCampaignSchema,
  createSourceSchema,
  postDraftSchema,
  publishOptionsSchema,
  updateCampaignSchema
} from "./index.js";
import type { Database, Json, Tables, TablesInsert, TablesUpdate } from "./index.js";

describe("shared API contracts", () => {
  it("applies campaign creation defaults at the shared contract boundary", () => {
    expect(
      createCampaignSchema.parse({
        name: "Launch",
        topic: "AI operations",
        targetPageId: "page_1"
      })
    ).toEqual({
      name: "Launch",
      topic: "AI operations",
      language: "vi",
      brandVoice: "helpful, concise, practical",
      targetPageId: "page_1",
      llmProvider: "openai",
      llmModel: "gpt-4o-mini"
    });
  });

  it("allows partial campaign updates but rejects unknown statuses and providers", () => {
    expect(updateCampaignSchema.parse({ status: "PAUSED" })).toEqual({ status: "PAUSED" });
    expect(() => updateCampaignSchema.parse({ status: "DELETED" })).toThrow();
    expect(() => createCampaignSchema.parse({ name: "Launch", topic: "AI", targetPageId: "page_1", llmProvider: "x" })).toThrow();
  });

  it("keeps source creation limited to whitelisted source types and URL inputs", () => {
    expect(createSourceSchema.parse({ type: "rss", url: "https://example.com/feed.xml" })).toEqual({
      type: "rss",
      url: "https://example.com/feed.xml",
      crawlPolicy: "whitelist_only",
      enabled: true
    });
    expect(() => createSourceSchema.parse({ type: "browser", url: "https://facebook.com" })).toThrow();
    expect(() => createSourceSchema.parse({ type: "api", url: "not-a-url" })).toThrow();
  });

  it("guards draft risk score bounds and publish options shape", () => {
    const baseDraft = {
      id: "draft_1",
      campaignId: "camp_1",
      contentItemId: "content_1",
      text: "Draft text",
      status: "PENDING_APPROVAL",
      riskFlags: [],
      approvalStatus: "PENDING",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    };

    expect(postDraftSchema.parse({ ...baseDraft, riskScore: 100 })).toMatchObject({ riskScore: 100 });
    expect(() => postDraftSchema.parse({ ...baseDraft, riskScore: 101 })).toThrow();
    expect(publishOptionsSchema.parse({ dryRun: false })).toEqual({ dryRun: false });
  });

  it("exports generated Supabase database helper types", () => {
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("campaigns");
    expectTypeOf<Tables<"campaigns">["brand_voice"]>().toEqualTypeOf<string>();
    expectTypeOf<TablesInsert<"campaigns">>().toMatchTypeOf<{
      name: string;
      topic: string;
      target_page_id: string;
    }>();
    expectTypeOf<TablesUpdate<"post_drafts">>().toMatchTypeOf<{
      approval_status?: string;
      risk_flags?: Json;
    }>();
  });
});
