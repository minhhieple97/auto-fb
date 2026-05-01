# AGENTS.md

This package owns the DTOs, enums, and Zod schemas shared by the API and admin app.

- Update shared schemas and exported types before changing API responses or admin consumers.
- Keep changes compatible with the intended public contract, then update package consumers.
- Add or update focused schema tests when contract behavior changes.

Useful package validation:

- `pnpm --filter @auto-fb/shared test`
- `pnpm --filter @auto-fb/shared typecheck`
- `pnpm --filter @auto-fb/shared build`
