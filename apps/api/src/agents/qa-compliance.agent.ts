import { Injectable } from "@nestjs/common";
import { postDraftRiskScoreLimits } from "@auto-fb/shared";
import type { ImageAsset } from "@auto-fb/shared";
import { qaPolicy, qaRiskFlags } from "./qa.constants.js";
import type { QaResult, UnderstoodContent } from "./agent.types.js";

@Injectable()
export class QaComplianceAgent {
  async check(input: { understood: UnderstoodContent; draftText: string; imageAsset?: ImageAsset }): Promise<QaResult> {
    const riskFlags = new Set<string>();

    if (input.understood.duplicate) riskFlags.add(qaRiskFlags.duplicateContent);
    if (!input.draftText.includes(input.understood.item.sourceUrl)) riskFlags.add(qaRiskFlags.missingSourceAttribution);
    if (input.draftText.length > qaPolicy.maxDraftCharacters) riskFlags.add(qaRiskFlags.postTooLong);
    if (input.understood.item.imageUrls.length > 0 && !input.imageAsset) riskFlags.add(qaRiskFlags.imageNotPrepared);
    if (qaPolicy.sensitiveClaimPattern.test(input.draftText)) riskFlags.add(qaRiskFlags.sensitiveOrUnverifiedClaim);

    const flags = [...riskFlags];
    return {
      riskFlags: flags,
      riskScore: Math.min(postDraftRiskScoreLimits.max, flags.length * qaPolicy.riskScorePerFlag),
      approvedForHumanReview: !flags.includes(qaRiskFlags.duplicateContent) && !flags.includes(qaRiskFlags.sensitiveOrUnverifiedClaim)
    };
  }
}
