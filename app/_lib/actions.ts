'use server';

import { sdk } from '@sovereignfs/sdk';
import { and, asc, desc, eq, inArray, isNull, like } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'node:crypto';
import {
  shopperListItems,
  shopperListShares,
  shopperLists,
  shopperProducts,
  shopperUserState,
} from '../_db/schema';
import { suggestCategoryAndIcon } from './icons';
import type {
  CombinedItemRow,
  ListItemDetail,
  ListItemRow,
  ListRow,
  ProductSuggestion,
  SharedListRow,
} from './types';

/** Trimmed, lowercased form used for catalog dedupe/matching (SHP-04). */
function normalize(name: string): string {
  return name.trim().toLowerCase();
}

// DrizzleClient is typed as `unknown` in the SDK (dialect-agnostic contract).
// We cast to the SQLite type here since the platform default dialect is SQLite.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = BaseSQLiteDatabase<'async', any, any>;

function now() {
  return Math.floor(Date.now() / 1000);
}

async function getContext() {
  const session = await sdk.auth.requireSession();
  const db = (await sdk.db.getClient()) as Db;
  return { db, userId: session.user.id, tenantId: session.user.tenantId };
}

function toListRow(row: typeof shopperLists.$inferSelect, role: ListRow['role']): ListRow {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind === 'household' ? 'household' : 'personal',
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    role,
    ownerUserId: row.ownerUserId,
  };
}

/** Lists owned by the current user, excluding archived ones. */
export async function getLists(): Promise<ListRow[]> {
  const { db, userId, tenantId } = await getContext();
  const rows = await db
    .select()
    .from(shopperLists)
    .where(
      and(
        eq(shopperLists.tenantId, tenantId),
        eq(shopperLists.ownerUserId, userId),
        isNull(shopperLists.archivedAt),
      ),
    )
    .orderBy(shopperLists.createdAt);
  return rows.map((row) => toListRow(row, 'owner'));
}

/** Lists shared with the current user by someone else (SHP-02). Nothing can
 *  populate `shopper_list_shares` yet — sharing UI is T-10 — so this is
 *  always empty until then, but the read path is ready for it. */
export async function getSharedLists(): Promise<SharedListRow[]> {
  const { db, userId, tenantId } = await getContext();
  const rows = await db
    .select({ list: shopperLists, role: shopperListShares.role })
    .from(shopperListShares)
    .innerJoin(shopperLists, eq(shopperListShares.listId, shopperLists.id))
    .where(and(eq(shopperListShares.tenantId, tenantId), eq(shopperListShares.userId, userId)))
    .orderBy(shopperListShares.createdAt);

  const visible = rows.filter((r) => r.list.archivedAt === null);
  if (visible.length === 0) return [];

  const ownerIds = [...new Set(visible.map((r) => r.list.ownerUserId))];
  const owners = await sdk.directory.resolveUsers({ ids: ownerIds });
  const ownerNameById = new Map(owners.map((o) => [o.id, o.name ?? o.email]));

  return visible.map((r) => ({
    id: r.list.id,
    name: r.list.name,
    role: r.role === 'editor' ? 'editor' : 'viewer',
    ownerName: ownerNameById.get(r.list.ownerUserId) ?? 'Someone',
  }));
}

/** A single list the current user can access — owned or shared with them.
 *  Returns null if it doesn't exist, is archived, or the caller has neither
 *  ownership nor a share. */
export async function getList(listId: string): Promise<ListRow | null> {
  const { db, userId, tenantId } = await getContext();

  const [owned] = await db
    .select()
    .from(shopperLists)
    .where(
      and(
        eq(shopperLists.id, listId),
        eq(shopperLists.tenantId, tenantId),
        eq(shopperLists.ownerUserId, userId),
        isNull(shopperLists.archivedAt),
      ),
    )
    .limit(1);
  if (owned) return toListRow(owned, 'owner');

  const [shared] = await db
    .select({ list: shopperLists, role: shopperListShares.role })
    .from(shopperListShares)
    .innerJoin(shopperLists, eq(shopperListShares.listId, shopperLists.id))
    .where(
      and(
        eq(shopperListShares.listId, listId),
        eq(shopperListShares.tenantId, tenantId),
        eq(shopperListShares.userId, userId),
        isNull(shopperLists.archivedAt),
      ),
    )
    .limit(1);
  if (shared) return toListRow(shared.list, shared.role === 'editor' ? 'editor' : 'viewer');

  return null;
}

