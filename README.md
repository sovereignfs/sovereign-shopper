# Shopper

Shopper is a Sovereign plugin for a shared grocery list that grows into a
household purchase ledger. Phase 1 ships a simple shared list: create a list,
add/edit/check off items with suggestions, and share it directly with other
users — no household model yet (see [SPEC.md](SPEC.md) for the full product
vision and phasing, [roadmap.md](roadmap.md) for the task queue, and
[UI.md](UI.md) for the wireframes).

## Local development

To test this standalone checkout against the platform, clone or copy it into
a platform workspace as a local plugin checkout:

```
plugins/sovereign-shopper.local
```

Then run the platform generate/dev workflow from the platform repository:

```bash
pnpm generate
pnpm dev
```

The app is served at `/shopper` once composed by the platform.

## Current scope

Phase 1 (SPEC.md v0.1, roadmap.md T-00–T-11): list CRUD, list switcher
(own lists / shared with me / combined view), add-item suggestions, quantity
stepper, per-item icons, item editing, tap-to-buy purchase recording, and
direct per-user list sharing. No household model, no media/capture, no
realtime, no intelligence features — see SPEC.md's phasing for what's next
and why each later phase is gated on platform or design work not yet done.

## Database

Isolated SQLite store (`database.isolation: "isolated"` in `manifest.json`).
Schema lives in `app/_db/schema.ts` (the schema application code queries
against) with a structural Postgres mirror in `app/_db/schema.postgres.ts`
for migration generation only — `db/schema.ts` and `db/schema.postgres.ts`
are thin re-exports for tooling. See `docs/plugin-database.md` in the
platform repo for the full isolated-database reference.

```bash
pnpm db:generate:sqlite   # after changing app/_db/schema.ts
pnpm db:generate:pg       # after changing app/_db/schema.postgres.ts to match
```

Review generated SQL before committing.
