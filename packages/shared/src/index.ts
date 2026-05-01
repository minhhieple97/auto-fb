import { z } from "zod";

export type { CompositeTypes, Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from "./database.types.js";

export const campaignStatuses = {
  active: "ACTIVE",
  paused: "PAUSED",
  archived: "ARCHIVED"
} as const;
export const campaignStatusValues = [campaignStatuses.active, campaignStatuses.paused, campaignStatuses.archived] as const;

export const fanpageEnvironments = {
  sandbox: "sandbox",
  production: "production"
} as const;
export const fanpageEnvironmentValues = [fanpageEnvironments.sandbox, fanpageEnvironments.production] as const;

export const sourceTypes = {
  rss: "rss",
  api: "api",
  staticHtml: "static_html",
  curl: "curl",
  geminiSearch: "gemini_search"
} as const;
export const sourceTypeValues = [sourceTypes.rss, sourceTypes.api, sourceTypes.staticHtml, sourceTypes.curl, sourceTypes.geminiSearch] as const;

export const llmProviders = {
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  deepseek: "deepseek",
  mock: "mock"
} as const;
export const llmProviderValues = [llmProviders.openai, llmProviders.anthropic, llmProviders.gemini, llmProviders.deepseek, llmProviders.mock] as const;

export const llmModels = {
  openai: {
    gpt4oMini: "gpt-4o-mini",
    gpt41Mini: "gpt-4.1-mini",
    gpt41: "gpt-4.1"
  },
  anthropic: {
    haiku35: "claude-3-5-haiku-latest",
    sonnet35: "claude-3-5-sonnet-latest"
  },
  gemini: {
    flash3Preview: "gemini-3-flash-preview"
  },
  deepseek: {
    chat: "deepseek-chat",
    reasoner: "deepseek-reasoner"
  },
  mock: {
    copywriterV1: "mock-copywriter-v1"
  }
} as const;

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
  searchContent: "search_content",
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
  agentWorkflowNodes.searchContent,
  agentWorkflowNodes.generatePost,
  agentWorkflowNodes.prepareImage,
  agentWorkflowNodes.qaCheck,
  agentWorkflowNodes.savePendingApproval
] as const;

export const agentWorkflowRunEventTypes = {
  workflowRunUpdated: "workflow_run_updated"
} as const;

export const apiPathSegments = {
  agentRuns: "agent-runs",
  agentSearch: "agent-search",
  agentWorkflowRuns: "agent-workflow-runs",
  approve: "approve",
  auth: "auth",
  campaigns: "campaigns",
  curlSource: "curl-source",
  drafts: "drafts",
  fanpages: "fanpages",
  me: "me",
  publishedPosts: "published-posts",
  publish: "publish",
  reject: "reject",
  runs: "runs",
  schedule: "schedule",
  generate: "generate",
  search: "search",
  searchSources: "search-sources",
  searchSourcesAdd: "search-sources-add",
  sources: "sources",
  stream: "stream",
  testConnection: "test-connection",
  token: "token"
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

export const agentSearchResultLimits = {
  default: 10,
  min: 1,
  max: 20
} as const;

export const sourceSearchResultLimits = {
  default: 10,
  min: 1,
  max: 50
} as const;

export const postDraftRiskScoreLimits = {
  min: 0,
  max: 100
} as const;

export const campaignDefaults = {
  language: "vi",
  brandVoice: "helpful, concise, practical",
  llmProvider: llmProviders.openai,
  llmModel: llmModels.openai.gpt4oMini
} as const;

export const fanpageScheduleDefaults = {
  enabled: false,
  postsPerDay: 1,
  intervalMinutes: 1440,
  startTimeLocal: "09:00",
  timezone: "Asia/Saigon"
} as const;

export const fanpageScheduleLimits = {
  postsPerDayMin: 1,
  postsPerDayMax: 24,
  intervalMinutesMin: 5,
  intervalMinutesMax: 1440
} as const;

export const agentSearchDefaults = {
  provider: llmProviders.gemini,
  model: llmModels.gemini.flash3Preview,
  resultLimit: agentSearchResultLimits.default
} as const;

export const sourceDefaults = {
  type: sourceTypes.rss,
  crawlPolicy: "whitelist_only",
  enabled: true
} as const;

export const campaignStatusSchema = z.enum(campaignStatusValues);
export const fanpageEnvironmentSchema = z.enum(fanpageEnvironmentValues);
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
export type FanpageEnvironment = z.infer<typeof fanpageEnvironmentSchema>;
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
  openai: [llmModels.openai.gpt4oMini, llmModels.openai.gpt41Mini, llmModels.openai.gpt41],
  anthropic: [llmModels.anthropic.haiku35, llmModels.anthropic.sonnet35],
  gemini: [llmModels.gemini.flash3Preview],
  deepseek: [llmModels.deepseek.chat, llmModels.deepseek.reasoner],
  mock: [llmModels.mock.copywriterV1]
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

export const fanpageScheduleConfigSchema = z.object({
  enabled: z.boolean().default(fanpageScheduleDefaults.enabled),
  postsPerDay: z
    .number()
    .int()
    .min(fanpageScheduleLimits.postsPerDayMin)
    .max(fanpageScheduleLimits.postsPerDayMax)
    .default(fanpageScheduleDefaults.postsPerDay),
  intervalMinutes: z
    .number()
    .int()
    .min(fanpageScheduleLimits.intervalMinutesMin)
    .max(fanpageScheduleLimits.intervalMinutesMax)
    .default(fanpageScheduleDefaults.intervalMinutes),
  startTimeLocal: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default(fanpageScheduleDefaults.startTimeLocal),
  timezone: z.string().trim().min(1).default(fanpageScheduleDefaults.timezone)
});

export const fanpageSummarySchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string(),
  facebookPageId: z.string(),
  environment: fanpageEnvironmentSchema,
  status: campaignStatusSchema
});

