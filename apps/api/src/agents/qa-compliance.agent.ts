import { Injectable } from "@nestjs/common";
import type { ImageAsset } from "@auto-fb/shared";
import type { QaResult, UnderstoodContent } from "./agent.types.js";

@Injectable()
export class QaComplianceAgent {
  async check(input: { understood: UnderstoodContent; draftText: string; imageAsset?: ImageAsset }): Promise<QaResult> {
    const riskFlags = new Set<string>();

    if (input.understood.duplicate) riskFlags.add("duplicate_content");
    if (!input.draftText.includes(input.understood.item.sourceUrl)) riskFlags.add("missing_source_attribution");
    if (input.draftText.length > 3000) riskFlags.add("post_too_long");
    if (input.understood.item.imageUrls.length > 0 && !input.imageAsset) riskFlags.add("image_not_prepared");
    if (/\b(guaranteed|cam ket|100%|chua khoi|dieu tri)\b/i.test(input.draftText)) riskFlags.add("sensitive_or_unverified_claim");

    const flags = [...riskFlags];
    return {
      riskFlags: flags,
      riskScore: Math.min(100, flags.length * 25),
      approvedForHumanReview: !flags.includes("duplicate_content") && !flags.includes("sensitive_or_unverified_claim")
    };
  }
}
