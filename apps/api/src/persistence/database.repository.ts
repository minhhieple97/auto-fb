import type {
  AgentRun,
  AgentWorkflowRunDetail,
  AgentWorkflowRunStatus,
  ApprovalStatus,
  Campaign,
  ContentItem,
  CreateCampaignInput,
  CreateSourceInput,
  DraftStatus,
  ImageAsset,
  PostDraft,
  PublishedPost,
  Source,
  UpdateCampaignInput
} from "@auto-fb/shared";

export const DATABASE_REPOSITORY = Symbol("DATABASE_REPOSITORY");

type Awaitable<T> = T | Promise<T>;

export type CreateContentInput = Omit<ContentItem, "id" | "createdAt">;
export type CreateImageAssetInput = Omit<ImageAsset, "id" | "createdAt">;
export type CreateDraftInput = Omit<PostDraft, "id" | "createdAt" | "updatedAt">;
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
export type AgentRunFilters = {
  campaignId?: string;
  graphRunId?: string;
};
export type AgentWorkflowRunFilters = {
  campaignId?: string;
  status?: AgentWorkflowRunStatus;
  limit?: number;
};
export type CreatePublishedPostInput = Omit<PublishedPost, "id" | "createdAt">;

export interface DatabaseRepository {
  createCampaign(input: CreateCampaignInput): Awaitable<Campaign>;
  listCampaigns(): Awaitable<Campaign[]>;
  getCampaign(id: string): Awaitable<Campaign>;
  updateCampaign(id: string, input: UpdateCampaignInput): Awaitable<Campaign>;

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
  listDrafts(status?: DraftStatus): Awaitable<PostDraft[]>;
  getDraft(id: string): Awaitable<PostDraft>;
  updateDraftStatus(id: string, status: DraftStatus, approvalStatus: ApprovalStatus): Awaitable<PostDraft>;

  createPublishedPost(input: CreatePublishedPostInput): Awaitable<PublishedPost>;
  listPublishedPosts(): Awaitable<PublishedPost[]>;

  addAgentRun(input: CreateAgentRunInput): Awaitable<AgentRun>;
  updateAgentRun(id: string, input: UpdateAgentRunInput): Awaitable<AgentRun>;
  listAgentRuns(filters?: AgentRunFilters | string): Awaitable<AgentRun[]>;
  createAgentWorkflowRun(input: CreateAgentWorkflowRunInput): Awaitable<AgentWorkflowRunDetail>;
  updateAgentWorkflowRun(graphRunId: string, input: UpdateAgentWorkflowRunInput): Awaitable<AgentWorkflowRunDetail>;
  getAgentWorkflowRun(graphRunId: string): Awaitable<AgentWorkflowRunDetail>;
  listAgentWorkflowRuns(filters?: AgentWorkflowRunFilters): Awaitable<AgentWorkflowRunDetail[]>;
}
