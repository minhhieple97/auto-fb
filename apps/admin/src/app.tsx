import { DashboardPage } from "./features/dashboard/dashboard-page.js";
import { AuthProvider } from "./app/auth-provider.js";
import { AuthGate } from "./features/auth/auth-gate.js";

export function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <DashboardPage />
      </AuthGate>
    </AuthProvider>
  );
}
