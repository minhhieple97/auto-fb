# AGENTS.md

This package is the NestJS API and controlled multi-agent workflow service.

- Treat `packages/shared` Zod schemas, DTOs, and enums as the API contract source.
- `infra/schema.sql` documents the target Supabase/PostgreSQL model, even when local MVP code uses fakes or in-memory persistence.
- API endpoints must validate Supabase JWTs before trusting identity or permissions.
- Publish only to Facebook Pages through the Meta Graph API and Page access tokens; do not add browser automation against Facebook.
- Keep source collection limited to approved RSS, JSON API, static HTML, or explicitly whitelisted sources.
- Preserve the `QA -> approval -> publisher` gate unless a task explicitly changes that policy.
- Keep dry-run publishing as the safe default for local development.

Useful package validation:

- `pnpm --filter @auto-fb/api test`
- `pnpm --filter @auto-fb/api typecheck`
- `pnpm --filter @auto-fb/api build`
