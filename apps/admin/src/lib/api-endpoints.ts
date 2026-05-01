import { apiPathSegments, draftStatuses } from "@auto-fb/shared";

export const defaultApiBaseUrl = "http://localhost:3000";

export const apiEndpoints = {
  agentRuns: `/${apiPathSegments.agentRuns}`,
  agentWorkflowRuns: `/${apiPathSegments.agentWorkflowRuns}`,
  agentWorkflowRunsStream: `/${apiPathSegments.agentWorkflowRuns}/${apiPathSegments.stream}`,
  authMe: `/${apiPathSegments.auth}/${apiPathSegments.me}`,
  campaign: (id: string) => `/${apiPathSegments.campaigns}/${id}`,
  campaignRuns: (campaignId: string) => `/${apiPathSegments.campaigns}/${campaignId}/${apiPathSegments.runs}`,
  campaignSources: (campaignId: string) => `/${apiPathSegments.campaigns}/${campaignId}/${apiPathSegments.sources}`,
  campaigns: `/${apiPathSegments.campaigns}`,
  draftApprove: (id: string) => `/${apiPathSegments.drafts}/${id}/${apiPathSegments.approve}`,
  draftReject: (id: string) => `/${apiPathSegments.drafts}/${id}/${apiPathSegments.reject}`,
  drafts: (status = draftStatuses.pendingApproval) => `/${apiPathSegments.drafts}${queryString({ status })}`,
  publishedPosts: `/${apiPathSegments.publishedPosts}`
} as const;

export function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
