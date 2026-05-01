import type {
  AgentRun,
  AgentWorkflowRunDetail,
  Campaign,
  ContentItem,
  CreateCampaignInput,
  CreateFanpageInput,
  CreateSourceInput,
  Fanpage,
  ImageAsset,
  PostDraft,
  PublishedPost,
  Source
} from "@auto-fb/shared";
import type { UnderstoodContent } from "../src/agents/agent.types.js";
import type { RawContentItem } from "../src/collector/content-source.types.js";

export const fixedIso = "2026-05-01T00:00:00.000Z";

export function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  return new Response(JSON.stringify(payload), { ...init, headers });
}

export function textResponse(payload: string, contentType = "text/html", init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", contentType);
  return new Response(payload, { ...init, headers });
}

export function binaryResponse(payload = "image-bytes", contentType = "image/png", init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", contentType);
  return new Response(Buffer.from(payload), { ...init, headers });
}

export function buildCampaignInput(overrides: Partial<CreateCampaignInput> = {}): CreateCampaignInput {
  return {
    name: "Launch campaign",
    topic: "AI operations",
    language: "vi",
    brandVoice: "helpful, concise, practical",
    targetPageId: "page_1",
    llmProvider: "mock",
    llmModel: "mock-copywriter-v1",
    ...overrides
  };
}

export function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "camp_1",
    ...buildCampaignInput(),
    status: "ACTIVE",
    createdAt: fixedIso,
    updatedAt: fixedIso,
    ...overrides
  };
}

export function buildFanpageInput(overrides: Partial<CreateFanpageInput> = {}): CreateFanpageInput {
  return {
    name: "Launch fanpage",
    facebookPageId: "page_1",
    environment: "sandbox",
    topic: "AI operations",
    language: "vi",
    brandVoice: "helpful, concise, practical",
    llmProvider: "mock",
    llmModel: "mock-copywriter-v1",
    scheduleConfig: {
      enabled: false,
      postsPerDay: 1,
      intervalMinutes: 1440,
      startTimeLocal: "09:00",
      timezone: "Asia/Saigon"
    },
    ...overrides
  };
}

export function buildFanpage(overrides: Partial<Fanpage> = {}): Fanpage {
  return {
    id: "fanpage_1",
    campaignId: "camp_1",
    name: "Launch fanpage",
    facebookPageId: "page_1",
    environment: "sandbox",
    topic: "AI operations",
    language: "vi",
    brandVoice: "helpful, concise, practical",
    llmProvider: "mock",
    llmModel: "mock-copywriter-v1",
    scheduleConfig: {
      enabled: false,
      postsPerDay: 1,
      intervalMinutes: 1440,
      startTimeLocal: "09:00",
      timezone: "Asia/Saigon"
    },
    hasPageAccessToken: true,
    pageAccessTokenMask: "****1234",
    status: "ACTIVE",
    createdAt: fixedIso,
    updatedAt: fixedIso,
    ...overrides
  };
}

export function buildSourceInput(overrides: Partial<CreateSourceInput> = {}): CreateSourceInput {
  return {
    type: "api",
    url: "https://example.com/api",
    crawlPolicy: "whitelist_only",
    enabled: true,
    ...overrides
  };
}

export function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "src_1",
    campaignId: "camp_1",
    ...buildSourceInput(),
    createdAt: fixedIso,
    ...overrides
  };
}

export function buildRawItem(overrides: Partial<RawContentItem> = {}): RawContentItem {
  return {
    sourceId: "src_1",
    sourceUrl: "https://example.com/story",
    title: "Useful story",
    text: "First useful fact. Second useful fact.",
    images: [],
    crawlTimestamp: fixedIso,
    ...overrides
  };
}

export function buildContentItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: "content_1",
    campaignId: "camp_1",
    sourceId: "src_1",
    sourceUrl: "https://example.com/story",
    title: "Useful story",
    rawText: "First useful fact. Second useful fact.",
    summary: "First useful fact. Second useful fact.",
    imageUrls: [],
    hash: "hash_1",
    createdAt: fixedIso,
    ...overrides
  };
}

export function buildImageAsset(overrides: Partial<ImageAsset> = {}): ImageAsset {
  return {
    id: "image_1",
    campaignId: "camp_1",
    sourceUrl: "https://example.com/image.png",
    r2Key: "campaigns/camp_1/image.png",
    publicUrl: "https://cdn.example.com/campaigns/camp_1/image.png",
    mimeType: "image/png",
    createdAt: fixedIso,
    ...overrides
  };
}

export function buildUnderstood(overrides: Partial<UnderstoodContent> = {}): UnderstoodContent {
  const item = overrides.item ?? buildContentItem();
  return {
    item,
    duplicate: false,
    summary: item.summary,
    keyFacts: ["First useful fact.", "Second useful fact."],
    ...overrides
  };
}

export function buildPostDraft(overrides: Partial<PostDraft> = {}): PostDraft {
  return {
    id: "draft_1",
    campaignId: "camp_1",
    contentItemId: "content_1",
    text: "Draft text\n\nNguon: https://example.com/story",
    status: "PENDING_APPROVAL",
    riskScore: 0,
    riskFlags: [],
    approvalStatus: "PENDING",
    createdAt: fixedIso,
    updatedAt: fixedIso,
    ...overrides
  };
}

export function buildPublishedPost(overrides: Partial<PublishedPost> = {}): PublishedPost {
  return {
    id: "post_1",
    postDraftId: "draft_1",
    facebookPageId: "page_1",
    facebookPostId: "fb_post_1",
    status: "PUBLISHED",
    publishPayload: {},
    publishedAt: fixedIso,
    createdAt: fixedIso,
    ...overrides
  };
}

export function buildAgentRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    id: "run_1",
    campaignId: "camp_1",
    graphRunId: "graph_1",
    nodeName: "load_campaign",
    inputJson: {},
    outputJson: {},
    status: "SUCCESS",
    createdAt: fixedIso,
    ...overrides
  };
}

export function buildAgentWorkflowRun(overrides: Partial<AgentWorkflowRunDetail> = {}): AgentWorkflowRunDetail {
  return {
    id: "workflow_1",
    campaignId: "camp_1",
    graphRunId: "graph_1",
    status: "QUEUED",
    triggeredByUserId: "user_1",
    triggeredByEmail: "admin@example.com",
    createdAt: fixedIso,
    steps: [],
    ...overrides
  };
}
