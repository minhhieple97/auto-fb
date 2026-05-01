const QUERY_KEY_SCOPE_ALL = "all";

export const queryKeys = {
  agentRuns: (campaignId?: string) => (campaignId ? (["agent-runs", campaignId] as const) : (["agent-runs"] as const)),
  agentRunsRoot: ["agent-runs"] as const,
  agentWorkflowRuns: (campaignId?: string) => ["agent-workflow-runs", campaignId ?? QUERY_KEY_SCOPE_ALL] as const,
  agentWorkflowRunsRoot: ["agent-workflow-runs"] as const,
  campaigns: ["campaigns"] as const,
  drafts: (fanpageId?: string) => ["drafts", fanpageId ?? QUERY_KEY_SCOPE_ALL] as const,
  draftsRoot: ["drafts"] as const,
  fanpages: ["fanpages"] as const,
  publishedPosts: (fanpageId?: string) => ["published-posts", fanpageId ?? QUERY_KEY_SCOPE_ALL] as const,
  publishedPostsRoot: ["published-posts"] as const,
  sources: (campaignId?: string) => (campaignId ? (["sources", campaignId] as const) : (["sources"] as const)),
  sourcesRoot: ["sources"] as const
};
