# CLAUDE.md — sovereign-shopper

Guidance for Claude Code working in this plugin repository.

## What this is

**Sovereign Shopper** — a privacy-first, self-hosted shared grocery list that
grows into a household purchase ledger. A `type: sovereign` Sovereign plugin
maintained in its own repository (`sovereign-shopper`).

Spec: [SPEC.md](SPEC.md) · Wireframes: [UI.md](UI.md) · Tasks: [roadmap.md](roadmap.md)

## Identity

| Property     | Value                                                        |
| ------------ | ------------------------------------------------------------- |
| Plugin ID    | `fs.sovereign.shopper`                                          |
| Route prefix | `/shopper`                                                      |
| Database     | `isolated`, `sqlite` — no slug prefix required, but tables keep the `shopper_` prefix for readability |
| Permissions  | `auth:session`, `db:readWrite`, `notifications:send`, `data:provide` |
| Min platform | `0.19.0`                                                      |
| Table prefix | `shopper_` (convention, not required by isolated mode)          |

## SDK-only rule

**Never import from `@sovereignfs/db` directly.** All database access goes
through `sdk.db`. This is enforced by the platform's ESLint SDK boundary rule
and is the defining constraint of an externally-maintained plugin.

```ts
// ✅ correct
import { sdk } from '@sovereignfs/sdk';
const db = await sdk.db.getClient();

// ❌ wrong — breaks the plugin/platform boundary
import { getPlatformDb } from '@sovereignfs/db';
```

## tenant_id scoping

Every query that touches user data **must** filter by both `tenant_id` and
the current user's `id` (Phase 1: `owner_user_id`; Phase 2+ adds
`household_id` as an alternative scope — see below). There is no exception.

```ts
const lists = await db
  .select()
  .from(shopperLists)
  .where(and(eq(shopperLists.tenantId, tenantId), eq(shopperLists.ownerUserId, userId)));
```

## Ownership scoping: Phase 1 vs. Phase 2

`shopper_lists`, `shopper_products`, and `shopper_purchases` all carry **both**
`owner_user_id` (set today) and a nullable `household_id` (unused until
Phase 2). A row is scoped to *either* its owner user *or* a household, never
both — Phase 2's migration is the only path that moves a row from one
scoping to the other. **Do not write query code that assumes `household_id`
is populated** — it is always `null` in Phase 1. See SPEC.md's "Data model"
intro and open question 8 for the full rationale before touching Phase 2.

## Quantity and money storage

- **Quantities** (`shopper_list_items.quantity`, `shopper_purchases.quantity`,
  `shopper_products.on_hand_qty`/`low_stock_threshold`) are `text` columns
  holding a canonical decimal string (e.g. `"1.5"`), **never** a Drizzle
  `real`/binary float. Parse with a decimal-safe helper, not `parseFloat`
  alone, when doing arithmetic (e.g. combined-view aggregation).
- **Money** (`shopper_products.typical_price`, `shopper_purchases.price`) is
  `integer`, smallest currency unit (cents) — consistent with Splitify and
  Sovereign Wallet's ledger track.

## Table prefix

All plugin tables are prefixed `shopper_`:

- `shopper_lists`
- `shopper_list_shares`
- `shopper_products`
- `shopper_list_items`
- `shopper_purchases`
- `shopper_user_state`
- `shopper_households`, `shopper_household_members`, `shopper_household_invites` (Phase 2)
- `shopper_budgets` (v0.7)

## Milestone scope

Requirement IDs are stable — never renumber or reuse a `SHP-*` id (already
renumbered once, from the original full-vision draft, when Phase 1 was
rescoped to drop the mandatory household model — see SPEC.md Changelog).

| Milestone | SHP IDs | Status      | Description                                                   |
| --------- | ------- | ----------- | --------------------------------------------------------------- |
| v0.1      | 01–09   | in progress | Simple shared list: create, switch, add/edit/check items, direct per-user sharing. No household. |
| v0.2      | 20–25   | blocked     | Households, roles, invites, analytics — needs the Phase 1→2 migration design (SPEC open question 8) first |
| v0.3      | 30–32   | blocked     | Light inventory, learned suggestions                            |
| v0.4      | 40–41   | blocked     | Media/capture — requires `sdk.storage` (RFC 0044, currently a stub) |
| v0.5      | 50–52   | blocked     | Realtime/notifications — live sync requires `sdk.events` (RFC 0045, missing) |
| v0.6      | 60–63   | blocked     | Intelligence — requires assistant/harness integration, `sdk.tools` (RFC 0047, missing) |
| v0.7      | 70–74   | blocked     | Ledger: price history, budgets, recurring, multi-currency, export |

**Do not start v0.2 work until the Phase 1 → Phase 2 migration is designed**
(roadmap.md T-12) — retrofitting `household_id` scoping onto live Phase 1
data without a plan risks a destructive migration.

## UI rules

