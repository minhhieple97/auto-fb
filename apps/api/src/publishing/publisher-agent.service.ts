import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { approvalStatuses, draftStatuses, publishStatuses, type PostDraft, type PublishedPost, type PublishOptions } from "@auto-fb/shared";
import { appDefaults, envKeys } from "../common/app.constants.js";
import { PageTokenCryptoService } from "../fanpages/page-token-crypto.service.js";
import { DATABASE_REPOSITORY, type DatabaseRepository, type FanpageTokenRecord } from "../persistence/database.repository.js";
import { publishingDefaults } from "./publishing.constants.js";

type PublishPayload = {
  pageId: string;
  message: string;
  imageUrl?: string;
  campaignId: string;
  draftId: string;
  fanpageId?: string;
  fanpageEnvironment?: string;
};

@Injectable()
export class PublisherAgentService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository,
    @Inject(PageTokenCryptoService) private readonly tokenCrypto: PageTokenCryptoService
  ) {}

  async publishDraft(draftId: string, options: PublishOptions = {}): Promise<PublishedPost> {
    const draft = await this.db.getDraft(draftId);
    if (draft.approvalStatus !== approvalStatuses.approved) {
      throw new BadRequestException("Draft must be approved before publish");
    }

    const campaign = await this.db.getCampaign(draft.campaignId);
    const fanpageRecord = await this.db.getFanpageTokenRecordByCampaignId(campaign.id);
    const fanpage = fanpageRecord?.fanpage;
    const pageId = fanpage?.facebookPageId ?? campaign.targetPageId;
    const payload: PublishPayload = {
      pageId,
      message: draft.text,
      campaignId: campaign.id,
      draftId: draft.id,
      ...(fanpage ? { fanpageId: fanpage.id, fanpageEnvironment: fanpage.environment } : {}),
      ...(draft.imageAsset?.publicUrl ? { imageUrl: draft.imageAsset.publicUrl } : {})
    };

    const dryRun = options.dryRun ?? this.config.get<string>(envKeys.publishDryRun, appDefaults.publishDryRun) !== "false";
    if (!dryRun && fanpage?.environment === "production" && options.confirmProduction !== true) {
      throw new BadRequestException("Production fanpage publishing requires confirmation");
    }

    try {
      const facebookPostId = dryRun
        ? `${publishingDefaults.dryRunPostIdPrefix}${draft.id}`
        : await this.publishToMeta(payload, draft, this.resolvePageToken(fanpageRecord));
      const post = await this.db.createPublishedPost({
        postDraftId: draft.id,
        facebookPageId: pageId,
        facebookPostId,
        status: dryRun ? publishStatuses.dryRunPublished : publishStatuses.published,
        publishPayload: payload,
        publishedAt: new Date().toISOString()
      });
      await this.db.updateDraftStatus(draft.id, draftStatuses.published, approvalStatuses.approved);
      return post;
    } catch (error) {
      return this.db.createPublishedPost({
        postDraftId: draft.id,
        facebookPageId: pageId,
        status: publishStatuses.failed,
        publishPayload: payload,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private resolvePageToken(fanpageRecord: FanpageTokenRecord | undefined): string {
    if (fanpageRecord) {
      if (!fanpageRecord.encryptedPageAccessToken) {
        throw new Error(`Missing Page Access Token for fanpage ${fanpageRecord.fanpage.id}`);
      }
      return this.tokenCrypto.decrypt(fanpageRecord.encryptedPageAccessToken);
    }
    const legacyToken = this.config.get<string>(envKeys.metaPageAccessToken);
    if (!legacyToken) throw new Error(`Missing ${envKeys.metaPageAccessToken}`);
    return legacyToken;
  }

  private async publishToMeta(payload: PublishPayload, draft: PostDraft, token: string): Promise<string> {
    if (!payload.pageId) throw new Error("Missing campaign target Page ID");
    if (draft.imageAssetId && !payload.imageUrl) throw new Error(`Image draft requires ${envKeys.r2PublicBaseUrl}`);

    const version = this.config.get<string>(envKeys.metaGraphApiVersion, appDefaults.metaGraphApiVersion);
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
