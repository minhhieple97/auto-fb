import type { ReactNode } from "react";
import { LoaderCircle, LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "../../app/auth-provider.js";
import { Button } from "../../components/ui/button.js";
import { missingSupabaseEnv } from "../../lib/supabase.js";
import { LoginPage } from "./login-page.js";

export function AuthGate({ children }: { children: ReactNode }) {
  const { error, signOut, status, user } = useAuth();

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <LoaderCircle className="animate-spin" size={18} />
          Loading session
        </div>
      </main>
    );
  }

  if (status === "unconfigured") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
        <section className="panel w-full max-w-lg p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-red-50 text-red-700">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-ink">Supabase auth is not configured</h1>
              <p className="text-sm text-slate-600">Set the required Vite environment values before opening admin.</p>
            </div>
          </div>
          <div className="whitespace-pre-line rounded-md border border-line bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
            {missingSupabaseEnv.join("\n")}
          </div>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  if (status === "blocked") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
        <section className="panel w-full max-w-lg p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-ink">Access not granted</h1>
              <p className="text-sm text-slate-600">{user?.email ?? "This Supabase account"} is not an active Auto FB admin.</p>
            </div>
          </div>
          {error ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
              {error}
            </div>
          ) : null}
          <Button className="border border-line bg-white text-ink" onClick={() => void signOut()} title="Sign out" type="button">
            <LogOut size={16} />
            Sign out
          </Button>
        </section>
      </main>
    );
  }

  return children;
}
