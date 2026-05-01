import { NotFoundException } from "@nestjs/common";
import type {
  AgentRun,
  AgentWorkflowRunDetail,
  AdminProfile,
  ApprovalStatus,
  Campaign,
  CampaignStatus,
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
import { randomUUID } from "node:crypto";
import { nowIso } from "../src/common/time.js";
import type {
  CreateAgentRunInput,
  CreateAgentWorkflowRunInput,
  CreateContentInput,
  CreateDraftInput,
  CreateImageAssetInput,
  CreatePublishedPostInput,
  DatabaseRepository,
  AgentRunFilters,
  AgentWorkflowRunFilters,
  UpdateAgentRunInput,
  UpdateAgentWorkflowRunInput
} from "../src/persistence/database.repository.js";

export class FakeDatabase implements DatabaseRepository {
  private adminProfiles = new Map<string, AdminProfile>();
  private campaigns = new Map<string, Campaign>();
  private sources = new Map<string, Source>();
  private contentItems = new Map<string, ContentItem>();
  private imageAssets = new Map<string, ImageAsset>();
  private drafts = new Map<string, PostDraft>();
  private publishedPosts = new Map<string, PublishedPost>();
  private agentRuns = new Map<string, AgentRun>();
  private agentWorkflowRuns = new Map<string, AgentWorkflowRunDetail>();

  getAdminProfileForAuthUser(authUserId: string, email?: string): AdminProfile | undefined {
    const normalizedEmail = email?.trim().toLowerCase();
    const profile =
      this.adminProfiles.get(authUserId) ??
      [...this.adminProfiles.values()].find((item) => normalizedEmail && item.email.toLowerCase() === normalizedEmail);
    return profile?.status === "active" ? this.clone(profile) : undefined;
  }

  upsertAdminProfile(profile: AdminProfile): void {
    this.adminProfiles.set(profile.authUserId, this.clone(profile));
  }

  createCampaign(input: CreateCampaignInput): Campaign {
    const timestamp = nowIso();
    const campaign: Campaign = {
      id: randomUUID(),
      name: input.name,
      topic: input.topic,
      language: input.language,
      brandVoice: input.brandVoice,
      targetPageId: input.targetPageId,
      llmProvider: input.llmProvider,
      llmModel: input.llmModel,
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.campaigns.set(campaign.id, campaign);
    return this.clone(campaign);
  }

  listCampaigns(): Campaign[] {
    return this.sortByCreatedAt([...this.campaigns.values()]);
  }

  getCampaign(id: string): Campaign {
    const campaign = this.campaigns.get(id);
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return this.clone(campaign);
  }

  updateCampaign(id: string, input: UpdateCampaignInput): Campaign {
    const existing = this.getCampaign(id);
    const updated: Campaign = {
      ...existing,
      name: input.name ?? existing.name,
      topic: input.topic ?? existing.topic,
      language: input.language ?? existing.language,
      brandVoice: input.brandVoice ?? existing.brandVoice,
      targetPageId: input.targetPageId ?? existing.targetPageId,
      llmProvider: input.llmProvider ?? existing.llmProvider,
      llmModel: input.llmModel ?? existing.llmModel,
      status: (input.status ?? existing.status) as CampaignStatus,
      updatedAt: nowIso()
    };
    this.campaigns.set(id, updated);
    return this.clone(updated);
  }

  createSource(campaignId: string, input: CreateSourceInput): Source {
    this.getCampaign(campaignId);
    const source: Source = {
      id: randomUUID(),
      campaignId,
      type: input.type,
      url: input.url,
      crawlPolicy: input.crawlPolicy,
      enabled: input.enabled,
      createdAt: nowIso()
    };
    this.sources.set(source.id, source);
    return this.clone(source);
  }

  listSources(campaignId: string): Source[] {
    return this.sortByCreatedAt([...this.sources.values()].filter((source) => source.campaignId === campaignId));
  }

  getSource(id: string): Source {
    const source = this.sources.get(id);
    if (!source) throw new NotFoundException(`Source ${id} not found`);
    return this.clone(source);
  }

  createContentItem(input: CreateContentInput): { item: ContentItem; duplicate: boolean } {
    const duplicate = [...this.contentItems.values()].find(
      (item) => item.campaignId === input.campaignId && item.hash === input.hash
    );
    if (duplicate) return { item: this.clone(duplicate), duplicate: true };

    const item: ContentItem = {
      id: randomUUID(),
      ...input,
      createdAt: nowIso()
    };
    this.contentItems.set(item.id, item);
    return { item: this.clone(item), duplicate: false };
  }

  listContentItems(campaignId: string): ContentItem[] {
    return this.sortByCreatedAt([...this.contentItems.values()].filter((item) => item.campaignId === campaignId));
  }

  getContentItem(id: string): ContentItem {
    const item = this.contentItems.get(id);
    if (!item) throw new NotFoundException(`Content item ${id} not found`);
    return this.clone(item);
  }

  createImageAsset(input: CreateImageAssetInput): ImageAsset {
    const asset: ImageAsset = {
      id: randomUUID(),
      ...input,
      createdAt: nowIso()
    };
    this.imageAssets.set(asset.id, asset);
    return this.clone(asset);
  }

  getImageAsset(id: string): ImageAsset {
    const asset = this.imageAssets.get(id);
    if (!asset) throw new NotFoundException(`Image asset ${id} not found`);
    return this.clone(asset);
  }

  createDraft(input: CreateDraftInput): PostDraft {
    const timestamp = nowIso();
    const draft: PostDraft = {
      id: randomUUID(),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.drafts.set(draft.id, draft);
    return this.hydrateDraft(draft);
  }

  listDrafts(status?: DraftStatus): PostDraft[] {
    const drafts = [...this.drafts.values()].filter((draft) => !status || draft.status === status);
    return this.sortByCreatedAt(drafts).map((draft) => this.hydrateDraft(draft));
  }

  getDraft(id: string): PostDraft {
    const draft = this.drafts.get(id);
    if (!draft) throw new NotFoundException(`Draft ${id} not found`);
    return this.hydrateDraft(draft);
  }

  updateDraftStatus(id: string, status: DraftStatus, approvalStatus: ApprovalStatus): PostDraft {
    const existing = this.getDraft(id);
    const updated: PostDraft = {
      ...existing,
      status,
      approvalStatus,
      updatedAt: nowIso()
    };
    delete updated.contentItem;
    delete updated.imageAsset;
    this.drafts.set(id, updated);
    return this.hydrateDraft(updated);
  }

  createPublishedPost(input: CreatePublishedPostInput): PublishedPost {
    const post: PublishedPost = {
      id: randomUUID(),
      ...input,
      createdAt: nowIso()
    };
    this.publishedPosts.set(post.id, post);
    return this.clone(post);
  }

  listPublishedPosts(): PublishedPost[] {
    return this.sortByCreatedAt([...this.publishedPosts.values()]);
  }

  addAgentRun(input: CreateAgentRunInput): AgentRun {
    const run: AgentRun = {
      id: randomUUID(),
      ...input,
      createdAt: nowIso()
    };
    this.agentRuns.set(run.id, run);
    return this.clone(run);
  }

  updateAgentRun(id: string, input: UpdateAgentRunInput): AgentRun {
    const existing = this.agentRuns.get(id);
    if (!existing) throw new NotFoundException(`Agent run ${id} not found`);
    const updated: AgentRun = {
      ...existing,
      ...input
    };
    this.agentRuns.set(id, updated);
    return this.clone(updated);
  }

  listAgentRuns(filters?: AgentRunFilters | string): AgentRun[] {
    const normalized = typeof filters === "string" ? { campaignId: filters } : filters;
    const runs = [...this.agentRuns.values()].filter(
      (run) =>
        (!normalized?.campaignId || run.campaignId === normalized.campaignId) &&
        (!normalized?.graphRunId || run.graphRunId === normalized.graphRunId)
    );
    return this.sortByCreatedAtAsc(runs);
  }

  createAgentWorkflowRun(input: CreateAgentWorkflowRunInput): AgentWorkflowRunDetail {
    this.getCampaign(input.campaignId);
    const run: AgentWorkflowRunDetail = {
      id: randomUUID(),
      ...input,
      createdAt: nowIso(),
      steps: []
    };
    this.agentWorkflowRuns.set(run.graphRunId, run);
    return this.clone(run);
  }

  updateAgentWorkflowRun(graphRunId: string, input: UpdateAgentWorkflowRunInput): AgentWorkflowRunDetail {
    const existing = this.agentWorkflowRuns.get(graphRunId);
    if (!existing) throw new NotFoundException(`Agent workflow run ${graphRunId} not found`);
    const updated: AgentWorkflowRunDetail = {
      ...existing,
      steps: this.listAgentRuns({ graphRunId })
    };
    if (input.status !== undefined) updated.status = input.status;
    if (input.currentNodeName !== undefined) {
      if (input.currentNodeName === null) {
        delete updated.currentNodeName;
      } else {
        updated.currentNodeName = input.currentNodeName;
      }
    }
    if (input.startedAt !== undefined) updated.startedAt = input.startedAt;
    if (input.finishedAt !== undefined) updated.finishedAt = input.finishedAt;
    this.agentWorkflowRuns.set(graphRunId, updated);
    return this.clone(updated);
  }

  getAgentWorkflowRun(graphRunId: string): AgentWorkflowRunDetail {
    const run = this.agentWorkflowRuns.get(graphRunId);
    if (!run) throw new NotFoundException(`Agent workflow run ${graphRunId} not found`);
    return this.clone({ ...run, steps: this.listAgentRuns({ graphRunId }) });
  }

  listAgentWorkflowRuns(filters: AgentWorkflowRunFilters = {}): AgentWorkflowRunDetail[] {
    const runs = [...this.agentWorkflowRuns.values()]
      .filter((run) => (!filters.campaignId || run.campaignId === filters.campaignId) && (!filters.status || run.status === filters.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filters.limit);
    return runs.map((run) => this.clone({ ...run, steps: this.listAgentRuns({ graphRunId: run.graphRunId }) }));
  }

  hasContentHash(campaignId: string, hash: string): boolean {
    return [...this.contentItems.values()].some((item) => item.campaignId === campaignId && item.hash === hash);
  }

  clear(): void {
    this.campaigns.clear();
    this.sources.clear();
    this.contentItems.clear();
    this.imageAssets.clear();
    this.drafts.clear();
    this.publishedPosts.clear();
    this.agentRuns.clear();
    this.agentWorkflowRuns.clear();
    this.adminProfiles.clear();
  }

  private hydrateDraft(draft: PostDraft): PostDraft {
    const contentItem = this.contentItems.get(draft.contentItemId);
    const imageAsset = draft.imageAssetId ? this.imageAssets.get(draft.imageAssetId) : undefined;
    return this.clone({
      ...draft,
      ...(contentItem ? { contentItem } : {}),
      ...(imageAsset ? { imageAsset } : {})
    });
  }

  private sortByCreatedAt<T extends { createdAt: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => this.clone(item));
  }

  private sortByCreatedAtAsc<T extends { createdAt: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((item) => this.clone(item));
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