/** Every list the current user can see, owned or shared — the source set
 *  for the combined view (SHP-02). */
export async function getAccessibleLists(): Promise<{ id: string; name: string }[]> {
  const [owned, shared] = await Promise.all([getLists(), getSharedLists()]);
  return [...owned, ...shared].map((l) => ({ id: l.id, name: l.name }));
}

/** Read-only roll-up of items across every accessible list (SHP-02). Always
 *  empty right now — item CRUD (add/edit/check-off) is T-05–T-09 — but the
 *  aggregation query is ready so this view starts working the moment those
 *  tasks land, with no changes needed here. */
export async function getCombinedItems(): Promise<CombinedItemRow[]> {
  const { db, tenantId } = await getContext();
  const accessible = await getAccessibleLists();
  if (accessible.length === 0) return [];

  const listNameById = new Map(accessible.map((l) => [l.id, l.name]));
  const rows = await db
    .select()
    .from(shopperListItems)
    .where(
      and(
        eq(shopperListItems.tenantId, tenantId),
        inArray(
          shopperListItems.listId,
          accessible.map((l) => l.id),
        ),
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    icon: row.icon,
    checkedAt: row.checkedAt,
    sourceListId: row.listId,
    sourceListName: listNameById.get(row.listId) ?? 'Unknown list',
  }));
}

/** The current user's last-opened list id (SHP-03), or null if never set or
 *  no `shopper_user_state` row exists yet. */
export async function getLastListId(): Promise<string | null> {
  const { db, userId, tenantId } = await getContext();
  const [row] = await db
    .select({ lastListId: shopperUserState.lastListId })
    .from(shopperUserState)
    .where(and(eq(shopperUserState.userId, userId), eq(shopperUserState.tenantId, tenantId)))
    .limit(1);
  return row?.lastListId ?? null;
}

/** Records the list the current user just opened, for SHP-03's landing
 *  redirect. Called from the list detail page on every visit — idempotent
 *  upsert, not gated on ownership since a shared list can be "last used"
 *  too. */
export async function setLastList(listId: string): Promise<void> {
  const { db, userId, tenantId } = await getContext();
  const ts = now();
  await db
    .insert(shopperUserState)
    .values({ userId, tenantId, lastListId: listId, updatedAt: ts })
    .onConflictDoUpdate({
      target: shopperUserState.userId,
      set: { lastListId: listId, updatedAt: ts },
    });
}

export async function createList(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('List name is required.');

  const { db, userId, tenantId } = await getContext();
  const id = randomUUID();
  const ts = now();

  await db.insert(shopperLists).values({
    id,
    tenantId,
    ownerUserId: userId,
    name: trimmed,
    kind: 'personal',
    createdBy: userId,
    createdAt: ts,
    updatedAt: ts,
  });

  return id;
}

export async function renameList(listId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('List name is required.');

  const { db, userId, tenantId } = await getContext();
  await db
    .update(shopperLists)
    .set({ name: trimmed, updatedAt: now() })
    .where(
      and(
        eq(shopperLists.id, listId),
        eq(shopperLists.tenantId, tenantId),
        eq(shopperLists.ownerUserId, userId),
      ),
    );
}

export async function archiveList(listId: string): Promise<void> {
  const { db, userId, tenantId } = await getContext();
  await db
    .update(shopperLists)
    .set({ archivedAt: now(), updatedAt: now() })
    .where(
      and(
        eq(shopperLists.id, listId),
        eq(shopperLists.tenantId, tenantId),
        eq(shopperLists.ownerUserId, userId),
      ),
    );
}

