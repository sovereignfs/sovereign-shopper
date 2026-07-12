# Sovereign Tally — Roadmap

Chronological, dependency-ordered task queue for building the Sovereign Tally
plugin. Each task is scoped to **one branch = one PR**, small enough for an
AI agent to pick up with minimal supervision. Full requirements:
[SPEC.md](SPEC.md).

## How to read this file

- **`[PLATFORM]`** tasks change the main **`claude-sv`** monorepo
  (`/Users/heimdallr/Dev/kasunben/sovereignfs/claude-sv`). They follow that
  repo's own `CLAUDE.md` / `docs/development-workflow.md` conventions
  (branch naming, version bumps, `docs/roadmap.md` + `docs/epics/` updates,
  draft PRs). **Do these in the `claude-sv` repo, not here.**
- **`[PLUGIN]`** tasks change **this repo** (`sovereign-tally.local`, which
  becomes the public `sovereign-tally` repo).
- Tasks are **sequenced** — don't start a task whose `Depends on` isn't ✅,
  unless tagged `[parallel]`.
- Status: `⬜ not started` / `🟨 in progress` / `✅ done`.
- **Like Sovereign Docs, and unlike Sovereign Wallet's chosen phase 1, this
  plugin's Phase 1 (simple shared grocery list) has zero platform blockers.**
  Everything below Phase 0 is `[PLUGIN]` work until v0.4 (media/capture).

---

## Phase 0 — Plugin repo bootstrap `[PLUGIN]`

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-00 | Bootstrap this repo: `package.json`, `tsconfig` (extend `@sovereignfs/tsconfig`), ESLint/Prettier config matching `claude-sv` conventions, `manifest.json` skeleton (id `fs.sovereign.tally`, `type: sovereign`, `shell: default`), CI workflow, README pointing to SPEC.md + this roadmap. | — | ⬜ |

---

## Phase 1 — v0.1: simple shared grocery list `[PLUGIN]`

No platform blockers — `sdk.auth`, `sdk.db`, `sdk.directory`, and
`sdk.notifications` all already work.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-01 | DB schema: `tally_lists`, `tally_list_shares`, `tally_products`, `tally_list_items`, `tally_purchases`, `tally_user_state` (Phase 1 shape — `owner_user_id`-scoped, `household_id` columns present but nullable/unused). Migration + Drizzle schema file. | T-00 | ⬜ |
| T-02 | List CRUD: create a list (owner = creator), rename, archive. Landing page falls back to an empty state when the user has no lists yet (TLY-01). | T-01 | ⬜ |
| T-03 | List switcher: own lists + lists shared with the user; opt-in combined read-only roll-up view (TLY-02). Resolve SPEC open question 5 (confirm read-only is sufficient for Phase 1) before building. | T-02 | ⬜ |
| T-04 | Last-used-list landing page, backed by `tally_user_state` (TLY-03). | T-02 | ⬜ |
| T-05 | Add-item bar with type-ahead suggestions sourced from `tally_products` (owner-scoped catalog) + purchase history; one-tap quick-add (TLY-04). | T-01 | ⬜ |
| T-06 | Per-item icon: curated icon set + category-mapped fallback (`lib/icons.ts`, `IconPicker.tsx`). Resolve SPEC open question 4 (confirm curated set is sufficient for Phase 1) before building. (TLY-05) | T-05 | ⬜ |
| T-07 | Item edit sheet: name, quantity, unit, category, icon, barcode, price; saving updates the linked `tally_products` row (TLY-06). | T-05, T-06 | ⬜ |
| T-08 | Tap-to-buy: mark item bought (`checked_at` + `tally_purchases` row with buyer/time/list/quantity/price); un-tap reverses both (TLY-07). | T-07 | ⬜ |
| T-09 | Clear bought items; manual reorder (`sort_order`); group list view by category (TLY-08). | T-08 | ⬜ |
| T-10 | Share dialog: pick a user via `sdk.directory`, grant `editor`/`viewer`, writes `tally_list_shares`; owner can revoke (TLY-09). | T-02 | ⬜ |
| T-11 | v0.1 hardening pass: owner/share-scoping test sweep (a viewer cannot write, a non-shared user cannot see the list), tenant-scoping sweep across all `tally_*` tables, empty-state and revoke-share edge cases. | T-03, T-09, T-10 | ⬜ |

**v0.1 is feature-complete after T-11 — this is the deliverable for the
current build request.**

---

## Phase 2 — v0.2: households, roles, invites, analytics `[PLUGIN]`

Start only once Phase 1 has shipped and the migration design (SPEC open
question 8) is settled.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-12 | Design and document the Phase 1 → Phase 2 migration: how an existing personal list moves to `household_id` scoping, what happens to its `tally_list_shares` rows, whether the owner opts in per-list. Resolve SPEC open question 8 before writing migration code. | T-11 | ⬜ |
| T-13 | DB schema additions: `tally_households`, `tally_household_members`, `tally_household_invites`; extend `tally_lists`/`tally_products`/`tally_purchases` usage to populate `household_id` per T-12's design. | T-12 | ⬜ |
| T-14 | Household create/rename/archive; creator becomes `owner` (TLY-20). | T-13 | ⬜ |
| T-15 | Invite flow: shareable link/code, optional email via `sdk.mailer` (no-op without SMTP) (TLY-21). | T-13 | ⬜ |
| T-16 | Membership management: remove member, leave household, last-owner protection (TLY-22). | T-14 | ⬜ |
| T-17 | Household default list: auto-created, auto-shared with all members (TLY-23). | T-14 | ⬜ |
| T-18 | List migration UI: reassign an existing personal list to a household per T-12's design (TLY-24). | T-12, T-17 | ⬜ |
| T-19 | Household analytics view: spend over time, category breakdown, frequent/recent items, who-bought-what; member management lives here too (TLY-25). | T-16, T-17 | ⬜ |
| T-20 | v0.2 hardening pass: household-scoping test sweep, invite-token expiry/reuse edge cases, migration correctness tests (list/product/purchase rows correctly re-scoped, shares preserved). | T-15, T-18, T-19 | ⬜ |

