import { apiPathSegments } from "@auto-fb/shared";

export const apiRoutes = {
  agentRuns: apiPathSegments.agentRuns,
  agentWorkflowRuns: apiPathSegments.agentWorkflowRuns,
  agentWorkflowRunsStream: `${apiPathSegments.agentWorkflowRuns}/${apiPathSegments.stream}`,
  authMe: `${apiPathSegments.auth}/${apiPathSegments.me}`,
  campaignRuns: `${apiPathSegments.campaigns}/:campaignId/${apiPathSegments.runs}`,
  campaignSources: `${apiPathSegments.campaigns}/:campaignId/${apiPathSegments.sources}`,
  campaigns: apiPathSegments.campaigns,
  drafts: apiPathSegments.drafts,
  draftApprove: `:id/${apiPathSegments.approve}`,
  draftReject: `:id/${apiPathSegments.reject}`,
  publishedPosts: apiPathSegments.publishedPosts,
  publishDraft: `${apiPathSegments.drafts}/:id/${apiPathSegments.publish}`
} as const;
