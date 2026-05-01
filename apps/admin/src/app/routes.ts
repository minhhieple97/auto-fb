export const adminRoutes = {
  agentRuns: "/agent-runs",
  dashboard: "/"
} as const;

export type AdminRoutePath = (typeof adminRoutes)[keyof typeof adminRoutes];
