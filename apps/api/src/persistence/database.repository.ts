import type {
  AgentRun,
  AgentRunFilters,
  AgentWorkflowRunDetail,
  AgentWorkflowRunFilters,
  AgentWorkflowRunStatus,
  AdminProfile,
  ApprovalStatus,
  Campaign,
  ContentItem,
  CreateFanpageInput,
  CreateCampaignInput,
  CreateSourceInput,
  DraftStatus,
  Fanpage,
  FanpageScheduleConfig,
  ImageAsset,
  PostDraft,
  PublishedPost,
  Source,
  UpdateFanpageInput,
  UpdateCampaignInput
} from "@auto-fb/shared";

export const DATABASE_REPOSITORY = Symbol("DATABASE_REPOSITORY");

type Awaitable<T> = T | Promise<T>;

export type CreateContentInput = Omit<ContentItem, "id" | "createdAt">;
export type CreateImageAssetInput = Omit<ImageAsset, "id" | "createdAt">;
export type CreateDraftInput = Omit<PostDraft, "id" | "createdAt" | "updatedAt">;
export type CreateFanpageRecordInput = Omit<CreateFanpageInput, "pageAccessToken"> & {
  encryptedPageAccessToken?: string;
  pageAccessTokenMask?: string;
};
export type UpdateFanpageRecordInput = Omit<UpdateFanpageInput, "pageAccessToken"> & {
  encryptedPageAccessToken?: string | null;
  pageAccessTokenMask?: string | null;
};
export type CreateAgentRunInput = Omit<AgentRun, "id" | "createdAt">;
export type UpdateAgentRunInput = Partial<
  Pick<AgentRun, "inputJson" | "outputJson" | "status" | "errorMessage" | "startedAt" | "completedAt">
>;
export type CreateAgentWorkflowRunInput = Omit<AgentWorkflowRunDetail, "id" | "createdAt" | "steps">;
export type UpdateAgentWorkflowRunInput = Partial<{
  status: AgentWorkflowRunStatus;
  currentNodeName: string | null;
  startedAt: string;
  finishedAt: string;
}>;
export type CreatePublishedPostInput = Omit<PublishedPost, "id" | "createdAt">;

export type FanpageTokenRecord = {
  fanpage: Fanpage;
  encryptedPageAccessToken?: string;
};

export type DraftFilters = {
  status?: DraftStatus;
  fanpageId?: string;
};

export type PublishedPostFilters = {
  fanpageId?: string;
};

export interface DatabaseRepository {
  getAdminProfileForAuthUser(authUserId: string, email?: string): Awaitable<AdminProfile | undefined>;

  createCampaign(input: CreateCampaignInput): Awaitable<Campaign>;
  listCampaigns(): Awaitable<Campaign[]>;
  getCampaign(id: string): Awaitable<Campaign>;
  updateCampaign(id: string, input: UpdateCampaignInput): Awaitable<Campaign>;

  createFanpage(input: CreateFanpageRecordInput): Awaitable<Fanpage>;
  listFanpages(): Awaitable<Fanpage[]>;
  getFanpage(id: string): Awaitable<Fanpage>;
  getFanpageByCampaignId(campaignId: string): Awaitable<Fanpage | undefined>;
  getFanpageTokenRecord(id: string): Awaitable<FanpageTokenRecord>;
  getFanpageTokenRecordByCampaignId(campaignId: string): Awaitable<FanpageTokenRecord | undefined>;
  updateFanpage(id: string, input: UpdateFanpageRecordInput): Awaitable<Fanpage>;
  updateFanpageSchedule(id: string, scheduleConfig: FanpageScheduleConfig): Awaitable<Fanpage>;
  listSchedulableFanpages(): Awaitable<Fanpage[]>;
  markFanpageScheduled(id: string, scheduledAt: string): Awaitable<Fanpage>;

  createSource(campaignId: string, input: CreateSourceInput): Awaitable<Source>;
  listSources(campaignId: string): Awaitable<Source[]>;
  getSource(id: string): Awaitable<Source>;

  createContentItem(input: CreateContentInput): Awaitable<{ item: ContentItem; duplicate: boolean }>;
  listContentItems(campaignId: string): Awaitable<ContentItem[]>;
  getContentItem(id: string): Awaitable<ContentItem>;
  hasContentHash(campaignId: string, hash: string): Awaitable<boolean>;

  createImageAsset(input: CreateImageAssetInput): Awaitable<ImageAsset>;
  getImageAsset(id: string): Awaitable<ImageAsset>;

  createDraft(input: CreateDraftInput): Awaitable<PostDraft>;
  listDrafts(filters?: DraftFilters | DraftStatus): Awaitable<PostDraft[]>;
  getDraft(id: string): Awaitable<PostDraft>;
  updateDraftStatus(id: string, status: DraftStatus, approvalStatus: ApprovalStatus): Awaitable<PostDraft>;

  createPublishedPost(input: CreatePublishedPostInput): Awaitable<PublishedPost>;
  listPublishedPosts(filters?: PublishedPostFilters): Awaitable<PublishedPost[]>;

  addAgentRun(input: CreateAgentRunInput): Awaitable<AgentRun>;
  updateAgentRun(id: string, input: UpdateAgentRunInput): Awaitable<AgentRun>;
  listAgentRuns(filters?: AgentRunFilters | string): Awaitable<AgentRun[]>;
  createAgentWorkflowRun(input: CreateAgentWorkflowRunInput): Awaitable<AgentWorkflowRunDetail>;
  updateAgentWorkflowRun(graphRunId: string, input: UpdateAgentWorkflowRunInput): Awaitable<AgentWorkflowRunDetail>;
  getAgentWorkflowRun(graphRunId: string): Awaitable<AgentWorkflowRunDetail>;
  listAgentWorkflowRuns(filters?: AgentWorkflowRunFilters): Awaitable<AgentWorkflowRunDetail[]>;
}
