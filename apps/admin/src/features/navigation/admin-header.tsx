import { Bot, LayoutDashboard, LogOut, RefreshCw, Sparkles, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../app/auth-provider.js";
import { invalidateRouteData } from "../../app/query-invalidation.js";
import { adminRoutes } from "../../app/routes.js";
import { Button } from "../../components/ui/button.js";
import { Badge } from "../../components/ui/badge.js";

export function AdminHeader() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { profile, signOut, user } = useAuth();

  const refreshRoute = () => invalidateRouteData(queryClient, location.pathname);

  const logout = async () => {
    await signOut();
    queryClient.clear();
  };

  const email = profile?.email ?? user?.email;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Sparkles size={18} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900">Auto FB</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium text-slate-600 border-slate-200">Admin</Badge>
              </div>
            </div>
          </div>
          
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          
          <nav className="hidden sm:flex items-center gap-1" aria-label="Admin navigation">
            <NavButton to={adminRoutes.dashboard} end icon={<LayoutDashboard size={16} />}>
              Dashboard
            </NavButton>
            <NavButton to={adminRoutes.agentRuns} icon={<Bot size={16} />}>
              Agent Runs
            </NavButton>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={refreshRoute} title="Refresh Data" className="h-9 gap-1.5 hidden sm:flex text-slate-600 border-slate-200">
            <RefreshCw size={14} />
            <span className="text-xs font-medium">Refresh</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

          <div className="flex items-center gap-3 pl-1">
            {email ? (
              <div className="hidden sm:flex items-center gap-2 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-900">{email.split('@')[0]}</span>
                  {profile?.role ? (
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{profile.role}</span>
                  ) : null}
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                  <User size={16} />
                </div>
              </div>
            ) : null}
            
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation row */}
      <div className="border-t border-slate-100 p-2 sm:hidden flex justify-center gap-2 bg-slate-50">
        <NavButton to={adminRoutes.dashboard} end icon={<LayoutDashboard size={14} />}>
          Dashboard
        </NavButton>
        <NavButton to={adminRoutes.agentRuns} icon={<Bot size={14} />}>
          Agent Runs
        </NavButton>
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
        `inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
          isActive 
            ? "bg-slate-100 text-slate-900 shadow-sm border border-slate-200" 
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
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
