import { z } from "zod";

export type { CompositeTypes, Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from "./database.types.js";

export const campaignStatuses = {
  active: "ACTIVE",
  paused: "PAUSED",
  archived: "ARCHIVED"
} as const;
export const campaignStatusValues = [campaignStatuses.active, campaignStatuses.paused, campaignStatuses.archived] as const;

export const sourceTypes = {
  rss: "rss",
  api: "api",
  staticHtml: "static_html"
} as const;
export const sourceTypeValues = [sourceTypes.rss, sourceTypes.api, sourceTypes.staticHtml] as const;

export const llmProviders = {
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  deepseek: "deepseek",
  mock: "mock"
} as const;
export const llmProviderValues = [llmProviders.openai, llmProviders.anthropic, llmProviders.gemini, llmProviders.deepseek, llmProviders.mock] as const;

export const draftStatuses = {
  pendingApproval: "PENDING_APPROVAL",
  approved: "APPROVED",
  rejected: "REJECTED",
  published: "PUBLISHED"
} as const;
export const draftStatusValues = [draftStatuses.pendingApproval, draftStatuses.approved, draftStatuses.rejected, draftStatuses.published] as const;

export const approvalStatuses = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED"
} as const;
export const approvalStatusValues = [approvalStatuses.pending, approvalStatuses.approved, approvalStatuses.rejected] as const;

export const publishStatuses = {
  dryRunPublished: "DRY_RUN_PUBLISHED",
  published: "PUBLISHED",
  failed: "FAILED"
} as const;
export const publishStatusValues = [publishStatuses.dryRunPublished, publishStatuses.published, publishStatuses.failed] as const;

export const agentRunStatuses = {
  running: "RUNNING",
  success: "SUCCESS",
  failed: "FAILED"
} as const;
export const agentRunStatusValues = [agentRunStatuses.running, agentRunStatuses.success, agentRunStatuses.failed] as const;

export const agentWorkflowRunStatuses = {
  queued: "QUEUED",
  running: "RUNNING",
  success: "SUCCESS",
  failed: "FAILED"
} as const;
export const agentWorkflowRunStatusValues = [
  agentWorkflowRunStatuses.queued,
  agentWorkflowRunStatuses.running,
  agentWorkflowRunStatuses.success,
  agentWorkflowRunStatuses.failed
] as const;

export const agentWorkflowNodes = {
  loadCampaign: "load_campaign",
  discoverSources: "discover_sources",
  collectContent: "collect_content",
  understandContent: "understand_content",
  generatePost: "generate_post",
  prepareImage: "prepare_image",
  qaCheck: "qa_check",
  savePendingApproval: "save_pending_approval"
} as const;
export const agentWorkflowNodeNames = [
  agentWorkflowNodes.loadCampaign,
  agentWorkflowNodes.discoverSources,
  agentWorkflowNodes.collectContent,
  agentWorkflowNodes.understandContent,
  agentWorkflowNodes.generatePost,
  agentWorkflowNodes.prepareImage,
  agentWorkflowNodes.qaCheck,
  agentWorkflowNodes.savePendingApproval
] as const;

export const agentWorkflowRunEventTypes = {
  workflowRunUpdated: "workflow_run_updated"
} as const;

export const appRoles = {
  owner: "owner",
  editor: "editor",
  viewer: "viewer"
} as const;
export const appRoleValues = [appRoles.owner, appRoles.editor, appRoles.viewer] as const;

export const adminUserStatuses = {
  active: "active",
  disabled: "disabled"
} as const;
export const adminUserStatusValues = [adminUserStatuses.active, adminUserStatuses.disabled] as const;

export const adminPermissions = {
  readDashboardData: "read:dashboard_data",
  manageCampaigns: "manage:campaigns",
  manageSources: "manage:sources",
  runWorkflow: "run:workflow",
  reviewDrafts: "review:drafts",
  publishDrafts: "publish:drafts"
} as const;
export const adminPermissionValues = [
  adminPermissions.readDashboardData,
  adminPermissions.manageCampaigns,
  adminPermissions.manageSources,
  adminPermissions.runWorkflow,
  adminPermissions.reviewDrafts,
  adminPermissions.publishDrafts
] as const;

export const workflowRunListLimits = {
  default: 50,
  min: 1,
  max: 100
} as const;

export const postDraftRiskScoreLimits = {
  min: 0,
  max: 100
} as const;

export const campaignDefaults = {
  language: "vi",
  brandVoice: "helpful, concise, practical",
  llmProvider: llmProviders.openai,
  llmModel: "gpt-4o-mini"
} as const;

