import { Bot, LayoutDashboard, LogOut, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "../../app/auth-provider.js";

export type AdminRoute = "/" | "/agent-runs";

type AdminHeaderProps = {
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onRefresh: () => Promise<void> | void;
};

export function AdminHeader({ activeRoute, onNavigate, onRefresh }: AdminHeaderProps) {
  const queryClient = useQueryClient();
  const { signOut, user } = useAuth();

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
            <NavButton route="/" activeRoute={activeRoute} onNavigate={onNavigate} icon={<LayoutDashboard size={16} />}>
              Dashboard
            </NavButton>
            <NavButton route="/agent-runs" activeRoute={activeRoute} onNavigate={onNavigate} icon={<Bot size={16} />}>
              Agent runs
            </NavButton>
          </nav>
          {user?.email ? <span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span> : null}
          <button className="button border border-line bg-white text-ink" onClick={onRefresh} title="Refresh">
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
  activeRoute,
  children,
  icon,
  onNavigate,
  route
}: {
  activeRoute: AdminRoute;
  children: string;
  icon: ReactNode;
  onNavigate: (route: AdminRoute) => void;
  route: AdminRoute;
}) {
  const active = activeRoute === route;
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-9 items-center gap-2 rounded px-3 text-sm font-semibold ${
        active ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-ink"
      }`}
      href={route}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(route);
      }}
    >
      {icon}
      {children}
    </a>
  );
}
