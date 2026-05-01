import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../app/auth-provider.js";
import { Button } from "../../components/ui/button.js";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form.js";
import { Input } from "../../components/ui/input.js";

const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().trim().min(1, "Password is required.")
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginPage() {
  const { error, signIn } = useAuth();
  const [localError, setLocalError] = useState<string | undefined>();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const isSubmitting = form.formState.isSubmitting;

  async function submit(values: LoginFormValues) {
    setLocalError(undefined);

    try {
      await signIn(values);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Unable to sign in");
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

        <Form {...form}>
          <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(submit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input autoComplete="email" disabled={isSubmitting} type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input autoComplete="current-password" disabled={isSubmitting} type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(localError ?? error) ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {localError ?? error}
              </div>
            ) : null}

            <Button disabled={isSubmitting} title="Sign in" type="submit">
              <LogIn size={16} />
              {isSubmitting ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </Form>
      </section>
    </main>
  );
}
