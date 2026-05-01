# AGENTS.md

Auto FB is a pnpm-workspace monorepo for a controlled multi-agent Facebook Page publishing MVP.

- Use pnpm workspaces with Node >=22; the repo pins `pnpm@10.14.0`.
- Keep shared API contracts in `packages/shared` before updating API or admin consumers. Regenerate `packages/shared/src/database.types.ts` after Supabase schema changes.
- Run the narrowest affected validation before finishing a change.
- Ask before adding production dependencies or replacing the project stack.
- Preserve the MVP safety boundary: Facebook Pages only, approved sources only, human approval before publishing, and dry-run publishing by default.
- Treat `supabase/migrations` as the deployable schema history and `infra/schema.sql` as the human-readable target schema.
- Production CI is `.github/workflows/supabase-migrations.yml`: it verifies the workspace, pushes Supabase migrations, then conditionally deploys API and admin to separate Vercel projects when `ENABLE_VERCEL_DEPLOY=true`.
- The Vercel projects use package roots `apps/api` and `apps/admin`; do not commit local `.vercel/` metadata.
- BullMQ/Redis supports workflow execution. Vercel Functions are suitable for request/response API work, not as a durable long-running worker host.

Package-specific guidance:

- [apps/api/AGENTS.md](apps/api/AGENTS.md)
- [apps/admin/AGENTS.md](apps/admin/AGENTS.md)
- [packages/shared/AGENTS.md](packages/shared/AGENTS.md)

For local setup, environment variables, and broad validation commands, see [README.md](README.md).
