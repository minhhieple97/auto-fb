import { Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AgentRun,
  AgentRunFilters,
  AgentRunStatus,
  AgentWorkflowRun,
  AgentWorkflowRunDetail,
  AgentWorkflowRunFilters,
  AgentWorkflowRunStatus,
  AdminProfile,
  AdminUserStatus,
  AppRole,
  ApprovalStatus,
  Campaign,
  CampaignStatus,
  ContentItem,
  CreateCampaignInput,
  CreateSourceInput,
  Database,
  DraftStatus,
  Fanpage,
  FanpageEnvironment,
  FanpageScheduleConfig,
  FanpageSummary,
  ImageAsset,
  Json,
  LlmProvider,
  PostDraft,
  PublishedPost,
  PublishStatus,
  Source,
  SourceType,
  Tables,
  TablesInsert,
  TablesUpdate,
  UpdateCampaignInput
} from "@auto-fb/shared";
import { adminUserStatuses, campaignStatuses, permissionsForRole } from "@auto-fb/shared";
import { randomUUID } from "node:crypto";
import { appDefaults, envKeys } from "../common/app.constants.js";
import { nowIso } from "../common/time.js";
import type {
  CreateAgentRunInput,
  CreateAgentWorkflowRunInput,
  CreateContentInput,
  CreateDraftInput,
  CreateFanpageRecordInput,
  CreateImageAssetInput,
  CreatePublishedPostInput,
  DatabaseRepository,
  DraftFilters,
  FanpageTokenRecord,
  PublishedPostFilters,
  UpdateAgentRunInput,
  UpdateFanpageRecordInput,
  UpdateAgentWorkflowRunInput
} from "./database.repository.js";

type SupabaseRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

type SupabaseTable = keyof Database["public"]["Tables"];
type CampaignRow = Tables<"campaigns">;
type FanpageRow = Tables<"facebook_pages">;
type SourceRow = Tables<"sources">;
type ContentItemRow = Tables<"content_items">;
type ImageAssetRow = Tables<"image_assets">;
type PostDraftRow = Tables<"post_drafts">;

type PostDraftJoinedRow = PostDraftRow & {
  content_items?: ContentItemRow | null;
  image_assets?: ImageAssetRow | null;
};

type PublishedPostRow = Tables<"published_posts">;
type AgentRunRow = Tables<"agent_runs">;
type AgentWorkflowRunRow = Tables<"agent_workflow_runs">;
type AdminUserRow = {
  auth_user_id: string | null;
  created_at: string;
  email: string;
  id: string;
  role: AppRole;
  status: AdminUserStatus;
  updated_at: string;
};

const DRAFT_SELECT = "*,content_items(*),image_assets(*)";
const SELECT_ONE_LIMIT = "1";

@Injectable()
export class SupabaseDatabase implements DatabaseRepository {
  private readonly restUrl: string;
  private readonly apiKey: string;
  private readonly schema: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const supabaseUrl = config.get<string>(envKeys.supabaseUrl)?.replace(/\/$/, "");
    const apiKey =
      config.get<string>(envKeys.supabaseSecretKey) ??
      config.get<string>(envKeys.supabaseServiceRoleKey) ??
      config.get<string>(envKeys.supabaseServiceKey);

    if (!supabaseUrl || !apiKey) {
      throw new Error(
        `${envKeys.supabaseUrl} and ${envKeys.supabaseSecretKey} are required for the Supabase database adapter. ${envKeys.supabaseServiceRoleKey} is also accepted for legacy projects.`
      );
    }

