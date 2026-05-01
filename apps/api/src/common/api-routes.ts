import { apiPathSegments } from "@auto-fb/shared";

export const apiRoutes = {
  agentRuns: apiPathSegments.agentRuns,
  agentWorkflowRuns: apiPathSegments.agentWorkflowRuns,
  agentWorkflowRunsStream: `${apiPathSegments.agentWorkflowRuns}/${apiPathSegments.stream}`,
  authMe: `${apiPathSegments.auth}/${apiPathSegments.me}`,
  campaignAgentSearch: `${apiPathSegments.campaigns}/:campaignId/${apiPathSegments.agentSearch}/${apiPathSegments.search}`,
  campaignAgentSearchGenerate: `${apiPathSegments.campaigns}/:campaignId/${apiPathSegments.agentSearch}/${apiPathSegments.generate}`,
  campaignRuns: `${apiPathSegments.campaigns}/:campaignId/${apiPathSegments.runs}`,
  campaignSources: `${apiPathSegments.campaigns}/:campaignId/${apiPathSegments.sources}`,
  campaigns: apiPathSegments.campaigns,
  drafts: apiPathSegments.drafts,
  draftApprove: `:id/${apiPathSegments.approve}`,
  draftReject: `:id/${apiPathSegments.reject}`,
  fanpages: apiPathSegments.fanpages,
  fanpageRuns: `:id/${apiPathSegments.runs}`,
  fanpageSchedule: `:id/${apiPathSegments.schedule}`,
  fanpageCurlSource: `:id/${apiPathSegments.curlSource}`,
  fanpageSources: `:id/${apiPathSegments.sources}`,
  fanpageSearchSources: `:id/${apiPathSegments.searchSources}`,
  fanpageSearchSourcesAdd: `:id/${apiPathSegments.searchSourcesAdd}`,
  fanpageTestConnection: `:id/${apiPathSegments.testConnection}`,
  fanpageToken: `:id/${apiPathSegments.token}`,
  publishedPosts: apiPathSegments.publishedPosts,
  publishDraft: `${apiPathSegments.drafts}/:id/${apiPathSegments.publish}`
} as const;