- Consume `@sovereignfs/ui` components and `--sv-*` tokens exclusively.
- Never hardcode colours, spacing, or radii — always reference tokens.
- **DS-first: this plugin is a consumer.** Three primitives Phase 1 needed
  didn't exist in `@sovereignfs/ui` — all now built there, not plugin-local:
  1. **Checkable list row** (checkbox + icon + label + trailing stepper,
     whole-row tap target, strikethrough-on-checked) — still open, needed
     for T-08.
  2. ✅ **`SuggestionInput`** (text input + anchored async result list, T-05)
     — platform PR [#194](https://github.com/sovereignfs/sovereign/pull/194),
     merged to `main`.
  3. ✅ **`QuantityStepper`** (numeric input with +/− and a unit suffix, T-07)
     — platform PR [#197](https://github.com/sovereignfs/sovereign/pull/197),
     **still open/draft, not yet merged** — this repo's `workspace:*` link to
     `@sovereignfs/ui` only resolves it while the `claude-sv` checkout is on
     `feat/quantity-stepper` (or later, whatever it gets rebased onto once
     merged).

  Also added, ahead of the original three: ✅ **`IconPicker`** (T-06,
  platform PR [#195](https://github.com/sovereignfs/sovereign/pull/195)) plus
  21 curated grocery-item/category icons in `@sovereignfs/ui`'s `Icon` set —
  merged to `main`, but via [#196](https://github.com/sovereignfs/sovereign/pull/196):
  #195 was stacked on #194's branch, and merging #194 into `main` didn't
  retarget it, so it landed on the wrong branch and needed a follow-up
  cherry-pick PR. **Lesson: base new platform-repo PRs directly on `main`,
  don't stack on another open draft** — #197 already followed this.

  See [UI.md](UI.md#engineering-notes) for the full rationale. Do not
  hand-roll plugin-local versions "to be promoted later" — that's exactly
  the pattern `sovereign-tasks`' `TaskItem.tsx` fell into and UI.md flags as
  a mistake not to repeat.
- **Layout**: list switcher (sidebar on desktop, its own screen on mobile,
  ≤768px canonical breakpoint — use `useIsMobile`/`MOBILE_BREAKPOINT_PX`
  from `@sovereignfs/ui`, never a plugin-local number) + a content pane for
  the active list. **Item editing is a `Dialog` (T-07), not a `Sheet`** —
  UI.md screen 4 originally speced a `Sheet`, but `Sheet`'s own doc comment
  says it's "for the mobile case specifically" with "no equivalent
  presentation" on desktop, discovered while implementing T-07; `Dialog`
  already auto-adapts mobile to a full-screen overlay, covering both
  breakpoints without a bespoke desktop layout. Sharing is also a `Dialog`
  (scrim, centered, auto-adapts to a full overlay on mobile) — see UI.md
  screen 5.
- **Icon set resolved** (SPEC.md open question 4 / UI.md open question 1,
  T-06): real curated Lucide SVG icons via `IconPicker`, not emoji. Category
  + keyword-match logic lives in `app/_lib/icons.ts`
  (`suggestCategoryAndIcon`, `resolveIcon`); `addItemToList` auto-assigns an
  icon+category by name keyword when a new catalog product is created;
  `IconPicker` itself is wired into the edit dialog (T-07,
  `ItemEditDialog.tsx`) so a user can override the guess.
- Every mutation needs an inline pending label and expected-error path
  (`useActionState`, shared `ActionResult` convention) — never let a thrown
  error blow past to the platform 500. `app/error.tsx` is required (see
  UI.md screen 10 for its exact copy/behavior).

## Sharing model (Phase 1)

Direct per-user sharing only — no invite link, no email, no acceptance flow.
The owner picks a user via `sdk.directory.searchUsers()`, grants `editor` or
`viewer` on `shopper_list_shares`, and can revoke at any time. This is
deliberately the same pattern as Sovereign Docs' instance sharing. Household
membership (Phase 2) will grant *implicit* access to a household's default
list; `shopper_list_shares` continues to exist unchanged as the mechanism for
sharing a list *beyond* that membership.

## Versioning

This plugin follows its own semver, independent of the platform version:

- `fix/` → patch (0.0.x)
- `feat/` → minor (0.x.0)
- Breaking change → major (x.0.0)

Current version: **0.1.0**

## Running locally

The plugin is mounted into the Sovereign platform during development. From
the platform monorepo root:

```bash
pnpm dev   # starts runtime on :3000; plugin routes are available at /shopper
```

When porting to the standalone `sovereign-shopper` repo, the plugin is
installed via `sv plugin add` and the platform hot-reloads it.

## Open questions (from SPEC.md and UI.md)

1. ✅ **Icon set** — resolved T-06, see UI rules above.
2. ✅ **Quantity stepper unit list** — resolved T-07: a fixed short list
   (pcs/kg/g/lb/L/mL/bag/box/bunch/pack/dozen) via a plain `Select`, not free
   text with autocomplete. `QuantityStepper` itself only owns the numeric
   part — swapping the unit list later doesn't touch that component.
3. ✅ **New-component ownership** — resolved by precedent: `SuggestionInput`
   (T-05), `IconPicker` (T-06), and `QuantityStepper` (T-07) all landed as
   platform-repo PRs opened from this plugin's own roadmap work, not a
   separate prerequisite task. Same pattern applies to the still-open
   checkable-list-row primitive (T-08).
4. **Phase 1 → Phase 2 migration mechanics** — design before starting v0.2
   (roadmap T-12).
