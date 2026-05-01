import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./features/dashboard/dashboard-page.js";
import { AuthProvider } from "./app/auth-provider.js";
import { adminRoutes } from "./app/routes.js";
import { AuthGate } from "./features/auth/auth-gate.js";
import { AgentRunsPage } from "./features/agent-runs/agent-runs-page.js";
import { AdminLayout } from "./features/navigation/admin-layout.js";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path={adminRoutes.agentRuns.slice(1)} element={<AgentRunsPage />} />
              <Route path="*" element={<Navigate replace to={adminRoutes.dashboard} />} />
            </Route>
          </Routes>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  );
}
