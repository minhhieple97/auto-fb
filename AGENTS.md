# AGENTS.md

## Repository expectations

- Use `pnpm` for workspace commands and dependency management.
- Keep shared API contracts in `packages/shared` first; update consumers only after the shared Zod schemas and types match the intended contract.
- Run the narrowest relevant validation before finishing a change. For admin UI work, run `pnpm --filter @auto-fb/admin test`; run `pnpm --filter @auto-fb/admin typecheck` when TypeScript surfaces change.
- Ask before adding new production dependencies or replacing the project stack.

## Project architecture

- `apps/api` is the NestJS API and controlled multi-agent workflow service.
- `apps/admin` is the React/Vite dashboard for campaigns, sources, workflow runs, approval inbox, and published history.
- `packages/shared` owns DTOs, enums, and schemas shared between API and admin.
- `infra/schema.sql` documents the target PostgreSQL model even when local MVP code uses in-memory persistence.

## Product guardrails

- This product publishes only to Facebook Pages through the Meta Graph API and Page access tokens. Do not add browser automation against Facebook.
- Source collection must stay limited to approved RSS, JSON API, static HTML, or explicitly whitelisted sources.
- Human approval is mandatory before publishing in the MVP. Preserve the `QA -> approval -> publisher` gate unless a task explicitly changes that policy.
- Keep dry-run publishing as the safe default for local development.

## Admin UI conventions

- Prefer focused Testing Library unit tests for user-visible behavior and API side effects.
- Mock `apps/admin/src/lib/api-client.ts` in component tests instead of requiring the backend.
- Keep React Query tests wrapped in a test `QueryClientProvider` with retries disabled.
- Use the existing Tailwind utility style and compact operational dashboard layout.
