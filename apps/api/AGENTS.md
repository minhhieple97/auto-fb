# AGENTS.md

This package is the NestJS API and controlled multi-agent workflow service.

- Treat `packages/shared` Zod schemas, DTOs, and enums as the API contract source.
- `infra/schema.sql` documents the target Supabase/PostgreSQL model, even when local MVP code uses fakes or in-memory persistence.
- Supabase is the production database adapter. Keep `supabase/migrations`, `infra/schema.sql`, and `packages/shared/src/database.types.ts` aligned when changing persistence.
- Workflow run mutation/stream/list endpoints live in `src/workflow/agent-runs.controller.ts` and must validate Supabase JWTs before trusting identity or permissions.
- `src/workflow/agent-workflow-queue.service.ts` requires `REDIS_URL` to enqueue BullMQ jobs; do not assume Vercel Functions can host durable background workers.
- Workflow run state is persisted separately from per-step agent runs. Keep `AgentWorkflowRunDetail` responses and SSE events compatible with `packages/shared`.
- Publish only to Facebook Pages through the Meta Graph API and Page access tokens; do not add browser automation against Facebook.
- Keep source collection limited to approved RSS, JSON API, static HTML, or explicitly whitelisted sources.
- Preserve the `QA -> approval -> publisher` gate unless a task explicitly changes that policy.
- Keep dry-run publishing as the safe default for local development.
- The API reads `PORT` first and then `API_PORT`, so keep both local and Vercel startup paths working.

Useful package validation:

- `pnpm --filter @auto-fb/api test`
- `pnpm --filter @auto-fb/api typecheck`
- `pnpm --filter @auto-fb/api build`
