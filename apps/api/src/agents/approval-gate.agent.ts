import { Inject, Injectable } from "@nestjs/common";
import type { Campaign, ImageAsset, PostDraft } from "@auto-fb/shared";
import { InMemoryDatabase } from "../persistence/in-memory.database.js";
import type { QaResult, UnderstoodContent } from "./agent.types.js";

@Injectable()
export class ApprovalGateAgent {
  constructor(@Inject(InMemoryDatabase) private readonly db: InMemoryDatabase) {}

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
      status: "PENDING_APPROVAL",
      riskScore: input.qa.riskScore,
      riskFlags: input.qa.riskFlags,
      approvalStatus: "PENDING"
    });
  }
}
