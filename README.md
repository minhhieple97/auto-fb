# Auto FB MVP

Fullstack local MVP for a controlled multi-agent Facebook Page publishing workflow.

## What Is Included

- `apps/api`: NestJS REST API, LangGraph multi-agent workflow, source adapters, R2 storage service, Meta publisher with dry-run default.
- `apps/admin`: React/Vite dashboard for campaigns, sources, agent timeline, approval inbox, and published history.
- `packages/shared`: shared Zod schemas, DTOs, enums, and API contracts.
- `infra/schema.sql`: PostgreSQL schema matching the MVP data model.
- `docker-compose.yml`: PostgreSQL and Redis for local infra when Docker is available.

## Local Run

```bash
pnpm install
pnpm dev:api
pnpm dev:admin
```

Open:

- API: http://localhost:3000
- Admin: http://localhost:5173

The API currently uses an in-memory repository by default so the MVP can run without Docker. `PUBLISH_DRY_RUN=true` is the default behavior.

## Environment

Copy `.env.example` to `.env` when configuring real integrations.

Important values:

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
- The production PostgreSQL/Redis adapters are not wired yet; schema and compose are included for the next persistence step.
