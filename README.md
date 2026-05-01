# Auto FB MVP

Fullstack local MVP for a controlled multi-agent Facebook Page publishing workflow.

## What Is Included

- `apps/api`: NestJS REST API, LangGraph multi-agent workflow, source adapters, R2 storage service, Meta publisher with dry-run default.
- `apps/admin`: React/Vite dashboard for campaigns, sources, agent timeline, approval inbox, and published history.
- `packages/shared`: shared Zod schemas, DTOs, enums, and API contracts.
- `infra/schema.sql`: Supabase/PostgreSQL schema matching the MVP data model.
- `docker-compose.yml`: Redis for local queue infra when Docker is available.

## Supabase

The Supabase project for this repo is `auto-fb` in org `kgotqpeaxktsftegemkr`:

- Project ref: `oargectikpgjmzmotdmp`
- Dashboard: https://supabase.com/dashboard/project/oargectikpgjmzmotdmp
- Region: `ap-south-1`

Schema changes live in `supabase/migrations`. To apply pending migrations from a linked local checkout:

```bash
supabase link --project-ref oargectikpgjmzmotdmp
pnpm db:push
```

Generated database types live at `packages/shared/src/database.types.ts`. Regenerate them after schema changes:

```bash
pnpm db:types
```

GitHub Actions pushes Supabase migrations on every push to `main`. The workflow requires these repository secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

## Local Run

```bash
pnpm install
pnpm dev:api
pnpm dev:admin
```

Open:

- API: http://localhost:3000
- Admin: http://localhost:5173

Before starting the API, apply Supabase migrations and set `SUPABASE_URL` plus `SUPABASE_SECRET_KEY` in `.env`. `PUBLISH_DRY_RUN=true` is the default behavior.

## Environment

Copy `.env.example` to `.env` when configuring real integrations.

Important values:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`: required by the admin app for Supabase login/logout. `VITE_SUPABASE_ANON_KEY` is accepted as a legacy fallback for older Supabase projects.
- `SUPABASE_URL`: Supabase project URL used by the API.
- `SUPABASE_PROJECT_REF`: Supabase project ref used by local CLI scripts, defaults to `oargectikpgjmzmotdmp` in package scripts.
- `SUPABASE_SECRET_KEY`: server-only Supabase secret key used by the API. Legacy `SUPABASE_SERVICE_ROLE_KEY` is also accepted, but do not expose either key to the admin/browser bundle.
- `SUPABASE_SCHEMA`: optional Postgres schema, defaults to `public`.
- `META_PAGE_ACCESS_TOKEN`: required for real Facebook publishing.
- `PUBLISH_DRY_RUN=false`: enables real Meta Graph API calls.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`: required for real R2 image upload and real image publishing.
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`: optional LLM provider keys. Local/test mode falls back to `mock` when a key is missing.

## Validation

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm lint
```

## Current MVP Limits

- Human approval is mandatory before publish.
- Sources are limited to whitelisted RSS, JSON API, and static HTML.
- Posts support text plus one image.
- Dedupe is normalized content hash only; vector memory is an interface-level future extension.
- Supabase is the only API database adapter. Unit tests use local fakes or mocked Supabase responses rather than calling a live project.
