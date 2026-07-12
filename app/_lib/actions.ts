'use server';

import { sdk } from '@sovereignfs/sdk';
import { and, eq, isNull } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'node:crypto';
import { shopperLists } from '../_db/schema';
import type { ListRow } from './types';

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

function toListRow(row: typeof shopperLists.$inferSelect): ListRow {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind === 'household' ? 'household' : 'personal',
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Lists owned by the current user, excluding archived ones. Phase 1 has no
 *  household or sharing yet — this is the whole "My lists" set. */
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
  return rows.map(toListRow);
}

/** A single list, scoped to the current owner. Returns null if it doesn't
 *  exist, isn't owned by the caller, or is archived. */
export async function getList(listId: string): Promise<ListRow | null> {
  const { db, userId, tenantId } = await getContext();
  const [row] = await db
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
  return row ? toListRow(row) : null;
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