    this.restUrl = `${supabaseUrl}/rest/v1`;
    this.apiKey = apiKey;
    this.schema = config.get<string>(envKeys.supabaseSchema, appDefaults.supabaseSchema);
  }

  async getAdminProfileForAuthUser(authUserId: string, email?: string): Promise<AdminProfile | undefined> {
    let row = (
      await this.selectAdminUsers({
        auth_user_id: this.eq(authUserId),
        status: this.eq(adminUserStatuses.active),
        limit: SELECT_ONE_LIMIT
      })
    )[0];

    if (!row && email) {
      row = (
        await this.selectAdminUsers({
          email: this.eq(normalizeEmail(email)),
          status: this.eq(adminUserStatuses.active),
          limit: SELECT_ONE_LIMIT
        })
      )[0];

      if (row && !row.auth_user_id) {
        row = await this.updateAdminUserAuthId(row.id, authUserId);
      }
    }

    return row ? toAdminProfile(row, authUserId) : undefined;
  }

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const timestamp = nowIso();
    const row = await this.insertOne("campaigns", {
      id: randomUUID(),
      name: input.name,
      topic: input.topic,
      language: input.language,
      brand_voice: input.brandVoice,
      target_page_id: input.targetPageId,
      llm_provider: input.llmProvider,
      llm_model: input.llmModel,
      status: campaignStatuses.active,
      created_at: timestamp,
      updated_at: timestamp
    });
    return toCampaign(row);
  }

  async listCampaigns(): Promise<Campaign[]> {
    const rows = await this.selectMany("campaigns", { order: "created_at.desc" });
    return rows.map(toCampaign);
  }

  async getCampaign(id: string): Promise<Campaign> {
    const row = await this.selectOne("campaigns", { id: this.eq(id) }, `Campaign ${id} not found`);
    return toCampaign(row);
  }

  async updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    const timestamp = nowIso();
    const patch: TablesUpdate<"campaigns"> = { updated_at: timestamp };
    if (input.name !== undefined) patch.name = input.name;
    if (input.topic !== undefined) patch.topic = input.topic;
    if (input.language !== undefined) patch.language = input.language;
    if (input.brandVoice !== undefined) patch.brand_voice = input.brandVoice;
    if (input.targetPageId !== undefined) patch.target_page_id = input.targetPageId;
    if (input.llmProvider !== undefined) patch.llm_provider = input.llmProvider;
    if (input.llmModel !== undefined) patch.llm_model = input.llmModel;
    if (input.status !== undefined) patch.status = input.status;

    const row = await this.updateOne("campaigns", { id: this.eq(id) }, patch, `Campaign ${id} not found`);
    const fanpage = await this.findFanpageByCampaignId(id);
    if (fanpage) {
      const fanpagePatch: TablesUpdate<"facebook_pages"> = { updated_at: timestamp };
      if (input.name !== undefined) fanpagePatch.name = input.name;
      if (input.topic !== undefined) fanpagePatch.topic = input.topic;
      if (input.language !== undefined) fanpagePatch.language = input.language;
      if (input.brandVoice !== undefined) fanpagePatch.brand_voice = input.brandVoice;
      if (input.targetPageId !== undefined) fanpagePatch.facebook_page_id = input.targetPageId;
      if (input.llmProvider !== undefined) fanpagePatch.llm_provider = input.llmProvider;
      if (input.llmModel !== undefined) fanpagePatch.llm_model = input.llmModel;
      if (input.status !== undefined) fanpagePatch.status = input.status;
      await this.updateOne(
        "facebook_pages",
        { id: this.eq(fanpage.id) },
        fanpagePatch,
        `Fanpage ${fanpage.id} not found`
      );
    }
    return toCampaign(row);
  }

  async createFanpage(input: CreateFanpageRecordInput): Promise<Fanpage> {
    const campaign = await this.createCampaign({
      name: input.name,
      topic: input.topic,
      language: input.language,
      brandVoice: input.brandVoice,
      targetPageId: input.facebookPageId,
      llmProvider: input.llmProvider,
      llmModel: input.llmModel
    });
    const timestamp = nowIso();
    const row = await this.insertOne("facebook_pages", {
      id: randomUUID(),
      campaign_id: campaign.id,
      name: input.name,
      facebook_page_id: input.facebookPageId,
      environment: input.environment,
      topic: input.topic,
      language: input.language,
      brand_voice: input.brandVoice,
      llm_provider: input.llmProvider,
      llm_model: input.llmModel,
      ...scheduleColumns(input.scheduleConfig),
      encrypted_page_access_token: input.encryptedPageAccessToken ?? null,
      page_access_token_mask: input.pageAccessTokenMask ?? null,
      status: campaignStatuses.active,
      created_at: timestamp,
      updated_at: timestamp
    });
    return toFanpage(row);
  }

  async listFanpages(): Promise<Fanpage[]> {
    const rows = await this.selectMany("facebook_pages", { order: "created_at.desc" });
    return rows.map(toFanpage);
  }

  async getFanpage(id: string): Promise<Fanpage> {
    const row = await this.selectOne("facebook_pages", { id: this.eq(id) }, `Fanpage ${id} not found`);
    return toFanpage(row);
  }

  async getFanpageByCampaignId(campaignId: string): Promise<Fanpage | undefined> {
    const row = await this.findFanpageByCampaignId(campaignId);
    return row ? toFanpage(row) : undefined;
  }

  async getFanpageTokenRecord(id: string): Promise<FanpageTokenRecord> {
    const row = await this.selectOne("facebook_pages", { id: this.eq(id) }, `Fanpage ${id} not found`);
    return toFanpageTokenRecord(row);
  }

  async getFanpageTokenRecordByCampaignId(campaignId: string): Promise<FanpageTokenRecord | undefined> {
    const row = await this.findFanpageByCampaignId(campaignId);
    return row ? toFanpageTokenRecord(row) : undefined;
  }

  async updateFanpage(id: string, input: UpdateFanpageRecordInput): Promise<Fanpage> {
    const existing = await this.getFanpage(id);
    const timestamp = nowIso();
    const patch: TablesUpdate<"facebook_pages"> = { updated_at: timestamp };
    if (input.name !== undefined) patch.name = input.name;
    if (input.facebookPageId !== undefined) patch.facebook_page_id = input.facebookPageId;
    if (input.environment !== undefined) patch.environment = input.environment;
    if (input.topic !== undefined) patch.topic = input.topic;
    if (input.language !== undefined) patch.language = input.language;
    if (input.brandVoice !== undefined) patch.brand_voice = input.brandVoice;
    if (input.llmProvider !== undefined) patch.llm_provider = input.llmProvider;
    if (input.llmModel !== undefined) patch.llm_model = input.llmModel;
    if (input.scheduleConfig !== undefined) Object.assign(patch, scheduleColumns(input.scheduleConfig));
    if (input.status !== undefined) patch.status = input.status;
    if (input.encryptedPageAccessToken !== undefined) patch.encrypted_page_access_token = input.encryptedPageAccessToken;
    if (input.pageAccessTokenMask !== undefined) patch.page_access_token_mask = input.pageAccessTokenMask;

    const row = await this.updateOne("facebook_pages", { id: this.eq(id) }, patch, `Fanpage ${id} not found`);

    await this.updateOne(
      "campaigns",
      { id: this.eq(existing.campaignId) },
      {
        updated_at: timestamp,
        name: row.name,
        topic: row.topic,
        language: row.language,
        brand_voice: row.brand_voice,
        target_page_id: row.facebook_page_id,
        llm_provider: row.llm_provider,
        llm_model: row.llm_model,
        status: row.status
      },
      `Campaign ${existing.campaignId} not found`
    );
    return toFanpage(row);
  }

  async updateFanpageSchedule(id: string, scheduleConfig: FanpageScheduleConfig): Promise<Fanpage> {
    return this.updateFanpage(id, { scheduleConfig });
  }

  async listSchedulableFanpages(): Promise<Fanpage[]> {
    const rows = await this.selectMany("facebook_pages", {
      schedule_enabled: this.eq("true"),
      status: this.eq(campaignStatuses.active),
      order: "updated_at.asc"
    });
    return rows.map(toFanpage);
  }

  async markFanpageScheduled(id: string, scheduledAt: string): Promise<Fanpage> {
    const row = await this.updateOne(
      "facebook_pages",
      { id: this.eq(id) },
      { last_scheduled_at: scheduledAt, updated_at: nowIso() },
      `Fanpage ${id} not found`
    );
    return toFanpage(row);
  }

  async createSource(campaignId: string, input: CreateSourceInput): Promise<Source> {
    await this.getCampaign(campaignId);
    const row = await this.insertOne("sources", {
      id: randomUUID(),
      campaign_id: campaignId,
      type: input.type,
      url: input.url ?? "",
      crawl_policy: input.crawlPolicy,
      enabled: input.enabled,
      metadata: input.metadata ? toJson(input.metadata, "sources.metadata") : null,
      created_at: nowIso()
    });
    return toSource(row);
  }

  async listSources(campaignId: string): Promise<Source[]> {
    const rows = await this.selectMany("sources", { campaign_id: this.eq(campaignId), order: "created_at.desc" });
    return rows.map(toSource);
  }

  async getSource(id: string): Promise<Source> {
    const row = await this.selectOne("sources", { id: this.eq(id) }, `Source ${id} not found`);
    return toSource(row);
  }

  async createContentItem(input: CreateContentInput): Promise<{ item: ContentItem; duplicate: boolean }> {
    try {
      const row = await this.insertOne("content_items", {
        id: randomUUID(),
        campaign_id: input.campaignId,
        source_id: input.sourceId,
        source_url: input.sourceUrl,
        title: input.title,
        raw_text: input.rawText,
        summary: input.summary,
        image_urls: input.imageUrls,
        hash: input.hash,
        created_at: nowIso()
      });
      return { item: toContentItem(row), duplicate: false };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const item = await this.findContentByCampaignHash(input.campaignId, input.hash);
      if (!item) throw error;
      return { item, duplicate: true };
    }
  }

  async listContentItems(campaignId: string): Promise<ContentItem[]> {
    const rows = await this.selectMany("content_items", {
      campaign_id: this.eq(campaignId),
      order: "created_at.desc"
    });
    return rows.map(toContentItem);
  }

  async getContentItem(id: string): Promise<ContentItem> {
    const row = await this.selectOne("content_items", { id: this.eq(id) }, `Content item ${id} not found`);
    return toContentItem(row);
  }

  async hasContentHash(campaignId: string, hash: string): Promise<boolean> {
    const rows = await this.selectMany<"content_items", { id: string }>("content_items", {
      select: "id",
      campaign_id: this.eq(campaignId),
      hash: this.eq(hash),
      limit: SELECT_ONE_LIMIT
    });
    return rows.length > 0;
  }

  async createImageAsset(input: CreateImageAssetInput): Promise<ImageAsset> {
    const row = await this.insertOne("image_assets", {
      id: randomUUID(),
      campaign_id: input.campaignId,
      source_url: input.sourceUrl ?? null,
      r2_key: input.r2Key,
      public_url: input.publicUrl ?? null,
      mime_type: input.mimeType,
      created_at: nowIso()
    });
    return toImageAsset(row);
  }

  async getImageAsset(id: string): Promise<ImageAsset> {
    const row = await this.selectOne("image_assets", { id: this.eq(id) }, `Image asset ${id} not found`);
    return toImageAsset(row);
  }

  async createDraft(input: CreateDraftInput): Promise<PostDraft> {
    const timestamp = nowIso();
    const row = await this.insertOne("post_drafts", {
      id: randomUUID(),
      campaign_id: input.campaignId,
      content_item_id: input.contentItemId,
      image_asset_id: input.imageAssetId ?? null,
      text: input.text,
      status: input.status,
      risk_score: input.riskScore,
      risk_flags: input.riskFlags,
      approval_status: input.approvalStatus,
      created_at: timestamp,
      updated_at: timestamp
    });
    return this.getDraft(row.id);
  }

  async listDrafts(filters?: DraftFilters | DraftStatus): Promise<PostDraft[]> {
    const normalized = typeof filters === "string" ? { status: filters } : filters;
    const fanpage = normalized?.fanpageId ? await this.getFanpage(normalized.fanpageId) : undefined;
    const rows = await this.selectMany<"post_drafts", PostDraftJoinedRow>("post_drafts", {
      select: DRAFT_SELECT,
      ...(normalized?.status ? { status: this.eq(normalized.status) } : {}),
      ...(fanpage ? { campaign_id: this.eq(fanpage.campaignId) } : {}),
      order: "created_at.desc"
    });
    return Promise.all(rows.map((row) => this.hydrateDraft(row)));
  }

  async getDraft(id: string): Promise<PostDraft> {
    const row = await this.selectOne<"post_drafts", PostDraftJoinedRow>(
      "post_drafts",
      { select: DRAFT_SELECT, id: this.eq(id) },
      `Draft ${id} not found`
    );
    return this.hydrateDraft(row);
  }

  async updateDraftStatus(id: string, status: DraftStatus, approvalStatus: ApprovalStatus): Promise<PostDraft> {
    await this.updateOne(
      "post_drafts",
      { id: this.eq(id) },
      { status, approval_status: approvalStatus, updated_at: nowIso() },
      `Draft ${id} not found`
    );
    return this.getDraft(id);
  }

  async createPublishedPost(input: CreatePublishedPostInput): Promise<PublishedPost> {
    const row = await this.insertOne("published_posts", {
      id: randomUUID(),
      post_draft_id: input.postDraftId,
      facebook_page_id: input.facebookPageId,
      facebook_post_id: input.facebookPostId ?? null,
      status: input.status,
      publish_payload: toJson(input.publishPayload, "published_posts.publish_payload"),
      error_message: input.errorMessage ?? null,
      published_at: input.publishedAt ?? null,
      created_at: nowIso()
    });
    return toPublishedPost(row);
  }

  async listPublishedPosts(filters: PublishedPostFilters = {}): Promise<PublishedPost[]> {
    const rows = await this.selectMany("published_posts", { order: "created_at.desc" });
    const posts = await Promise.all(rows.map((row) => this.hydratePublishedPost(row)));
    return filters.fanpageId ? posts.filter((post) => post.fanpage?.id === filters.fanpageId) : posts;
  }

  async addAgentRun(input: CreateAgentRunInput): Promise<AgentRun> {
    const row = await this.insertOne("agent_runs", {
      id: randomUUID(),
      campaign_id: input.campaignId,
      graph_run_id: input.graphRunId,
      node_name: input.nodeName,
      input_json: toJson(input.inputJson, "agent_runs.input_json"),
      output_json: toJson(input.outputJson, "agent_runs.output_json"),
      status: input.status,
      error_message: input.errorMessage ?? null,
      started_at: input.startedAt ?? null,
      completed_at: input.completedAt ?? null,
      created_at: nowIso()
    });
    return toAgentRun(row);
  }

  async updateAgentRun(id: string, input: UpdateAgentRunInput): Promise<AgentRun> {
    const patch: TablesUpdate<"agent_runs"> = {};
    if (input.inputJson !== undefined) patch.input_json = toJson(input.inputJson, "agent_runs.input_json");
    if (input.outputJson !== undefined) patch.output_json = toJson(input.outputJson, "agent_runs.output_json");
    if (input.status !== undefined) patch.status = input.status;
    if (input.errorMessage !== undefined) patch.error_message = input.errorMessage;
    if (input.startedAt !== undefined) patch.started_at = input.startedAt;
    if (input.completedAt !== undefined) patch.completed_at = input.completedAt;

    const row = await this.updateOne("agent_runs", { id: this.eq(id) }, patch, `Agent run ${id} not found`);
    return toAgentRun(row);
  }

  async listAgentRuns(filters?: AgentRunFilters | string): Promise<AgentRun[]> {
    const normalized = typeof filters === "string" ? { campaignId: filters } : filters;
    const rows = await this.selectMany("agent_runs", {
      ...(normalized?.campaignId ? { campaign_id: this.eq(normalized.campaignId) } : {}),
      ...(normalized?.graphRunId ? { graph_run_id: this.eq(normalized.graphRunId) } : {}),
      order: "created_at.asc"
    });
    return rows.map(toAgentRun);
  }

  async createAgentWorkflowRun(input: CreateAgentWorkflowRunInput): Promise<AgentWorkflowRunDetail> {
    const row = await this.insertOne("agent_workflow_runs", {
      id: randomUUID(),
      campaign_id: input.campaignId,
      graph_run_id: input.graphRunId,
      status: input.status,
      current_node_name: input.currentNodeName ?? null,
      triggered_by_user_id: input.triggeredByUserId,
      triggered_by_email: input.triggeredByEmail ?? null,
      created_at: nowIso(),
      started_at: input.startedAt ?? null,
      finished_at: input.finishedAt ?? null
    });
    return this.hydrateAgentWorkflowRun(row);
  }

  async updateAgentWorkflowRun(graphRunId: string, input: UpdateAgentWorkflowRunInput): Promise<AgentWorkflowRunDetail> {
    const patch: TablesUpdate<"agent_workflow_runs"> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.currentNodeName !== undefined) patch.current_node_name = input.currentNodeName;
    if (input.startedAt !== undefined) patch.started_at = input.startedAt;
    if (input.finishedAt !== undefined) patch.finished_at = input.finishedAt;

    const row = await this.updateOne(
      "agent_workflow_runs",
      { graph_run_id: this.eq(graphRunId) },
      patch,
      `Agent workflow run ${graphRunId} not found`
    );
    return this.hydrateAgentWorkflowRun(row);
  }

  async getAgentWorkflowRun(graphRunId: string): Promise<AgentWorkflowRunDetail> {
    const row = await this.selectOne(
      "agent_workflow_runs",
      { graph_run_id: this.eq(graphRunId) },
      `Agent workflow run ${graphRunId} not found`
    );
    return this.hydrateAgentWorkflowRun(row);
  }

  async listAgentWorkflowRuns(filters: AgentWorkflowRunFilters = {}): Promise<AgentWorkflowRunDetail[]> {
    const rows = await this.selectMany("agent_workflow_runs", {
      ...(filters.campaignId ? { campaign_id: this.eq(filters.campaignId) } : {}),
      ...(filters.status ? { status: this.eq(filters.status) } : {}),
      ...(filters.limit ? { limit: String(filters.limit) } : {}),
      order: "created_at.desc"
    });
    return Promise.all(rows.map((row) => this.hydrateAgentWorkflowRun(row)));
  }

  private async findContentByCampaignHash(campaignId: string, hash: string): Promise<ContentItem | undefined> {
    const rows = await this.selectMany("content_items", {
      campaign_id: this.eq(campaignId),
      hash: this.eq(hash),
      limit: SELECT_ONE_LIMIT
    });
    const row = rows[0];
    return row ? toContentItem(row) : undefined;
  }

  private async findFanpageByCampaignId(campaignId: string): Promise<FanpageRow | undefined> {
    const rows = await this.selectMany("facebook_pages", {
      campaign_id: this.eq(campaignId),
      limit: SELECT_ONE_LIMIT
    });
    return rows[0];
  }

  private async hydrateDraft(row: PostDraftJoinedRow): Promise<PostDraft> {
    const draft = toPostDraft(row);
    const fanpage = await this.getFanpageByCampaignId(draft.campaignId);
    return {
      ...draft,
      ...(fanpage ? { fanpage: toFanpageSummary(fanpage) } : {})
    };
  }

  private async hydratePublishedPost(row: PublishedPostRow): Promise<PublishedPost> {
    const post = toPublishedPost(row);
    const draft = await this.getDraft(post.postDraftId).catch(() => undefined);
    return {
      ...post,
      ...(draft?.fanpage ? { fanpage: draft.fanpage } : {})
    };
  }

  private async hydrateAgentWorkflowRun(row: AgentWorkflowRunRow): Promise<AgentWorkflowRunDetail> {
    return {
      ...toAgentWorkflowRun(row),
      steps: await this.listAgentRuns({ graphRunId: row.graph_run_id })
    };
  }

  private async selectAdminUsers(params: Record<string, string | undefined> = {}): Promise<AdminUserRow[]> {
    return this.request<AdminUserRow[]>(this.path("admin_users", { select: "*", ...params }));
  }

  private async updateAdminUserAuthId(id: string, authUserId: string): Promise<AdminUserRow> {
    const rows = await this.request<AdminUserRow[] | AdminUserRow>(
      this.path("admin_users", { select: "*", id: this.eq(id) }),
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ auth_user_id: authUserId, updated_at: nowIso() })
      }
    );
    return firstRepresentation(rows, `Admin user ${id} not found`);
  }

  private async selectMany<Table extends SupabaseTable, Row = Tables<Table>>(
    table: Table,
    params: Record<string, string | undefined> = {}
  ): Promise<Row[]> {
    return this.request<Row[]>(this.path(table, { select: "*", ...params }));
  }

  private async selectOne<Table extends SupabaseTable, Row = Tables<Table>>(
    table: Table,
    params: Record<string, string | undefined>,
    notFoundMessage: string
  ): Promise<Row> {
    const rows = await this.selectMany<Table, Row>(table, { ...params, limit: SELECT_ONE_LIMIT });
    const row = rows[0];
    if (!row) throw new NotFoundException(notFoundMessage);
    return row;
  }

  private async insertOne<Table extends SupabaseTable, Row = Tables<Table>>(
    table: Table,
    body: TablesInsert<Table>,
    select = "*"
  ): Promise<Row> {
    const rows = await this.request<Row[] | Row>(
      this.path(table, { select }),
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body)
      }
    );
    return firstRepresentation(rows, `Supabase did not return inserted ${table}`);
  }

  private async updateOne<Table extends SupabaseTable, Row = Tables<Table>>(
    table: Table,
    filters: Record<string, string>,
    body: TablesUpdate<Table>,
    notFoundMessage: string
  ): Promise<Row> {
    const rows = await this.request<Row[] | Row>(
      this.path(table, { select: "*", ...filters }),
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body)
      }
    );
    if (Array.isArray(rows) && rows.length === 0) throw new NotFoundException(notFoundMessage);
    return firstRepresentation(rows, notFoundMessage);
  }

  private async request<T>(path: string, options: SupabaseRequestOptions = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.restUrl}${path}`, {
        ...options,
        headers: this.headers(options.headers)
      });
    } catch (error) {
      throw new InternalServerErrorException(`Supabase request failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const text = await response.text();
    const body = parseJson(text);
    if (!response.ok) {
      const { message, code } = postgrestError(body);
      throw new SupabaseRequestException(code ? { status: response.status, code, message } : { status: response.status, message });
    }

    return body as T;
  }

  private path(table: string, params: Record<string, string | undefined> = {}): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, value);
    }
    const query = search.toString();
    return `/${table}${query ? `?${query}` : ""}`;
  }

  private eq(value: string): string {
    return `eq.${value}`;
  }

  private headers(overrides: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.apiKey,
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Profile": this.schema,
      "Content-Profile": this.schema,
      ...overrides
    };
  }
}

