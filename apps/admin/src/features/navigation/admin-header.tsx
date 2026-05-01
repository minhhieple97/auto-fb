import { Bot, LayoutDashboard, LogOut, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../app/auth-provider.js";
import { invalidateRouteData } from "../../app/query-invalidation.js";
import { adminRoutes } from "../../app/routes.js";

export function AdminHeader() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { signOut, user } = useAuth();

  const refreshRoute = () => invalidateRouteData(queryClient, location.pathname);

  const logout = async () => {
    await signOut();
    queryClient.clear();
  };

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal text-ink">Auto FB Admin</h1>
          <p className="text-sm text-slate-600">Multi-agent publishing workflow</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <nav className="flex rounded-md border border-line bg-slate-50 p-1" aria-label="Admin navigation">
            <NavButton to={adminRoutes.dashboard} end icon={<LayoutDashboard size={16} />}>
              Dashboard
            </NavButton>
            <NavButton to={adminRoutes.agentRuns} icon={<Bot size={16} />}>
              Agent runs
            </NavButton>
          </nav>
          {user?.email ? <span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span> : null}
          <button className="button border border-line bg-white text-ink" onClick={refreshRoute} title="Refresh">
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="button border border-line bg-white text-ink" onClick={logout} title="Sign out">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function NavButton({
  children,
  end = false,
  icon,
  to
}: {
  children: string;
  end?: boolean;
  icon: ReactNode;
  to: string;
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        `inline-flex min-h-9 items-center gap-2 rounded px-3 text-sm font-semibold ${
          isActive ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-ink"
        }`
      }
      end={end}
      to={to}
    >
      {icon}
      {children}
    </NavLink>
  );
}
