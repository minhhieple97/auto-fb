import { describe, expect, expectTypeOf, it } from "vitest";
import {
  adminProfileSchema,
  adminPermissions,
  agentSearchInputSchema,
  agentSearchResponseSchema,
  createCampaignSchema,
  createFanpageSchema,
  createSourceSchema,
  fanpageSchema,
  generateFromSearchInputSchema,
  agentRunSchema,
  agentWorkflowRunDetailSchema,
  llmModels,
  postDraftSchema,
  publishOptionsSchema,
  permissionsForRole,
  roleHasPermission,
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

  it("defines fanpage creation, schedule, and token redaction contracts", () => {
    expect(
      createFanpageSchema.parse({
        name: "Sandbox page",
        facebookPageId: "page_1",
        topic: "AI operations"
      })
    ).toEqual({
      name: "Sandbox page",
      facebookPageId: "page_1",
      environment: "sandbox",
      topic: "AI operations",
      language: "vi",
      brandVoice: "helpful, concise, practical",
      llmProvider: "openai",
      llmModel: "gpt-4o-mini",
      scheduleConfig: {
        enabled: false,
        postsPerDay: 1,
        intervalMinutes: 1440,
        startTimeLocal: "09:00",
        timezone: "Asia/Saigon"
      }
    });
    expect(() =>
      createFanpageSchema.parse({
        name: "Sandbox page",
        facebookPageId: "page_1",
        environment: "staging",
        topic: "AI operations"
      })
    ).toThrow();
    expect(() =>
      createFanpageSchema.parse({
        name: "Sandbox page",
        facebookPageId: "page_1",
        topic: "AI operations",
        scheduleConfig: { enabled: true, postsPerDay: 25 }
      })
    ).toThrow();
    expect(
      fanpageSchema.parse({
        id: "fanpage_1",
        campaignId: "camp_1",
        name: "Sandbox page",
        facebookPageId: "page_1",
        environment: "sandbox",
        topic: "AI operations",
        language: "vi",
        brandVoice: "helpful",
        llmProvider: "mock",
        llmModel: "mock-copywriter-v1",
        scheduleConfig: {
          enabled: true,
          postsPerDay: 2,
          intervalMinutes: 240,
          startTimeLocal: "09:00",
          timezone: "Asia/Saigon"
        },
        hasPageAccessToken: true,
        pageAccessTokenMask: "****1234",
        status: "ACTIVE",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z"
      })
    ).toMatchObject({ hasPageAccessToken: true, pageAccessTokenMask: "****1234" });
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

  it("accepts running agent step and workflow run tracking states", () => {
    expect(
      agentRunSchema.parse({
        id: "run_1",
        campaignId: "camp_1",
        graphRunId: "graph_1",
        nodeName: "load_campaign",
        inputJson: {},
        outputJson: {},
        status: "RUNNING",
        startedAt: "2026-05-01T00:00:01.000Z",
        createdAt: "2026-05-01T00:00:00.000Z"
      })
    ).toMatchObject({ status: "RUNNING" });

    expect(
      agentWorkflowRunDetailSchema.parse({
        id: "workflow_1",
        campaignId: "camp_1",
        graphRunId: "graph_1",
        status: "QUEUED",
        currentNodeName: "load_campaign",
        triggeredByUserId: "user_1",
        triggeredByEmail: "admin@example.com",
        createdAt: "2026-05-01T00:00:00.000Z",
        steps: []
      })
    ).toMatchObject({ status: "QUEUED", steps: [] });
  });

  it("defines search agent contracts with Gemini defaults and selectable results", () => {
    const searchInput = agentSearchInputSchema.parse({ query: "latest AI automation", limit: 20 });
    expect(searchInput).toEqual({
      query: "latest AI automation",
      limit: 20,
      provider: "gemini",
      model: llmModels.gemini.flash3Preview
    });
    expect(() => agentSearchInputSchema.parse({ query: "x", limit: 21 })).toThrow();

    const result = {
      id: "result-1",
      title: "AI automation update",
      url: "https://example.com/story",
      snippet: "Useful source context.",
      sourceName: "example.com"
    };
    expect(
      agentSearchResponseSchema.parse({
        query: "latest AI automation",
        provider: "gemini",
        model: llmModels.gemini.flash3Preview,
        searchQueries: ["latest AI automation"],
        results: [result]
      })
    ).toMatchObject({ results: [result] });
    expect(generateFromSearchInputSchema.parse({ selectedResults: [result] })).toMatchObject({
      provider: "gemini",
      model: llmModels.gemini.flash3Preview,
      selectedResults: [result]
    });
  });

  it("defines admin profiles and role permissions centrally", () => {
    expect(permissionsForRole("viewer")).toEqual([adminPermissions.readDashboardData]);
    expect(roleHasPermission("editor", adminPermissions.runWorkflow)).toBe(true);
    expect(roleHasPermission("viewer", adminPermissions.runWorkflow)).toBe(false);
    expect(
      adminProfileSchema.parse({
        authUserId: "user_1",
        email: "admin@example.com",
        role: "owner",
        status: "active",
        permissions: permissionsForRole("owner")
      })
    ).toMatchObject({ role: "owner" });
  });

  it("exports generated Supabase database helper types", () => {
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("campaigns");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("facebook_pages");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("admin_users");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("agent_workflow_runs");
    expectTypeOf<Tables<"admin_users">["role"]>().toEqualTypeOf<"owner" | "editor" | "viewer">();
    expectTypeOf<Tables<"campaigns">["brand_voice"]>().toEqualTypeOf<string>();
    expectTypeOf<TablesInsert<"campaigns">>().toMatchTypeOf<{
      name: string;
      topic: string;
      target_page_id: string;
    }>();
    expectTypeOf<TablesInsert<"facebook_pages">>().toMatchTypeOf<{
      campaign_id: string;
      facebook_page_id: string;
      environment?: string;
    }>();
    expectTypeOf<TablesUpdate<"post_drafts">>().toMatchTypeOf<{
      approval_status?: string;
      risk_flags?: Json;
    }>();
  });
});
