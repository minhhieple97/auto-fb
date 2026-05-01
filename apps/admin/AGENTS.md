# AGENTS.md

This package is the React/Vite dashboard for campaigns, sources, workflow runs, approval inbox, and published history.

- Use the existing Tailwind utility style and compact operational dashboard layout.
- Routing uses `react-router-dom` in `src/app.tsx` with shared navigation/layout in `src/features/navigation`. Keep `/` and `/agent-runs` deep links working with `apps/admin/vercel.json`.
- Prefer focused Testing Library unit tests for user-visible behavior and API side effects.
- Mock `apps/admin/src/lib/api-client.ts` in component tests instead of requiring the backend.
- Keep React Query tests wrapped in a test `QueryClientProvider` with retries disabled.
- Use `src/app/query-invalidation.ts` for cross-route refresh behavior instead of duplicating query invalidation lists in feature panels.
- Use `apps/admin/src/app/auth-provider.tsx` and `apps/admin/src/lib/supabase.ts` for Supabase session state, login/logout, and API bearer-token propagation.
- Do not read Supabase session state directly inside feature panels.
- Agent workflow run pages consume `AgentWorkflowRunDetail`, `AgentWorkflowRunEvent`, and SSE helpers from `src/lib/api-client.ts`; keep those shapes aligned with `packages/shared`.
- Use Vite public Supabase values only: `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY` or legacy `VITE_SUPABASE_ANON_KEY`.
- Never expose a Supabase service-role or secret key in `apps/admin`.

Useful package validation:

- `pnpm --filter @auto-fb/admin test`
- `pnpm --filter @auto-fb/admin typecheck`
- `pnpm --filter @auto-fb/admin build`