class SupabaseRequestException extends InternalServerErrorException {
  readonly supabaseStatus: number;
  readonly supabaseCode: string | undefined;

  constructor(input: { status: number; code?: string; message: string }) {
    super(`Supabase request failed (${input.status}${input.code ? `/${input.code}` : ""}): ${input.message}`);
    this.supabaseStatus = input.status;
    this.supabaseCode = input.code;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof SupabaseRequestException && (error.supabaseStatus === 409 || error.supabaseCode === "23505");
}

function firstRepresentation<Row>(rows: Row[] | Row, message: string): Row {
  if (!Array.isArray(rows)) return rows;
  const row = rows[0];
  if (!row) throw new InternalServerErrorException(message);
  return row;
}

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function postgrestError(body: unknown): { message: string; code?: string } {
  if (!isRecord(body)) return { message: String(body ?? "Unknown Supabase error") };
  const message = typeof body.message === "string" ? body.message : "Unknown Supabase error";
  const code = typeof body.code === "string" ? body.code : undefined;
  return code ? { message, code } : { message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toJson(value: unknown, fieldName: string): Json {
  if (isJson(value)) return value;
  throw new InternalServerErrorException(`Supabase ${fieldName} must be JSON serializable`);
}

function isJson(value: unknown): value is Json {
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJson);
  if (!isRecord(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;

  return Object.values(value).every((item) => item === undefined || isJson(item));
}

function stringArrayFromJson(value: Json, fieldName: string): string[] {
  if (Array.isArray(value) && value.every((item): item is string => typeof item === "string")) return value;
  throw new InternalServerErrorException(`Supabase ${fieldName} must be a string array`);
}

function toCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    topic: row.topic,
    language: row.language,
    brandVoice: row.brand_voice,
    targetPageId: row.target_page_id,
    llmProvider: row.llm_provider as LlmProvider,
    llmModel: row.llm_model,
    status: row.status as CampaignStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toFanpage(row: FanpageRow): Fanpage {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    facebookPageId: row.facebook_page_id,
    environment: row.environment as FanpageEnvironment,
    topic: row.topic,
    language: row.language,
    brandVoice: row.brand_voice,
    llmProvider: row.llm_provider as LlmProvider,
    llmModel: row.llm_model,
    scheduleConfig: {
      enabled: row.schedule_enabled,
      postsPerDay: row.schedule_posts_per_day,
      intervalMinutes: row.schedule_interval_minutes,
      startTimeLocal: row.schedule_start_time_local,
      timezone: row.schedule_timezone
    },
    hasPageAccessToken: Boolean(row.encrypted_page_access_token),
    ...(row.page_access_token_mask ? { pageAccessTokenMask: row.page_access_token_mask } : {}),
    status: row.status as CampaignStatus,
    ...(row.last_scheduled_at ? { lastScheduledAt: row.last_scheduled_at } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toFanpageSummary(fanpage: Fanpage): FanpageSummary {
  return {
    id: fanpage.id,
    campaignId: fanpage.campaignId,
    name: fanpage.name,
    facebookPageId: fanpage.facebookPageId,
    environment: fanpage.environment,
    status: fanpage.status
  };
}

function toFanpageTokenRecord(row: FanpageRow): FanpageTokenRecord {
  const encryptedPageAccessToken = row.encrypted_page_access_token ?? undefined;
  return {
    fanpage: toFanpage(row),
    ...(encryptedPageAccessToken ? { encryptedPageAccessToken } : {})
  };
}

function scheduleColumns(scheduleConfig: FanpageScheduleConfig): Pick<
  TablesInsert<"facebook_pages">,
  "schedule_enabled" | "schedule_posts_per_day" | "schedule_interval_minutes" | "schedule_start_time_local" | "schedule_timezone"
> {
  return {
    schedule_enabled: scheduleConfig.enabled,
    schedule_posts_per_day: scheduleConfig.postsPerDay,
    schedule_interval_minutes: scheduleConfig.intervalMinutes,
    schedule_start_time_local: scheduleConfig.startTimeLocal,
    schedule_timezone: scheduleConfig.timezone
  };
}

function toSource(row: SourceRow): Source {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    type: row.type as SourceType,
    url: row.url,
    crawlPolicy: row.crawl_policy,
    enabled: row.enabled,
    createdAt: row.created_at,
    ...(row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? { metadata: row.metadata as Record<string, unknown> }
      : {})
  };
}

function toContentItem(row: ContentItemRow): ContentItem {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    title: row.title,
    rawText: row.raw_text,
    summary: row.summary,
    imageUrls: stringArrayFromJson(row.image_urls, "content_items.image_urls"),
    hash: row.hash,
    createdAt: row.created_at
  };
}

function toImageAsset(row: ImageAssetRow): ImageAsset {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    ...(row.source_url ? { sourceUrl: row.source_url } : {}),
    r2Key: row.r2_key,
    ...(row.public_url ? { publicUrl: row.public_url } : {}),
    mimeType: row.mime_type,
    createdAt: row.created_at
  };
}

function toPostDraft(row: PostDraftJoinedRow): PostDraft {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    contentItemId: row.content_item_id,
    ...(row.image_asset_id ? { imageAssetId: row.image_asset_id } : {}),
    text: row.text,
    status: row.status as DraftStatus,
    riskScore: row.risk_score,
    riskFlags: stringArrayFromJson(row.risk_flags, "post_drafts.risk_flags"),
    approvalStatus: row.approval_status as ApprovalStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.content_items ? { contentItem: toContentItem(row.content_items) } : {}),
    ...(row.image_assets ? { imageAsset: toImageAsset(row.image_assets) } : {})
  };
}

function toPublishedPost(row: PublishedPostRow): PublishedPost {
  return {
    id: row.id,
    postDraftId: row.post_draft_id,
    facebookPageId: row.facebook_page_id,
    ...(row.facebook_post_id ? { facebookPostId: row.facebook_post_id } : {}),
    status: row.status as PublishStatus,
    publishPayload: row.publish_payload,
    ...(row.error_message ? { errorMessage: row.error_message } : {}),
    ...(row.published_at ? { publishedAt: row.published_at } : {}),
    createdAt: row.created_at
  };
}

function toAgentRun(row: AgentRunRow): AgentRun {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    graphRunId: row.graph_run_id,
    nodeName: row.node_name,
    inputJson: row.input_json,
    outputJson: row.output_json,
    status: row.status as AgentRunStatus,
    ...(row.error_message ? { errorMessage: row.error_message } : {}),
    ...(row.started_at ? { startedAt: row.started_at } : {}),
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
    createdAt: row.created_at
  };
}

function toAgentWorkflowRun(row: AgentWorkflowRunRow): AgentWorkflowRun {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    graphRunId: row.graph_run_id,
    status: row.status as AgentWorkflowRunStatus,
    ...(row.current_node_name ? { currentNodeName: row.current_node_name } : {}),
    triggeredByUserId: row.triggered_by_user_id,
    ...(row.triggered_by_email ? { triggeredByEmail: row.triggered_by_email } : {}),
    createdAt: row.created_at,
    ...(row.started_at ? { startedAt: row.started_at } : {}),
    ...(row.finished_at ? { finishedAt: row.finished_at } : {})
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toAdminProfile(row: AdminUserRow, fallbackAuthUserId: string): AdminProfile {
  return {
    authUserId: row.auth_user_id ?? fallbackAuthUserId,
    email: row.email,
    role: row.role,
    status: row.status,
    permissions: permissionsForRole(row.role)
  };
}
