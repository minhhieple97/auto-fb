import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AgentRun,
  AgentRunStatus,
  ApprovalStatus,
  Campaign,
  CampaignStatus,
  ContentItem,
  CreateCampaignInput,
  CreateSourceInput,
  DraftStatus,
  ImageAsset,
  LlmProvider,
  PostDraft,
  PublishedPost,
  PublishStatus,
  Source,
  SourceType,
  UpdateCampaignInput
} from "@auto-fb/shared";
import { randomUUID } from "node:crypto";
import { nowIso } from "../common/time.js";
import type {
  CreateAgentRunInput,
  CreateContentInput,
  CreateDraftInput,
  CreateImageAssetInput,
  CreatePublishedPostInput,
  DatabaseRepository
} from "./database.repository.js";

type SupabaseRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

type CampaignRow = {
  id: string;
  name: string;
  topic: string;
  language: string;
  brand_voice: string;
  target_page_id: string;
  llm_provider: LlmProvider;
  llm_model: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
};

type SourceRow = {
  id: string;
  campaign_id: string;
  type: SourceType;
  url: string;
  crawl_policy: string;
  enabled: boolean;
  created_at: string;
};

type ContentItemRow = {
  id: string;
  campaign_id: string;
  source_id: string;
  source_url: string;
  title: string;
  raw_text: string;
  summary: string;
  image_urls: string[];
  hash: string;
  created_at: string;
};

type ImageAssetRow = {
  id: string;
  campaign_id: string;
  source_url: string | null;
  r2_key: string;
  public_url: string | null;
  mime_type: string;
  created_at: string;
};

type PostDraftRow = {
  id: string;
  campaign_id: string;
  content_item_id: string;
  image_asset_id: string | null;
  text: string;
  status: DraftStatus;
  risk_score: number;
  risk_flags: string[];
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
};

type PostDraftJoinedRow = PostDraftRow & {
  content_items?: ContentItemRow | null;
  image_assets?: ImageAssetRow | null;
};

type PublishedPostRow = {
  id: string;
  post_draft_id: string;
  facebook_page_id: string;
  facebook_post_id: string | null;
  status: PublishStatus;
  publish_payload: unknown;
  error_message: string | null;
  published_at: string | null;
  created_at: string;
};

type AgentRunRow = {
  id: string;
  campaign_id: string;
  graph_run_id: string;
  node_name: string;
  input_json: unknown;
  output_json: unknown;
  status: AgentRunStatus;
  error_message: string | null;
  created_at: string;
};

const DRAFT_SELECT = "*,content_items(*),image_assets(*)";

@Injectable()
export class SupabaseDatabase implements DatabaseRepository {
  private readonly restUrl: string;
  private readonly apiKey: string;
  private readonly schema: string;

  constructor(config: ConfigService) {
    const supabaseUrl = config.get<string>("SUPABASE_URL")?.replace(/\/$/, "");
    const apiKey =
      config.get<string>("SUPABASE_SECRET_KEY") ??
      config.get<string>("SUPABASE_SERVICE_ROLE_KEY") ??
      config.get<string>("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !apiKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SECRET_KEY are required for the Supabase database adapter. SUPABASE_SERVICE_ROLE_KEY is also accepted for legacy projects."
      );
    }