---

## Phase 3 — v0.3: light inventory and learned suggestions `[PLUGIN]`

No platform blockers.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-21 | Per-product on-hand quantity, adjusted from purchases and manual edits (TLY-30). | T-11 | ⬜ |
| T-22 | Per-product low-stock threshold + flag; low items surfaced as suggestions while building a list (TLY-31). | T-21 | ⬜ |
| T-23 | Suggestion ranking by purchase frequency/recency; auto-apply remembered category and icon to repeat items (TLY-32). | T-05 | ⬜ |

---

## Phase 4 — Platform prerequisite for media `[PLATFORM]`

Must land in `claude-sv` before Phase 5's media task (T-25) starts.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-24 | **[PLATFORM]** Implement RFC 0044 (`sdk.storage`): replace the `NotImplementedError` stubs in `packages/sdk/src/unimplemented.ts` with a real `put()`/`get()` backing. Update RFC 0044 status + `docs/roadmap.md` / epic task 8.7. (Shared prerequisite — check whether Sovereign Docs or Sovereign Wallet has already completed this before duplicating the work.) | — | ⬜ |

---

## Phase 5 — v0.4: media and capture `[PLUGIN]`

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-25 | Photo attachment for a product or list item via `sdk.storage` (TLY-40). | T-24 | ⬜ |
| T-26 | Barcode scanning (`sdk.device` camera / Web `getUserMedia`) to add/look up items, with optional external product lookup via a plugin server route (TLY-41). | T-25 | ⬜ |

---

## Phase 6 — Platform prerequisite for realtime `[PLATFORM]`

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-27 | **[PLATFORM]** Implement RFC 0045 (plugin events and realtime channels): design + build `sdk.events` (`publish`/`subscribe`), currently entirely missing. Update RFC status + `docs/roadmap.md` / matching epic. | — | ⬜ |

---

## Phase 7 — v0.5: realtime and notifications `[PLUGIN]`

`sdk.notifications` and `sdk.activity` are ready today; only live sync needs
Phase 6.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-28 | Notifications for "item added to a shared list", "someone bought X", invites, via `sdk.notifications` (TLY-51). | T-11, T-15 | ⬜ |
| T-29 | Activity feed combining plugin domain history with `sdk.activity` events (TLY-52). | T-19 | ⬜ |
| T-30 | Live shared-list sync via `sdk.events`; polling fallback where unavailable (TLY-50). | T-27 | ⬜ |

---

## Phase 8 — Platform prerequisites for intelligence `[PLATFORM]`

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-31 | **[PLATFORM]** Implement RFC 0047 (`sdk.tools`) — confirmed absent from the SDK entirely. Needed for confirmed assistant/automation writes (receipt-scan bulk purchases, TLY-61). Update RFC status + `docs/roadmap.md` / matching epic. | — | ⬜ |
| T-32 | **[PLATFORM]** Verify whether the existing partial `sdk.jobs` (RFC 0046, "Phase 1 subset") covers predictive restock's scheduling needs (TLY-63); extend if not. Do this check at the start of this phase, not earlier — the partial surface may already be sufficient. | — | ⬜ |
| T-33 | **[PLATFORM]** Scope the assistant/harness integration surface for icon generation (TLY-60) and receipt OCR (TLY-61) — likely a new RFC; do not build plugin-local model-provider logic (SPEC platform-gaps item 6). | — | ⬜ |

---

## Phase 9 — v0.6: intelligence `[PLUGIN]`

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-34 | AI unique icon/image generation per item via the assistant/harness layer (TLY-60). | T-33 | ⬜ |
| T-35 | Receipt scan → bulk purchases: image OCR + line-item parsing into transactions, confirmed tool execution for writes (TLY-61). | T-24, T-31 | ⬜ |
| T-36 | Smart auto-categorization of new items (TLY-62). | T-33 | ⬜ |
| T-37 | Predictive restock suggestions from consumption patterns (TLY-63). | T-32 | ⬜ |

---

## Phase 10 — v0.7: ledger `[PLUGIN]`

No new platform blockers beyond what's already resolved above.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-38 | Price history and spend trends per product/household (TLY-70). | T-19 | ⬜ |
| T-39 | Budgets per category with progress tracking; `tally_budgets` table (TLY-71). | T-19 | ⬜ |
| T-40 | Recurring purchases / auto-recurring list items (TLY-72). | T-11 | ⬜ |
| T-41 | Multi-currency purchases (TLY-73). | T-08 | ⬜ |
| T-42 | CSV export of the household ledger (TLY-74). | T-38 | ⬜ |

---

## Cross-repo/cross-plugin note

RFC 0044 (`sdk.storage`, Phase 4/T-24) is also a blocker for Sovereign Docs
(v0.3 images/assets) and Sovereign Wallet (cards/documents track). **Whoever
picks up T-24 should check both other plugin roadmaps first** — this task
should be done once in `claude-sv`, not duplicated across plugin
repos/sessions.

## Changelog

| Date | Change |
| --- | --- |
| 2026-07-12 | Initial roadmap, derived from the restructured SPEC.md (Phase 1 = simple shared list, no household) + platform audit. |
