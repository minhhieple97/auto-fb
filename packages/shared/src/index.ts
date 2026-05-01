import { z } from "zod";

export type { CompositeTypes, Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from "./database.types.js";

export const campaignStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]);
export const sourceTypeSchema = z.enum(["rss", "api", "static_html"]);
export const llmProviderSchema = z.enum(["openai", "anthropic", "gemini", "deepseek", "mock"]);
export const draftStatusSchema = z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED", "PUBLISHED"]);
export const approvalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const publishStatusSchema = z.enum(["DRY_RUN_PUBLISHED", "PUBLISHED", "FAILED"]);
export const agentRunStatusSchema = z.enum(["SUCCESS", "FAILED"]);

export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type LlmProvider = z.infer<typeof llmProviderSchema>;
export type DraftStatus = z.infer<typeof draftStatusSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type PublishStatus = z.infer<typeof publishStatusSchema>;
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  topic: z.string(),
  language: z.string(),
  brandVoice: z.string(),
  targetPageId: z.string(),
  llmProvider: llmProviderSchema,
  llmModel: z.string(),
  status: campaignStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createCampaignSchema = z.object({
  name: z.string().min(2),
  topic: z.string().min(2),
  language: z.string().min(2).default("vi"),
  brandVoice: z.string().min(2).default("helpful, concise, practical"),
  targetPageId: z.string().min(1),
  llmProvider: llmProviderSchema.default("openai"),
  llmModel: z.string().min(1).default("gpt-4o-mini")
});

export const updateCampaignSchema = createCampaignSchema
  .partial()
  .extend({ status: campaignStatusSchema.optional() });

export const sourceSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  type: sourceTypeSchema,
  url: z.string().url(),
  crawlPolicy: z.string(),
  enabled: z.boolean(),
  createdAt: z.string()
});

export const createSourceSchema = z.object({
  type: sourceTypeSchema,
  url: z.string().url(),
  crawlPolicy: z.string().default("whitelist_only"),
  enabled: z.boolean().default(true)
});

export const imageAssetSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  sourceUrl: z.string().url().optional(),
  r2Key: z.string(),
  publicUrl: z.string().url().optional(),
  mimeType: z.string(),
  createdAt: z.string()
});

export const contentItemSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  sourceId: z.string(),
  sourceUrl: z.string().url(),
  title: z.string(),
  rawText: z.string(),
  summary: z.string(),
  imageUrls: z.array(z.string().url()),
  hash: z.string(),
  createdAt: z.string()
});

export const postDraftSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  contentItemId: z.string(),
  imageAssetId: z.string().optional(),
  text: z.string(),
  status: draftStatusSchema,
  riskScore: z.number().int().min(0).max(100),
  riskFlags: z.array(z.string()),
  approvalStatus: approvalStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  contentItem: contentItemSchema.optional(),
  imageAsset: imageAssetSchema.optional()
});

export const agentRunSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  graphRunId: z.string(),
  nodeName: z.string(),
  inputJson: z.unknown(),
  outputJson: z.unknown(),
  status: agentRunStatusSchema,
  errorMessage: z.string().optional(),
  createdAt: z.string()
});

export const publishedPostSchema = z.object({
  id: z.string(),
  postDraftId: z.string(),
  facebookPageId: z.string(),
  facebookPostId: z.string().optional(),
  status: publishStatusSchema,
  publishPayload: z.unknown(),
  errorMessage: z.string().optional(),
  publishedAt: z.string().optional(),
  createdAt: z.string()
});

export const publishOptionsSchema = z.object({
  dryRun: z.boolean().optional()
});

export type Campaign = z.infer<typeof campaignSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type ContentItem = z.infer<typeof contentItemSchema>;
export type PostDraft = z.infer<typeof postDraftSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
export type PublishedPost = z.infer<typeof publishedPostSchema>;
export type PublishOptions = z.infer<typeof publishOptionsSchema>;

export type ApiError = {
  message: string;
  details?: unknown;
};

export type AgentTimeline = {
  graphRunId: string;
  runs: AgentRun[];
};
