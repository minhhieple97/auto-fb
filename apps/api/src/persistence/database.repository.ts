import type {
  AgentRun,
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
  listAgentRuns(campaignId?: string): Awaitable<AgentRun[]>;
}
