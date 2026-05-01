export const qaRiskFlags = {
  duplicateContent: "duplicate_content",
  imageNotPrepared: "image_not_prepared",
  missingSourceAttribution: "missing_source_attribution",
  postTooLong: "post_too_long",
  sensitiveOrUnverifiedClaim: "sensitive_or_unverified_claim"
} as const;

export const qaPolicy = {
  maxDraftCharacters: 3000,
  riskScorePerFlag: 25,
  sensitiveClaimPattern: /\b(guaranteed|cam ket|100%|chua khoi|dieu tri)\b/i
} as const;
