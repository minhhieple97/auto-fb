import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys.js";
import { adminRoutes } from "./routes.js";

export async function invalidateDashboardData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns }),
    queryClient.invalidateQueries({ queryKey: queryKeys.sourcesRoot }),
    queryClient.invalidateQueries({ queryKey: queryKeys.drafts }),
    queryClient.invalidateQueries({ queryKey: queryKeys.agentRunsRoot }),
    queryClient.invalidateQueries({ queryKey: queryKeys.publishedPosts })
  ]);
}

export async function invalidateAgentRunsData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns }),
    queryClient.invalidateQueries({ queryKey: queryKeys.agentWorkflowRunsRoot }),
    queryClient.invalidateQueries({ queryKey: queryKeys.agentRunsRoot }),
    queryClient.invalidateQueries({ queryKey: queryKeys.drafts })
  ]);
}

export function invalidateRouteData(queryClient: QueryClient, pathname: string) {
  if (pathname.startsWith(adminRoutes.agentRuns)) {
    return invalidateAgentRunsData(queryClient);
  }

  return invalidateDashboardData(queryClient);
}
