# Agent Operations

Read this only when a change touches shared contracts, Supabase schema, auth, workflow execution, publishing, deployment, or secrets.

## Shared Contracts And Schema

- Keep shared API contracts in `packages/shared` before updating API or admin consumers.
- Keep `supabase/migrations`, `infra/schema.sql`, and `packages/shared/src/database.types.ts` aligned when persistence changes.
- Treat `supabase/migrations` as deployable schema history and `infra/schema.sql` as the human-readable target schema.
- Regenerate `packages/shared/src/database.types.ts` with `pnpm db:types` after Supabase schema changes instead of hand-editing it.
- Supabase is the only API database adapter. Unit tests should use local fakes or mocked Supabase responses, not a live project.

## Auth And Secrets

- Preserve admin auth and permissions end to end: Supabase JWTs are validated in the API, roles live in `admin_users`, and permission constants live in `packages/shared`.
- Do not trust browser-only role checks for protected behavior; enforce access in API controllers and guards.
- Never expose `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Facebook Page tokens, or R2 secrets to `apps/admin` or any browser bundle.
- Fanpage Page Access Tokens must stay server-side and encrypted with `FACEBOOK_PAGE_TOKEN_ENCRYPTION_KEY`.

## Workflow And Publishing

- Preserve the MVP safety boundary: Facebook Pages only, approved sources only, human approval before publishing, and dry-run publishing by default.
- Keep the `QA -> approval -> publisher` gate unless a task explicitly changes that policy.
- Real Meta publishing requires `PUBLISH_DRY_RUN=false`, a linked fanpage/Page token, and explicit production publish confirmation.
- Do not add Facebook browser automation; publishing goes through the Meta Graph API for Pages.
- Source collection stays limited to whitelisted RSS, JSON API, static HTML, or explicitly approved source types.
- BullMQ/Redis supports workflow and publish job execution. Vercel Functions are suitable for request/response API work, not as a durable long-running worker host.

## CI And Deploy

- Production CI is `.github/workflows/supabase-migrations.yml`: it installs pnpm, typechecks, builds `@auto-fb/shared`, runs tests, pushes Supabase migrations, then conditionally deploys API and admin to Vercel when repository variable `ENABLE_VERCEL_DEPLOY=true`.
- The Vercel projects use package roots `apps/api` and `apps/admin`; do not commit local `.vercel/` metadata.
- CI migration deploys target the Supabase project ref documented in `README.md`; schema changes should be represented as migrations before relying on CI.
