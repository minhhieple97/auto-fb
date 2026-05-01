# AGENTS.md

Auto FB is a pnpm-workspace monorepo for a controlled multi-agent Facebook Page publishing MVP.

- Use pnpm workspaces with Node >=22; the repo pins `pnpm@10.14.0`.
- Ask before adding production dependencies or replacing the project stack.
- Run the narrowest affected validation before finishing a change.

Useful root validation:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm lint`

Use the closest package-level instructions for package work:

- [apps/api/AGENTS.md](apps/api/AGENTS.md)
- [apps/admin/AGENTS.md](apps/admin/AGENTS.md)
- [packages/shared/AGENTS.md](packages/shared/AGENTS.md)

For local setup and environment variables, see [README.md](README.md). For cross-cutting schema, auth, workflow, publishing, and deploy guardrails, see [docs/AGENT_OPERATIONS.md](docs/AGENT_OPERATIONS.md).