export const fanpageSchema = fanpageSummarySchema.extend({
  topic: z.string(),
  language: z.string(),
  brandVoice: z.string(),
  llmProvider: llmProviderSchema,
  llmModel: z.string(),
  scheduleConfig: fanpageScheduleConfigSchema,
  hasPageAccessToken: z.boolean(),
  pageAccessTokenMask: z.string().optional(),
  lastScheduledAt: z.string().optional(),
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

export const createFanpageSchema = z.object({
  name: z.string().trim().min(2),
  facebookPageId: z.string().trim().min(1),
  environment: fanpageEnvironmentSchema.default(fanpageEnvironments.sandbox),
  topic: z.string().trim().min(2),
  language: z.string().trim().min(2).default(campaignDefaults.language),
  brandVoice: z.string().trim().min(2).default(campaignDefaults.brandVoice),
  llmProvider: llmProviderSchema.default(campaignDefaults.llmProvider),
  llmModel: z.string().trim().min(1).default(campaignDefaults.llmModel),
  scheduleConfig: fanpageScheduleConfigSchema.default(fanpageScheduleDefaults),
  pageAccessToken: z.string().trim().min(1).optional()
});

export const updateFanpageSchema = createFanpageSchema.partial().extend({
  status: campaignStatusSchema.optional(),
  scheduleConfig: fanpageScheduleConfigSchema.optional()
});

export const updateFanpageScheduleSchema = fanpageScheduleConfigSchema;

export const updateFanpageTokenSchema = z.object({
  pageAccessToken: z.string().trim().min(1)
});

export const testFanpageConnectionResponseSchema = z.object({
  ok: z.boolean(),
  facebookPageId: z.string(),
  environment: fanpageEnvironmentSchema,
  pageName: z.string().optional()
});

export const sourceSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  type: sourceTypeSchema,
  url: z.string(),
  crawlPolicy: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
  metadata: z.record(z.unknown()).optional()
});

export const createSourceSchema = z.object({
  type: sourceTypeSchema,
  url: z.string().url().optional().default(""),
  crawlPolicy: z.string().default(sourceDefaults.crawlPolicy),
  enabled: z.boolean().default(sourceDefaults.enabled),
  metadata: z.record(z.unknown()).optional()
});

export const createCurlSourceInputSchema = z.object({
  curlCommand: z.string().trim().min(5)
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
  imageAsset: imageAssetSchema.optional(),
  fanpage: fanpageSummarySchema.optional()
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
  createdAt: z.string(),
  fanpage: fanpageSummarySchema.optional()
});

