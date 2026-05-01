import { Inject, Injectable } from "@nestjs/common";
import { approvalStatuses, draftStatuses, type Campaign, type ImageAsset, type PostDraft } from "@auto-fb/shared";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import type { QaResult, UnderstoodContent } from "./agent.types.js";

@Injectable()
export class ApprovalGateAgent {
  constructor(@Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository) {}

  async save(input: {
    campaign: Campaign;
    understood: UnderstoodContent;
    draftText: string;
    qa: QaResult;
    imageAsset?: ImageAsset;
  }): Promise<PostDraft> {
    return this.db.createDraft({
      campaignId: input.campaign.id,
      contentItemId: input.understood.item.id,
      ...(input.imageAsset ? { imageAssetId: input.imageAsset.id } : {}),
      text: input.draftText,
      status: draftStatuses.pendingApproval,
      riskScore: input.qa.riskScore,
      riskFlags: input.qa.riskFlags,
      approvalStatus: approvalStatuses.pending
    });
  }
}
