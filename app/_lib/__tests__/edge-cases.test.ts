import { getTableName, type Table } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sovereignfs/sdk', () => ({
  sdk: {
    auth: { requireSession: vi.fn(async () => ({ user: { id: 'user-1', tenantId: 'tenant-1' } })) },
    db: { getClient: vi.fn(async () => fakeDb) },
    directory: {
      searchUsers: vi.fn(async () => []),
      resolveUsers: vi.fn(async (opts: { ids: string[] }) =>
        opts.ids.map((id) => ({ id, name: 'Owner', email: 'owner@example.com' })),
      ),
    },
  },
}));

const baseList = {
  id: 'list-1',
  tenantId: 'tenant-1',
  ownerUserId: 'owner-1',
  householdId: null,
  name: 'Weekly groceries',
  kind: 'personal',
  createdBy: 'owner-1',
  archivedAt: null,
  createdAt: 1000,
  updatedAt: 1000,
};

let ownedListRows: Record<string, unknown>[] = [];
let sharedListRows: Record<string, unknown>[] = [];
let listItemRows: Record<string, unknown>[] = [];

const fakeDb = {
  select() {
    return {
      from(table: Table) {
        const tableName = getTableName(table);
        const builder = {
          innerJoin() {
            return builder;
          },
          where() {
            return builder;
          },
          limit: async () => {
            if (tableName === 'shopper_lists') return ownedListRows;
            if (tableName === 'shopper_list_shares') return sharedListRows;
            return [];
          },
          orderBy: async () => {
            if (tableName === 'shopper_lists') return ownedListRows;
            if (tableName === 'shopper_list_shares') return sharedListRows;
            if (tableName === 'shopper_list_items') return listItemRows;
            return [];
          },
          then(resolve: (rows: unknown[]) => void) {
            resolve([]);
          },
        };
        return builder;
      },
    };
  },
  insert() {
    return { values: async () => {}, onConflictDoUpdate: async () => {} };
  },
  update() {
    return { set: () => ({ where: async () => {} }) };
  },
  // Revoking is modelled as clearing the single share this suite ever seeds
  // — sufficient to prove the *effect* (a subsequent getList() call for that
  // user resolves to null, not just that the UI stops showing a "shared"
  // badge) rather than re-deriving real WHERE-predicate matching, which this
  // family of fakes doesn't do anywhere in the plugin (see
  // tenant-scoping.test.ts for the one place predicates are inspected).
  delete(table: Table) {
    return {
      async where() {
        if (getTableName(table) === 'shopper_list_shares') sharedListRows = [];
      },
    };
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  ownedListRows = [];
  sharedListRows = [];
  listItemRows = [];
});

describe('empty states', () => {
  it('getLists returns [] for a user who owns no lists', async () => {
    const { getLists } = await import('../actions');
    expect(await getLists()).toEqual([]);
  });

  it('getSharedLists returns [] for a user nothing has been shared with', async () => {
    const { getSharedLists } = await import('../actions');
    expect(await getSharedLists()).toEqual([]);
  });

  it('getAccessibleLists returns [] when there are no owned or shared lists', async () => {
    const { getAccessibleLists } = await import('../actions');
    expect(await getAccessibleLists()).toEqual([]);
  });

  it('getCombinedItems returns [] when there are no accessible lists', async () => {
    const { getCombinedItems } = await import('../actions');
    expect(await getCombinedItems()).toEqual([]);
  });

  it('getListItems returns [] for a list with no items', async () => {
    ownedListRows = [baseList];
    listItemRows = [];
    const { getListItems } = await import('../actions');
    expect(await getListItems('list-1')).toEqual([]);
  });

  it('getLastListId returns null when no shopper_user_state row exists yet', async () => {
    const { getLastListId } = await import('../actions');
    expect(await getLastListId()).toBeNull();
  });
});

describe('revoke-share edge case', () => {
  it('revoking access makes a subsequent getList() call for that user resolve to null', async () => {
    sharedListRows = [{ list: baseList, role: 'viewer' }];
    const { getList, revokeShare } = await import('../actions');

    expect((await getList('list-1'))?.role).toBe('viewer');

    // revokeShare itself runs as the owner (getList's owned branch must
    // resolve first) — grant that for the duration of the revoke call, then
    // switch back to representing the revoked user's view.
    ownedListRows = [baseList];
    await revokeShare('list-1', 'user-2');
    ownedListRows = [];

    expect(await getList('list-1')).toBeNull();
  });
});