export const publishOptionsSchema = z.object({
  dryRun: z.boolean().optional(),
  confirmProduction: z.boolean().optional()
});

export const agentSearchResultSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  snippet: z.string(),
  sourceName: z.string().optional()
});

export const sourceSearchInputSchema = z.object({
  query: z.string().trim().min(2),
  limit: z
    .number()
    .int()
    .min(sourceSearchResultLimits.min)
    .max(sourceSearchResultLimits.max)
    .default(sourceSearchResultLimits.default)
});

export const sourceSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(agentSearchResultSchema)
});

export const createSourcesFromSearchInputSchema = z.object({
  selectedResults: z.array(agentSearchResultSchema).min(1).max(sourceSearchResultLimits.max)
});

export const agentSearchInputSchema = z.object({
  query: z.string().trim().min(2),
  limit: z
    .number()
    .int()
    .min(agentSearchResultLimits.min)
    .max(agentSearchResultLimits.max)
    .default(agentSearchDefaults.resultLimit),
  provider: llmProviderSchema.default(agentSearchDefaults.provider),
  model: z.string().min(1).default(agentSearchDefaults.model)
});

export const agentSearchResponseSchema = z.object({
  query: z.string(),
  provider: llmProviderSchema,
  model: z.string(),
  searchQueries: z.array(z.string()),
  results: z.array(agentSearchResultSchema),
  searchEntryPointHtml: z.string().optional()
});

export const generateFromSearchInputSchema = z.object({
  selectedResults: z.array(agentSearchResultSchema).min(1).max(agentSearchResultLimits.max),
  instructions: z.string().trim().max(1000).optional(),
  provider: llmProviderSchema.default(agentSearchDefaults.provider),
  model: z.string().min(1).default(agentSearchDefaults.model)
});

export const generateFromSearchResponseSchema = z.object({
  draft: postDraftSchema,
  contentItem: contentItemSchema,
  duplicate: z.boolean()
});

export type Campaign = z.infer<typeof campaignSchema>;
export type FanpageScheduleConfig = z.infer<typeof fanpageScheduleConfigSchema>;
export type FanpageSummary = z.infer<typeof fanpageSummarySchema>;
export type Fanpage = z.infer<typeof fanpageSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CreateFanpageInput = z.infer<typeof createFanpageSchema>;
export type UpdateFanpageInput = z.infer<typeof updateFanpageSchema>;
export type UpdateFanpageScheduleInput = z.infer<typeof updateFanpageScheduleSchema>;
export type UpdateFanpageTokenInput = z.infer<typeof updateFanpageTokenSchema>;
export type TestFanpageConnectionResponse = z.infer<typeof testFanpageConnectionResponseSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type CreateCurlSourceInput = z.infer<typeof createCurlSourceInputSchema>;
export type SourceSearchInput = z.infer<typeof sourceSearchInputSchema>;
export type SourceSearchResponse = z.infer<typeof sourceSearchResponseSchema>;
export type CreateSourcesFromSearchInput = z.infer<typeof createSourcesFromSearchInputSchema>;
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type ContentItem = z.infer<typeof contentItemSchema>;
export type PostDraft = z.infer<typeof postDraftSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
export type AgentWorkflowRun = z.infer<typeof agentWorkflowRunSchema>;
export type AgentWorkflowRunDetail = z.infer<typeof agentWorkflowRunDetailSchema>;
export type AdminProfile = z.infer<typeof adminProfileSchema>;
export type PublishedPost = z.infer<typeof publishedPostSchema>;
export type PublishOptions = z.infer<typeof publishOptionsSchema>;
export type AgentSearchResult = z.infer<typeof agentSearchResultSchema>;
export type AgentSearchInput = z.infer<typeof agentSearchInputSchema>;
export type AgentSearchResponse = z.infer<typeof agentSearchResponseSchema>;
export type GenerateFromSearchInput = z.infer<typeof generateFromSearchInputSchema>;
export type GenerateFromSearchResponse = z.infer<typeof generateFromSearchResponseSchema>;

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
