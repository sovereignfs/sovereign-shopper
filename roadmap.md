# Sovereign Shopper — Roadmap

Chronological, dependency-ordered task queue for building the Sovereign Shopper
plugin. Each task is scoped to **one branch = one PR**, small enough for an
AI agent to pick up with minimal supervision. Full requirements:
[SPEC.md](SPEC.md).

## How to read this file

- **`[PLATFORM]`** tasks change the main **`claude-sv`** monorepo
  (`/Users/heimdallr/Dev/kasunben/sovereignfs/claude-sv`). They follow that
  repo's own `CLAUDE.md` / `docs/development-workflow.md` conventions
  (branch naming, version bumps, `docs/roadmap.md` + `docs/epics/` updates,
  draft PRs). **Do these in the `claude-sv` repo, not here.**
- **`[PLUGIN]`** tasks change **this repo** (`sovereign-shopper.local`, which
  becomes the public `sovereign-shopper` repo).
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
| T-00 | Bootstrap this repo: `package.json`, `tsconfig` (extend `@sovereignfs/tsconfig`), ESLint/Prettier config matching `claude-sv` conventions, `manifest.json` skeleton (id `fs.sovereign.shopper`, `type: sovereign`, `shell: default`), CI workflow, README pointing to SPEC.md + this roadmap. | — | ✅ (CI workflow deferred — no reference plugin in this workspace has one yet to match; revisit if the platform establishes one) |

---

## Phase 1 — v0.1: simple shared grocery list `[PLUGIN]`

