import { apiPathSegments, draftStatuses } from "@auto-fb/shared";

export const defaultApiBaseUrl = "http://localhost:3000";

export const apiEndpoints = {
  agentRuns: `/${apiPathSegments.agentRuns}`,
  agentWorkflowRuns: `/${apiPathSegments.agentWorkflowRuns}`,
  agentWorkflowRunsStream: `/${apiPathSegments.agentWorkflowRuns}/${apiPathSegments.stream}`,
  authMe: `/${apiPathSegments.auth}/${apiPathSegments.me}`,
  campaign: (id: string) => `/${apiPathSegments.campaigns}/${id}`,
  campaignAgentSearch: (campaignId: string) =>
    `/${apiPathSegments.campaigns}/${campaignId}/${apiPathSegments.agentSearch}/${apiPathSegments.search}`,
  campaignAgentSearchGenerate: (campaignId: string) =>
    `/${apiPathSegments.campaigns}/${campaignId}/${apiPathSegments.agentSearch}/${apiPathSegments.generate}`,
  campaignRuns: (campaignId: string) => `/${apiPathSegments.campaigns}/${campaignId}/${apiPathSegments.runs}`,
  campaignSources: (campaignId: string) => `/${apiPathSegments.campaigns}/${campaignId}/${apiPathSegments.sources}`,
  campaigns: `/${apiPathSegments.campaigns}`,
  draftApprove: (id: string) => `/${apiPathSegments.drafts}/${id}/${apiPathSegments.approve}`,
  draftReject: (id: string) => `/${apiPathSegments.drafts}/${id}/${apiPathSegments.reject}`,
  drafts: (status = draftStatuses.pendingApproval, fanpageId?: string) => `/${apiPathSegments.drafts}${queryString({ status, fanpageId })}`,
  fanpage: (id: string) => `/${apiPathSegments.fanpages}/${id}`,
  fanpageRuns: (id: string) => `/${apiPathSegments.fanpages}/${id}/${apiPathSegments.runs}`,
  fanpageSchedule: (id: string) => `/${apiPathSegments.fanpages}/${id}/${apiPathSegments.schedule}`,
  fanpageSources: (id: string) => `/${apiPathSegments.fanpages}/${id}/${apiPathSegments.sources}`,
  fanpageTestConnection: (id: string) => `/${apiPathSegments.fanpages}/${id}/${apiPathSegments.testConnection}`,
  fanpageToken: (id: string) => `/${apiPathSegments.fanpages}/${id}/${apiPathSegments.token}`,
  fanpages: `/${apiPathSegments.fanpages}`,
  publishedPosts: (fanpageId?: string) => `/${apiPathSegments.publishedPosts}${queryString({ fanpageId })}`
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
