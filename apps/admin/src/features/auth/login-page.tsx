import { FormEvent, useState } from "react";
import { KeyRound, LogIn } from "lucide-react";
import { useAuth } from "../../app/auth-provider.js";
import { stringField } from "../../lib/form.js";

export function LoginPage() {
  const { error, signIn } = useAuth();
  const [localError, setLocalError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(undefined);
    setIsSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      await signIn({
        email: stringField(form, "email"),
        password: stringField(form, "password")
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <section className="panel w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-ink text-white">
            <KeyRound size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Sign in</h1>
            <p className="text-sm text-slate-600">Auto FB Admin</p>
          </div>
        </div>

        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Email
            <input className="field" name="email" type="email" autoComplete="email" required disabled={isSubmitting} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Password
            <input className="field" name="password" type="password" autoComplete="current-password" required disabled={isSubmitting} />
          </label>

          {(localError ?? error) ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {localError ?? error}
            </div>
          ) : null}

          <button className="button bg-ink text-white" disabled={isSubmitting} title="Sign in">
            <LogIn size={16} />
            {isSubmitting ? "Signing in" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
