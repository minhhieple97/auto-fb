import type { QueryClient } from "@tanstack/react-query";

export async function invalidateDashboardData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
    queryClient.invalidateQueries({ queryKey: ["sources"] }),
    queryClient.invalidateQueries({ queryKey: ["drafts"] }),
    queryClient.invalidateQueries({ queryKey: ["agent-runs"] }),
    queryClient.invalidateQueries({ queryKey: ["published-posts"] })
  ]);
}

export async function invalidateAgentRunsData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
    queryClient.invalidateQueries({ queryKey: ["agent-workflow-runs"] }),
    queryClient.invalidateQueries({ queryKey: ["agent-runs"] }),
    queryClient.invalidateQueries({ queryKey: ["drafts"] })
  ]);
}

export function invalidateRouteData(queryClient: QueryClient, pathname: string) {
  if (pathname.startsWith("/agent-runs")) {
    return invalidateAgentRunsData(queryClient);
  }

  return invalidateDashboardData(queryClient);
}