    this.restUrl = `${supabaseUrl}/rest/v1`;
    this.apiKey = apiKey;
    this.schema = config.get<string>("SUPABASE_SCHEMA", "public");
  }

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const timestamp = nowIso();
    const row = await this.insertOne<CampaignRow>("campaigns", {
      id: randomUUID(),
      name: input.name,
      topic: input.topic,
      language: input.language,
      brand_voice: input.brandVoice,
      target_page_id: input.targetPageId,
      llm_provider: input.llmProvider,
      llm_model: input.llmModel,
      status: "ACTIVE",
      created_at: timestamp,
      updated_at: timestamp
    });
    return toCampaign(row);
  }

  async listCampaigns(): Promise<Campaign[]> {
    const rows = await this.selectMany<CampaignRow>("campaigns", { order: "created_at.desc" });
    return rows.map(toCampaign);
  }

  async getCampaign(id: string): Promise<Campaign> {
    const row = await this.selectOne<CampaignRow>("campaigns", { id: this.eq(id) }, `Campaign ${id} not found`);
    return toCampaign(row);
  }

  async updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    const patch: Partial<CampaignRow> = { updated_at: nowIso() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.topic !== undefined) patch.topic = input.topic;
    if (input.language !== undefined) patch.language = input.language;
    if (input.brandVoice !== undefined) patch.brand_voice = input.brandVoice;
    if (input.targetPageId !== undefined) patch.target_page_id = input.targetPageId;
    if (input.llmProvider !== undefined) patch.llm_provider = input.llmProvider;
    if (input.llmModel !== undefined) patch.llm_model = input.llmModel;
    if (input.status !== undefined) patch.status = input.status;

    const row = await this.updateOne<CampaignRow>("campaigns", { id: this.eq(id) }, patch, `Campaign ${id} not found`);
    return toCampaign(row);
  }

  async createSource(campaignId: string, input: CreateSourceInput): Promise<Source> {
    await this.getCampaign(campaignId);
    const row = await this.insertOne<SourceRow>("sources", {
      id: randomUUID(),
      campaign_id: campaignId,
      type: input.type,
      url: input.url,
      crawl_policy: input.crawlPolicy,
      enabled: input.enabled,
      created_at: nowIso()
    });
    return toSource(row);
  }

  async listSources(campaignId: string): Promise<Source[]> {
    const rows = await this.selectMany<SourceRow>("sources", { campaign_id: this.eq(campaignId), order: "created_at.desc" });
    return rows.map(toSource);
  }

  async getSource(id: string): Promise<Source> {
    const row = await this.selectOne<SourceRow>("sources", { id: this.eq(id) }, `Source ${id} not found`);
    return toSource(row);
  }

  async createContentItem(input: CreateContentInput): Promise<{ item: ContentItem; duplicate: boolean }> {
    try {
      const row = await this.insertOne<ContentItemRow>("content_items", {
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
    const rows = await this.selectMany<ContentItemRow>("content_items", {
      campaign_id: this.eq(campaignId),
      order: "created_at.desc"
    });
    return rows.map(toContentItem);
  }

  async getContentItem(id: string): Promise<ContentItem> {
    const row = await this.selectOne<ContentItemRow>("content_items", { id: this.eq(id) }, `Content item ${id} not found`);
    return toContentItem(row);
  }

  async hasContentHash(campaignId: string, hash: string): Promise<boolean> {
    const rows = await this.selectMany<{ id: string }>("content_items", {
      select: "id",
      campaign_id: this.eq(campaignId),
      hash: this.eq(hash),
      limit: "1"
    });
    return rows.length > 0;
  }

  async createImageAsset(input: CreateImageAssetInput): Promise<ImageAsset> {
    const row = await this.insertOne<ImageAssetRow>("image_assets", {
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
    const row = await this.selectOne<ImageAssetRow>("image_assets", { id: this.eq(id) }, `Image asset ${id} not found`);
    return toImageAsset(row);
  }

  async createDraft(input: CreateDraftInput): Promise<PostDraft> {
    const timestamp = nowIso();
    const row = await this.insertOne<PostDraftRow>("post_drafts", {
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

  async listDrafts(status?: DraftStatus): Promise<PostDraft[]> {
    const rows = await this.selectMany<PostDraftJoinedRow>("post_drafts", {
      select: DRAFT_SELECT,
      ...(status ? { status: this.eq(status) } : {}),
      order: "created_at.desc"
    });
    return rows.map(toPostDraft);
  }

  async getDraft(id: string): Promise<PostDraft> {
    const row = await this.selectOne<PostDraftJoinedRow>("post_drafts", { select: DRAFT_SELECT, id: this.eq(id) }, `Draft ${id} not found`);
    return toPostDraft(row);
  }

  async updateDraftStatus(id: string, status: DraftStatus, approvalStatus: ApprovalStatus): Promise<PostDraft> {
    await this.updateOne<PostDraftRow>(
      "post_drafts",
      { id: this.eq(id) },
      { status, approval_status: approvalStatus, updated_at: nowIso() },
      `Draft ${id} not found`
    );
    return this.getDraft(id);
  }

  async createPublishedPost(input: CreatePublishedPostInput): Promise<PublishedPost> {
    const row = await this.insertOne<PublishedPostRow>("published_posts", {
      id: randomUUID(),
      post_draft_id: input.postDraftId,
      facebook_page_id: input.facebookPageId,
      facebook_post_id: input.facebookPostId ?? null,
      status: input.status,
      publish_payload: input.publishPayload,
      error_message: input.errorMessage ?? null,
      published_at: input.publishedAt ?? null,
      created_at: nowIso()
    });
    return toPublishedPost(row);
  }

  async listPublishedPosts(): Promise<PublishedPost[]> {
    const rows = await this.selectMany<PublishedPostRow>("published_posts", { order: "created_at.desc" });
    return rows.map(toPublishedPost);
  }

  async addAgentRun(input: CreateAgentRunInput): Promise<AgentRun> {
    const row = await this.insertOne<AgentRunRow>("agent_runs", {
      id: randomUUID(),
      campaign_id: input.campaignId,
      graph_run_id: input.graphRunId,
      node_name: input.nodeName,
      input_json: input.inputJson,
      output_json: input.outputJson,
      status: input.status,
      error_message: input.errorMessage ?? null,
      created_at: nowIso()
    });
    return toAgentRun(row);
  }

  async listAgentRuns(campaignId?: string): Promise<AgentRun[]> {
    const rows = await this.selectMany<AgentRunRow>("agent_runs", {
      ...(campaignId ? { campaign_id: this.eq(campaignId) } : {}),
      order: "created_at.asc"
    });
    return rows.map(toAgentRun);
  }

  private async findContentByCampaignHash(campaignId: string, hash: string): Promise<ContentItem | undefined> {
    const rows = await this.selectMany<ContentItemRow>("content_items", {
      campaign_id: this.eq(campaignId),
      hash: this.eq(hash),
      limit: "1"
    });
    const row = rows[0];
    return row ? toContentItem(row) : undefined;
  }

  private async selectMany<Row>(table: string, params: Record<string, string | undefined> = {}): Promise<Row[]> {
    return this.request<Row[]>(this.path(table, { select: "*", ...params }));
  }

  private async selectOne<Row>(table: string, params: Record<string, string | undefined>, notFoundMessage: string): Promise<Row> {
    const rows = await this.selectMany<Row>(table, { ...params, limit: "1" });
    const row = rows[0];
    if (!row) throw new NotFoundException(notFoundMessage);
    return row;
  }

  private async insertOne<Row>(table: string, body: Record<string, unknown>, select = "*"): Promise<Row> {
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

  private async updateOne<Row>(
    table: string,
    filters: Record<string, string>,
    body: Record<string, unknown>,
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

function toCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    topic: row.topic,
    language: row.language,
    brandVoice: row.brand_voice,
    targetPageId: row.target_page_id,
    llmProvider: row.llm_provider,
    llmModel: row.llm_model,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toSource(row: SourceRow): Source {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    type: row.type,
    url: row.url,
    crawlPolicy: row.crawl_policy,
    enabled: row.enabled,
    createdAt: row.created_at
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
    imageUrls: row.image_urls,
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
    status: row.status,
    riskScore: row.risk_score,
    riskFlags: row.risk_flags,
    approvalStatus: row.approval_status,
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
    status: row.status,
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
    status: row.status,
    ...(row.error_message ? { errorMessage: row.error_message } : {}),
    createdAt: row.created_at
  };
}
