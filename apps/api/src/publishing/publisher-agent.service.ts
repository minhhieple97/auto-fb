import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PostDraft, PublishedPost, PublishOptions } from "@auto-fb/shared";
import { InMemoryDatabase } from "../persistence/in-memory.database.js";

type PublishPayload = {
  pageId: string;
  message: string;
  imageUrl?: string;
  campaignId: string;
  draftId: string;
};

@Injectable()
export class PublisherAgentService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(InMemoryDatabase) private readonly db: InMemoryDatabase
  ) {}

  async publishDraft(draftId: string, options: PublishOptions = {}): Promise<PublishedPost> {
    const draft = this.db.getDraft(draftId);
    if (draft.approvalStatus !== "APPROVED") {
      throw new BadRequestException("Draft must be approved before publish");
    }

    const campaign = this.db.getCampaign(draft.campaignId);
    const payload: PublishPayload = {
      pageId: campaign.targetPageId,
      message: draft.text,
      campaignId: campaign.id,
      draftId: draft.id,
      ...(draft.imageAsset?.publicUrl ? { imageUrl: draft.imageAsset.publicUrl } : {})
    };

    const dryRun = options.dryRun ?? this.config.get<string>("PUBLISH_DRY_RUN", "true") !== "false";

    try {
      const facebookPostId = dryRun ? `dry_run_${draft.id}` : await this.publishToMeta(payload, draft);
      const post = this.db.createPublishedPost({
        postDraftId: draft.id,
        facebookPageId: campaign.targetPageId,
        facebookPostId,
        status: dryRun ? "DRY_RUN_PUBLISHED" : "PUBLISHED",
        publishPayload: payload,
        publishedAt: new Date().toISOString()
      });
      this.db.updateDraftStatus(draft.id, "PUBLISHED", "APPROVED");
      return post;
    } catch (error) {
      return this.db.createPublishedPost({
        postDraftId: draft.id,
        facebookPageId: campaign.targetPageId,
        status: "FAILED",
        publishPayload: payload,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async publishToMeta(payload: PublishPayload, draft: PostDraft): Promise<string> {
    const token = this.config.get<string>("META_PAGE_ACCESS_TOKEN");
    if (!token) throw new Error("Missing META_PAGE_ACCESS_TOKEN");
    if (!payload.pageId) throw new Error("Missing campaign target Page ID");
    if (draft.imageAssetId && !payload.imageUrl) throw new Error("Image draft requires R2_PUBLIC_BASE_URL");

    const version = this.config.get<string>("META_GRAPH_API_VERSION", "v20.0");
    const endpoint = payload.imageUrl
      ? `https://graph.facebook.com/${version}/${payload.pageId}/photos`
      : `https://graph.facebook.com/${version}/${payload.pageId}/feed`;
    const body = new URLSearchParams();
    body.set("access_token", token);
    if (payload.imageUrl) {
      body.set("url", payload.imageUrl);
      body.set("caption", payload.message);
    } else {
      body.set("message", payload.message);
    }

    const response = await fetch(endpoint, { method: "POST", body });
    const result = (await response.json()) as { id?: string; post_id?: string; error?: { message?: string } };
    if (!response.ok) {
      throw new Error(result.error?.message ?? `Meta Graph API returned ${response.status}`);
    }
    return result.post_id ?? result.id ?? "";
  }
}
