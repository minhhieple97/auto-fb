# AGENTS.md

This package owns the DTOs, enums, and Zod schemas shared by the API and admin app.

- Update shared schemas and exported types before changing API responses or admin consumers.
- Keep changes compatible with the intended public contract, then update package consumers.
- Keep agent workflow schemas together: `AgentRun`, `AgentWorkflowRun`, `AgentWorkflowRunDetail`, `AgentWorkflowRunEvent`, statuses, and node names are consumed by both API persistence/workflow code and the admin agent-runs UI.
- Database helper types are generated in `src/database.types.ts`; do not hand-edit them when the Supabase schema changes. Regenerate with `pnpm db:types` from the workspace root.
- Add or update focused schema tests when contract behavior changes.

Useful package validation:

- `pnpm --filter @auto-fb/shared test`
- `pnpm --filter @auto-fb/shared typecheck`
- `pnpm --filter @auto-fb/shared build`
