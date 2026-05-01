import { useEffect, useState } from "react";
import { DashboardPage } from "./features/dashboard/dashboard-page.js";
import { AuthProvider } from "./app/auth-provider.js";
import { AuthGate } from "./features/auth/auth-gate.js";
import { AgentRunsPage } from "./features/agent-runs/agent-runs-page.js";
import type { AdminRoute } from "./features/navigation/admin-header.js";

function currentRoute(): AdminRoute {
  return window.location.pathname === "/agent-runs" ? "/agent-runs" : "/";
}

export function App() {
  const [route, setRoute] = useState<AdminRoute>(currentRoute);

  useEffect(() => {
    const onPopState = () => setRoute(currentRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextRoute: AdminRoute) => {
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
  };

  return (
    <AuthProvider>
      <AuthGate>
        {route === "/agent-runs" ? <AgentRunsPage onNavigate={navigate} /> : <DashboardPage onNavigate={navigate} />}
      </AuthGate>
    </AuthProvider>
  );
}
