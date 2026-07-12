'use server';

import { sdk } from '@sovereignfs/sdk';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'node:crypto';
import { shopperListItems, shopperListShares, shopperLists } from '../_db/schema';
import type { CombinedItemRow, ListRow, SharedListRow } from './types';

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