export const sourceDefaults = {
  type: sourceTypes.rss,
  crawlPolicy: "whitelist_only",
  enabled: true
} as const;

export const campaignStatusSchema = z.enum(campaignStatusValues);
export const sourceTypeSchema = z.enum(sourceTypeValues);
export const llmProviderSchema = z.enum(llmProviderValues);
export const draftStatusSchema = z.enum(draftStatusValues);
export const approvalStatusSchema = z.enum(approvalStatusValues);
export const publishStatusSchema = z.enum(publishStatusValues);
export const agentRunStatusSchema = z.enum(agentRunStatusValues);
export const agentWorkflowRunStatusSchema = z.enum(agentWorkflowRunStatusValues);
export const appRoleSchema = z.enum(appRoleValues);
export const adminUserStatusSchema = z.enum(adminUserStatusValues);
export const adminPermissionSchema = z.enum(adminPermissionValues);

export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type LlmProvider = z.infer<typeof llmProviderSchema>;
export type DraftStatus = z.infer<typeof draftStatusSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type PublishStatus = z.infer<typeof publishStatusSchema>;
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export type AgentWorkflowRunStatus = z.infer<typeof agentWorkflowRunStatusSchema>;
export type AgentWorkflowNodeName = (typeof agentWorkflowNodeNames)[number];
export type AppRole = z.infer<typeof appRoleSchema>;
export type AdminUserStatus = z.infer<typeof adminUserStatusSchema>;
export type AdminPermission = z.infer<typeof adminPermissionSchema>;

export const rolePermissions = {
  viewer: [adminPermissions.readDashboardData],
  editor: [
    adminPermissions.readDashboardData,
    adminPermissions.manageCampaigns,
    adminPermissions.manageSources,
    adminPermissions.runWorkflow,
    adminPermissions.reviewDrafts,
    adminPermissions.publishDrafts
  ],
  owner: [
    adminPermissions.readDashboardData,
    adminPermissions.manageCampaigns,
    adminPermissions.manageSources,
    adminPermissions.runWorkflow,
    adminPermissions.reviewDrafts,
    adminPermissions.publishDrafts
  ]
} as const satisfies Record<AppRole, readonly AdminPermission[]>;

export function permissionsForRole(role: AppRole): AdminPermission[] {
  return [...rolePermissions[role]];
}

export function roleHasPermission(role: AppRole, permission: AdminPermission): boolean {
  return permissionsForRole(role).includes(permission);
}

export const llmProviderModels = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
  anthropic: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  mock: ["mock-copywriter-v1"]
} as const satisfies Record<LlmProvider, readonly string[]>;

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
  language: z.string().min(2).default(campaignDefaults.language),
  brandVoice: z.string().min(2).default(campaignDefaults.brandVoice),
  targetPageId: z.string().min(1),
  llmProvider: llmProviderSchema.default(campaignDefaults.llmProvider),
  llmModel: z.string().min(1).default(campaignDefaults.llmModel)
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
  crawlPolicy: z.string().default(sourceDefaults.crawlPolicy),
  enabled: z.boolean().default(sourceDefaults.enabled)
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
  riskScore: z.number().int().min(postDraftRiskScoreLimits.min).max(postDraftRiskScoreLimits.max),
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
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string()
});

export const agentWorkflowRunSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  graphRunId: z.string(),
  status: agentWorkflowRunStatusSchema,
  currentNodeName: z.string().optional(),
  triggeredByUserId: z.string(),
  triggeredByEmail: z.string().optional(),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional()
});

export const agentWorkflowRunDetailSchema = agentWorkflowRunSchema.extend({
  steps: z.array(agentRunSchema)
});

export const adminProfileSchema = z.object({
  authUserId: z.string(),
  email: z.string().email(),
  role: appRoleSchema,
  status: adminUserStatusSchema,
  permissions: z.array(adminPermissionSchema)
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
export type AgentWorkflowRun = z.infer<typeof agentWorkflowRunSchema>;
export type AgentWorkflowRunDetail = z.infer<typeof agentWorkflowRunDetailSchema>;
export type AdminProfile = z.infer<typeof adminProfileSchema>;
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

export type AgentWorkflowRunEvent = {
  type: (typeof agentWorkflowRunEventTypes)[keyof typeof agentWorkflowRunEventTypes];
  run: AgentWorkflowRunDetail;
};

export type AgentRunFilters = {
  campaignId?: string;
  graphRunId?: string;
};

export type AgentWorkflowRunFilters = {
  campaignId?: string;
  status?: AgentWorkflowRunStatus;
  limit?: number;
};