/** Items on a list, in manual order (SHP-04/06/07/08). Access-checked —
 *  returns [] rather than throwing if the caller can't see the list, so a
 *  page render never has to special-case "list not found" twice. */
export async function getListItems(listId: string): Promise<ListItemRow[]> {
  const list = await getList(listId);
  if (!list) return [];

  const { db, tenantId } = await getContext();
  const rows = await db
    .select()
    .from(shopperListItems)
    .where(and(eq(shopperListItems.listId, listId), eq(shopperListItems.tenantId, tenantId)))
    .orderBy(asc(shopperListItems.sortOrder), asc(shopperListItems.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    icon: row.icon,
    checkedAt: row.checkedAt,
    sortOrder: row.sortOrder,
  }));
}

/** Type-ahead suggestions for the add-item bar (SHP-04) — matches against
 *  the *list owner's* catalog, not the acting user's, so an editor
 *  contributing to someone else's list sees (and adds to) that owner's
 *  remembered products. Simple prefix/contains + recency ranking; learned
 *  frequency ranking is v0.3 (T-23), not Phase 1. */
export async function searchListSuggestions(
  listId: string,
  query: string,
): Promise<ProductSuggestion[]> {
  const list = await getList(listId);
  if (!list) return [];
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { db, tenantId } = await getContext();
  const rows = await db
    .select()
    .from(shopperProducts)
    .where(
      and(
        eq(shopperProducts.tenantId, tenantId),
        eq(shopperProducts.ownerUserId, list.ownerUserId),
        like(shopperProducts.normalizedName, `%${normalize(trimmed)}%`),
      ),
    )
    .orderBy(asc(shopperProducts.name))
    .limit(8);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    icon: row.icon,
    defaultUnit: row.defaultUnit,
  }));
}

/** Quick-add (SHP-04): finds or creates a catalog product scoped to the
 *  list's owner, then adds it to the list. Editors can add (they can write
 *  to a list they were given editor access to); viewers cannot — mirrors
 *  the read-only rule already applied to rename/archive. */
export async function addItemToList(listId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Item name is required.');

  const list = await getList(listId);
  if (!list) throw new Error('List not found.');
  if (list.role === 'viewer') throw new Error("You don't have permission to edit this list.");

  const { db, userId, tenantId } = await getContext();
  const normalized = normalize(trimmed);
  const ts = now();

  const [existingProduct] = await db
    .select()
    .from(shopperProducts)
    .where(
      and(
        eq(shopperProducts.tenantId, tenantId),
        eq(shopperProducts.ownerUserId, list.ownerUserId),
        eq(shopperProducts.normalizedName, normalized),
      ),
    )
    .limit(1);

  const product =
    existingProduct ??
    (await (async () => {
      const id = randomUUID();
      // Best-effort category + icon from the name (SHP-05) — a starting
      // guess, not a commitment; the manual picker (T-07) always wins if
      // the user changes it later.
      const { category, icon } = suggestCategoryAndIcon(trimmed);
      await db.insert(shopperProducts).values({
        id,
        tenantId,
        ownerUserId: list.ownerUserId,
        name: trimmed,
        normalizedName: normalized,
        category,
        icon,
        createdBy: userId,
        createdAt: ts,
        updatedAt: ts,
      });
      return { id, name: trimmed, category, icon, defaultUnit: null as string | null };
    })());

  const [lastItem] = await db
    .select({ sortOrder: shopperListItems.sortOrder })
    .from(shopperListItems)
    .where(eq(shopperListItems.listId, listId))
    .orderBy(desc(shopperListItems.sortOrder))
    .limit(1);
  const nextSortOrder = (lastItem?.sortOrder ?? -1) + 1;

  await db.insert(shopperListItems).values({
    id: randomUUID(),
    tenantId,
    listId,
    productId: product.id,
    name: product.name,
    quantity: '1',
    unit: product.defaultUnit,
    category: product.category,
    icon: product.icon,
    sortOrder: nextSortOrder,
    addedBy: userId,
    createdAt: ts,
  });
}

