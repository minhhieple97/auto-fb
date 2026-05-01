# AGENTS.md

Auto FB is a pnpm-workspace monorepo for a controlled multi-agent Facebook Page publishing MVP.

- Use pnpm workspaces with Node >=22; the repo pins `pnpm@10.14.0`.
- Keep shared API contracts in `packages/shared` before updating API or admin consumers.
- Run the narrowest affected validation before finishing a change.
- Ask before adding production dependencies or replacing the project stack.
- Preserve the MVP safety boundary: Facebook Pages only, approved sources only, human approval before publishing, and dry-run publishing by default.

Package-specific guidance:

- [apps/api/AGENTS.md](apps/api/AGENTS.md)
- [apps/admin/AGENTS.md](apps/admin/AGENTS.md)
- [packages/shared/AGENTS.md](packages/shared/AGENTS.md)

For local setup, environment variables, and broad validation commands, see [README.md](README.md).