No platform blockers — `sdk.auth`, `sdk.db`, `sdk.directory`, and
`sdk.notifications` all already work.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-01 | DB schema: `shopper_lists`, `shopper_list_shares`, `shopper_products`, `shopper_list_items`, `shopper_purchases`, `shopper_user_state` (Phase 1 shape — `owner_user_id`-scoped, `household_id` columns present but nullable/unused). Migration + Drizzle schema file. | T-00 | ✅ |
| T-02 | List CRUD: create a list (owner = creator), rename, archive. Landing page falls back to an empty state when the user has no lists yet (SHP-01). | T-01 | ✅ |
| T-03 | List switcher: own lists + lists shared with the user; opt-in combined read-only roll-up view (SHP-02). Resolve SPEC open question 5 (confirm read-only is sufficient for Phase 1) before building. | T-02 | ✅ |
| T-04 | Last-used-list landing page, backed by `shopper_user_state` (SHP-03). | T-02 | ✅ |
| T-05 | Add-item bar with type-ahead suggestions sourced from `shopper_products` (owner-scoped catalog) + purchase history; one-tap quick-add (SHP-04). | T-01 | ✅ (added `SuggestionInput` to `@sovereignfs/ui` — platform PR [#194](https://github.com/sovereignfs/sovereign/pull/194), draft, not yet merged; this repo's `workspace:*` link works against that branch locally in the meantime) |
| T-06 | Per-item icon: curated icon set + category-mapped fallback (`lib/icons.ts`, `IconPicker.tsx`). Resolve SPEC open question 4 (confirm curated set is sufficient for Phase 1) before building. (SHP-05) | T-05 | ✅ (open question 4 resolved: real SVG icons, not emoji — 21 curated grocery icons + `IconPicker` DS component added to `@sovereignfs/ui`, platform PR [#195](https://github.com/sovereignfs/sovereign/pull/195) draft, stacked on #194; plugin's `lib/icons.ts` auto-assigns icon+category by name keyword at add-time, `IconPicker` itself is wired into item editing in T-07) |
| T-07 | Item edit sheet: name, quantity, unit, category, icon, barcode, price; saving updates the linked `shopper_products` row (SHP-06). | T-05, T-06 | ✅ (built as a `Dialog`, not a `Sheet` — see CLAUDE.md UI rules; added `QuantityStepper` to `@sovereignfs/ui`, platform PR [#197](https://github.com/sovereignfs/sovereign/pull/197); resolves open question 2 as a fixed unit `Select`) |
| T-08 | Tap-to-buy: mark item bought (`checked_at` + `shopper_purchases` row with buyer/time/list/quantity/price); un-tap reverses both (SHP-07). | T-07 | ✅ (added `CheckableListRow` to `@sovereignfs/ui` — platform PR [#198](https://github.com/sovereignfs/sovereign/pull/198), the last of the three originally-flagged missing primitives; row body is the toggle, editing moved to a separate pencil link so the two don't share a tap target) |
| T-09 | Clear bought items; manual reorder (`sort_order`); group list view by category (SHP-08). | T-08 | ✅ (originally shipped as up/down buttons scoped to each category group; replaced with `dnd-kit` drag-and-drop after the buttons proved unreliable in practice — same per-category scoping, now structural via one `DndContext` per category rather than a UI choice; see CLAUDE.md "Manual reorder is drag-and-drop") |
| T-10 | Share dialog: pick a user via `sdk.directory`, grant `editor`/`viewer`, writes `shopper_list_shares`; owner can revoke (SHP-09). | T-02 | ✅ (search-and-add built on `SuggestionInput`, not a hand-rolled results list — no new `@sovereignfs/ui` component needed; owner-only, upserts on the (list_id, user_id) unique index so re-sharing with a different role just updates it) |
| T-11 | v0.1 hardening pass: owner/share-scoping test sweep (a viewer cannot write, a non-shared user cannot see the list), tenant-scoping sweep across all `shopper_*` tables, empty-state and revoke-share edge cases. | T-03, T-09, T-10 | ✅ (fixed a latent bug found in the audit: `renameList`/`archiveList` scoped their UPDATE by `owner_user_id` in the WHERE clause alone, so a non-owner's call matched zero rows and returned as a silent no-op instead of throwing, unlike every other mutating action — now use the same `getList()` + role-check pattern as the rest; 42 tests added across `app/_lib/__tests__/access-control.test.ts`, `tenant-scoping.test.ts`, `edge-cases.test.ts`, see CLAUDE.md for the testing approach) |

**v0.1 is feature-complete after T-11 — this is the deliverable for the
current build request.**

**Mobile shell (ad hoc, not a numbered SHP requirement):** ported
sovereign-tasks' swipeable scroll-snap carousel pattern — `MobileAwareShell`
forks desktop (unchanged two-pane grid) vs. mobile (`MobileShopperCarousel`)
at the platform's canonical 768px breakpoint. Slide 0 is the list-switcher
(`Sidebar`, reused as-is); slide *n* is list *n* (`ListPane`, extracted from
`lists/[listId]/page.tsx` so both the desktop route and the carousel render
the same component off server- vs. client-fetched props); the trailing slide
is the read-only Combined view (`CombinedPane`, same extraction from
`combined/page.tsx`), present only once there are 2+ accessible lists. See
CLAUDE.md's "Mobile shell" section for the full architecture and the
swipe-direction/combined-view-placement/breakpoint decisions.

---

## Phase 2 — v0.2: households, roles, invites, analytics `[PLUGIN]`

Start only once Phase 1 has shipped and the migration design (SPEC open
question 8) is settled.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-12 | Design and document the Phase 1 → Phase 2 migration: how an existing personal list moves to `household_id` scoping, what happens to its `shopper_list_shares` rows, whether the owner opts in per-list. Resolve SPEC open question 8 before writing migration code. | T-11 | ⬜ |
| T-13 | DB schema additions: `shopper_households`, `shopper_household_members`, `shopper_household_invites`; extend `shopper_lists`/`shopper_products`/`shopper_purchases` usage to populate `household_id` per T-12's design. | T-12 | ⬜ |
| T-14 | Household create/rename/archive; creator becomes `owner` (SHP-20). | T-13 | ⬜ |
| T-15 | Invite flow: shareable link/code, optional email via `sdk.mailer` (no-op without SMTP) (SHP-21). | T-13 | ⬜ |
| T-16 | Membership management: remove member, leave household, last-owner protection (SHP-22). | T-14 | ⬜ |
| T-17 | Household default list: auto-created, auto-shared with all members (SHP-23). | T-14 | ⬜ |
| T-18 | List migration UI: reassign an existing personal list to a household per T-12's design (SHP-24). | T-12, T-17 | ⬜ |
| T-19 | Household analytics view: spend over time, category breakdown, frequent/recent items, who-bought-what; member management lives here too (SHP-25). | T-16, T-17 | ⬜ |
| T-20 | v0.2 hardening pass: household-scoping test sweep, invite-token expiry/reuse edge cases, migration correctness tests (list/product/purchase rows correctly re-scoped, shares preserved). | T-15, T-18, T-19 | ⬜ |

---

## Phase 3 — v0.3: light inventory and learned suggestions `[PLUGIN]`

No platform blockers.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-21 | Per-product on-hand quantity, adjusted from purchases and manual edits (SHP-30). | T-11 | ⬜ |
| T-22 | Per-product low-stock threshold + flag; low items surfaced as suggestions while building a list (SHP-31). | T-21 | ⬜ |
| T-23 | Suggestion ranking by purchase frequency/recency; auto-apply remembered category and icon to repeat items (SHP-32). | T-05 | ⬜ |

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
| T-25 | Photo attachment for a product or list item via `sdk.storage` (SHP-40). | T-24 | ⬜ |
| T-26 | Barcode scanning (`sdk.device` camera / Web `getUserMedia`) to add/look up items, with optional external product lookup via a plugin server route (SHP-41). | T-25 | ⬜ |

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
| T-28 | Notifications for "item added to a shared list", "someone bought X", invites, via `sdk.notifications` (SHP-51). | T-11, T-15 | ⬜ |
| T-29 | Activity feed combining plugin domain history with `sdk.activity` events (SHP-52). | T-19 | ⬜ |
| T-30 | Live shared-list sync via `sdk.events`; polling fallback where unavailable (SHP-50). | T-27 | ⬜ |

---

## Phase 8 — Platform prerequisites for intelligence `[PLATFORM]`

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-31 | **[PLATFORM]** Implement RFC 0047 (`sdk.tools`) — confirmed absent from the SDK entirely. Needed for confirmed assistant/automation writes (receipt-scan bulk purchases, SHP-61). Update RFC status + `docs/roadmap.md` / matching epic. | — | ⬜ |
| T-32 | **[PLATFORM]** Verify whether the existing partial `sdk.jobs` (RFC 0046, "Phase 1 subset") covers predictive restock's scheduling needs (SHP-63); extend if not. Do this check at the start of this phase, not earlier — the partial surface may already be sufficient. | — | ⬜ |
| T-33 | **[PLATFORM]** Scope the assistant/harness integration surface for icon generation (SHP-60) and receipt OCR (SHP-61) — likely a new RFC; do not build plugin-local model-provider logic (SPEC platform-gaps item 6). | — | ⬜ |

---

## Phase 9 — v0.6: intelligence `[PLUGIN]`

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-34 | AI unique icon/image generation per item via the assistant/harness layer (SHP-60). | T-33 | ⬜ |
| T-35 | Receipt scan → bulk purchases: image OCR + line-item parsing into transactions, confirmed tool execution for writes (SHP-61). | T-24, T-31 | ⬜ |
| T-36 | Smart auto-categorization of new items (SHP-62). | T-33 | ⬜ |
| T-37 | Predictive restock suggestions from consumption patterns (SHP-63). | T-32 | ⬜ |

---

## Phase 10 — v0.7: ledger `[PLUGIN]`

No new platform blockers beyond what's already resolved above.

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| T-38 | Price history and spend trends per product/household (SHP-70). | T-19 | ⬜ |
| T-39 | Budgets per category with progress tracking; `shopper_budgets` table (SHP-71). | T-19 | ⬜ |
| T-40 | Recurring purchases / auto-recurring list items (SHP-72). | T-11 | ⬜ |
| T-41 | Multi-currency purchases (SHP-73). | T-08 | ⬜ |
| T-42 | CSV export of the household ledger (SHP-74). | T-38 | ⬜ |

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
