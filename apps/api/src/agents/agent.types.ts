import type { Campaign, ContentItem, ImageAsset, PostDraft, Source } from "@auto-fb/shared";
import type { RawContentItem } from "../collector/content-source.types.js";

export type UnderstoodContent = {
  item: ContentItem;
  duplicate: boolean;
  summary: string;
  keyFacts: string[];
};

export type QaResult = {
  riskScore: number;
  riskFlags: string[];
  approvedForHumanReview: boolean;
};

export type WorkflowState = {
  campaignId: string;
  graphRunId: string;
  campaign: Campaign | undefined;
  sources: Source[] | undefined;
  rawItems: RawContentItem[] | undefined;
  understood: UnderstoodContent | undefined;
  draftText: string | undefined;
  imageAsset: ImageAsset | undefined;
  qa: QaResult | undefined;
  draft: PostDraft | undefined;
};
