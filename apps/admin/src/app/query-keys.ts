const QUERY_KEY_SCOPE_ALL = "all";

export const queryKeys = {
  agentRuns: (campaignId?: string) => (campaignId ? (["agent-runs", campaignId] as const) : (["agent-runs"] as const)),
  agentRunsRoot: ["agent-runs"] as const,
  agentWorkflowRuns: (campaignId?: string) => ["agent-workflow-runs", campaignId ?? QUERY_KEY_SCOPE_ALL] as const,
  agentWorkflowRunsRoot: ["agent-workflow-runs"] as const,
  campaigns: ["campaigns"] as const,
  drafts: ["drafts"] as const,
  publishedPosts: ["published-posts"] as const,
  sources: (campaignId?: string) => (campaignId ? (["sources", campaignId] as const) : (["sources"] as const)),
  sourcesRoot: ["sources"] as const
};