/** Full edit-form detail for one item (SHP-06, T-07) — joins in the linked
 *  product's barcode/price, which don't live on the list-item row itself.
 *  Returns null if the item doesn't exist, isn't on this list, or the
 *  caller can't access the list. */
export async function getListItemDetail(
  listId: string,
  itemId: string,
): Promise<ListItemDetail | null> {
  const list = await getList(listId);
  if (!list) return null;

  const { db, tenantId } = await getContext();
  const [item] = await db
    .select()
    .from(shopperListItems)
    .where(
      and(
        eq(shopperListItems.id, itemId),
        eq(shopperListItems.listId, listId),
        eq(shopperListItems.tenantId, tenantId),
      ),
    )
    .limit(1);
  if (!item) return null;

  let barcode: string | null = null;
  let price: number | null = null;
  if (item.productId) {
    const [product] = await db
      .select({ barcode: shopperProducts.barcode, price: shopperProducts.typicalPrice })
      .from(shopperProducts)
      .where(eq(shopperProducts.id, item.productId))
      .limit(1);
    if (product) {
      barcode = product.barcode;
      price = product.price;
    }
  }

  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    icon: item.icon,
    checkedAt: item.checkedAt,
    sortOrder: item.sortOrder,
    productId: item.productId,
    barcode,
    price,
  };
}

export interface UpdateListItemInput {
  name: string;
  quantity: string;
  unit: string | null;
  category: string | null;
  icon: string | null;
  barcode: string | null;
  /** Cents, or null to clear. */
  price: number | null;
}

/** Saves item edits (SHP-06). Updates the list-item row itself (name,
 *  quantity, unit, category, icon) and, when the item is linked to a
 *  catalog product, the product row too (name, category, icon, default
 *  unit, barcode, price) — "the next add of the same item is pre-filled"
 *  per SPEC.md. Viewers are blocked, same rule as every other write. */
export async function updateListItem(
  listId: string,
  itemId: string,
  input: UpdateListItemInput,
): Promise<void> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error('Item name is required.');

  const list = await getList(listId);
  if (!list) throw new Error('List not found.');
  if (list.role === 'viewer') throw new Error("You don't have permission to edit this list.");

  const { db, tenantId } = await getContext();
  const ts = now();

  const [item] = await db
    .select({ productId: shopperListItems.productId })
    .from(shopperListItems)
    .where(and(eq(shopperListItems.id, itemId), eq(shopperListItems.listId, listId)))
    .limit(1);
  if (!item) throw new Error('Item not found.');

  await db
    .update(shopperListItems)
    .set({
      name: trimmed,
      quantity: input.quantity,
      unit: input.unit,
      category: input.category,
      icon: input.icon,
    })
    .where(and(eq(shopperListItems.id, itemId), eq(shopperListItems.tenantId, tenantId)));

  if (item.productId) {
    await db
      .update(shopperProducts)
      .set({
        name: trimmed,
        normalizedName: normalize(trimmed),
        category: input.category,
        icon: input.icon,
        defaultUnit: input.unit,
        barcode: input.barcode,
        typicalPrice: input.price,
        updatedAt: ts,
      })
      .where(and(eq(shopperProducts.id, item.productId), eq(shopperProducts.tenantId, tenantId)));
  }
}

/** Removes an item from the list (not the catalog product behind it, which
 *  stays for future suggestions). Viewers are blocked. */
export async function deleteListItem(listId: string, itemId: string): Promise<void> {
  const list = await getList(listId);
  if (!list) throw new Error('List not found.');
  if (list.role === 'viewer') throw new Error("You don't have permission to edit this list.");

  const { db, tenantId } = await getContext();
  await db
    .delete(shopperListItems)
    .where(
      and(
        eq(shopperListItems.id, itemId),
        eq(shopperListItems.listId, listId),
        eq(shopperListItems.tenantId, tenantId),
      ),
    );
}
