import { getTableName, type Table } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('@sovereignfs/sdk', () => ({
  sdk: {
    auth: { requireSession: vi.fn(async () => ({ user: { id: 'user-1', tenantId: 'tenant-1' } })) },
    db: { getClient: vi.fn(async () => fakeDb) },
    directory: { searchUsers: vi.fn(async () => []), resolveUsers: vi.fn(async () => []) },
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

// getList() runs two lookups: an "owned" select against shopper_lists, then
// (only if that's empty) a "shared" select joining shopper_list_shares to
// shopper_lists. These two arrays are what each test uses to grant a role —
// setting ownedListRows grants 'owner', setting sharedListRows grants
// 'editor'/'viewer', leaving both empty simulates a user with no access at
// all (SHP-01/09's "non-shared user cannot see the list").
let ownedListRows: Record<string, unknown>[] = [];
let sharedListRows: Record<string, unknown>[] = [];

function grantOwner() {
  ownedListRows = [baseList];
  sharedListRows = [];
}
function grantShare(role: 'editor' | 'viewer') {
  ownedListRows = [];
  sharedListRows = [{ list: baseList, role }];
}
function grantNone() {
  ownedListRows = [];
  sharedListRows = [];
}

// Any write that reaches insert/update/delete despite a rejected access
// check is a bug in itself, not just a wrong return value — these throw
// instead of silently no-op'ing so a regression fails loudly.
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
          orderBy: async () => [],
          then(resolve: (rows: unknown[]) => void) {
            resolve([]);
          },
        };
        return builder;
      },
    };
  },
  insert() {
    throw new Error('insert must not run when access is rejected');
  },
  update() {
    throw new Error('update must not run when access is rejected');
  },
  delete() {
    throw new Error('delete must not run when access is rejected');
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  grantNone();
});

describe('getList — access resolution', () => {
  it('returns null for a user with neither ownership nor a share (non-shared user cannot see the list)', async () => {
    grantNone();
    const { getList } = await import('../actions');
    expect(await getList('list-1')).toBeNull();
  });

  it('resolves owner role from an owned list', async () => {
    grantOwner();
    const { getList } = await import('../actions');
    expect((await getList('list-1'))?.role).toBe('owner');
  });

  it('resolves editor/viewer role from a share', async () => {
    grantShare('viewer');
    const { getList } = await import('../actions');
    expect((await getList('list-1'))?.role).toBe('viewer');

    grantShare('editor');
    const { getList: getList2 } = await import('../actions');
    expect((await getList2('list-1'))?.role).toBe('editor');
  });
});

describe('non-shared user cannot see or write to the list', () => {
  beforeEach(() => grantNone());

  it('addItemToList rejects with "List not found."', async () => {
    const { addItemToList } = await import('../actions');
    await expect(addItemToList('list-1', 'Milk')).rejects.toThrow('List not found.');
  });

  it('getListItems returns [] rather than throwing', async () => {
    const { getListItems } = await import('../actions');
    expect(await getListItems('list-1')).toEqual([]);
  });

  it('getListShares returns [] rather than throwing', async () => {
    const { getListShares } = await import('../actions');
    expect(await getListShares('list-1')).toEqual([]);
  });

  it('searchListSuggestions returns [] rather than throwing', async () => {
    const { searchListSuggestions } = await import('../actions');
    expect(await searchListSuggestions('list-1', 'milk')).toEqual([]);
  });
});

describe('a viewer cannot write', () => {
  beforeEach(() => grantShare('viewer'));

  it('addItemToList rejects a viewer', async () => {
    const { addItemToList } = await import('../actions');
    await expect(addItemToList('list-1', 'Milk')).rejects.toThrow(
      "You don't have permission to edit this list.",
    );
  });

  it('updateListItem rejects a viewer', async () => {
    const { updateListItem } = await import('../actions');
    await expect(
      updateListItem('list-1', 'item-1', {
        name: 'Milk',
        quantity: '1',
        unit: null,
        category: null,
        icon: null,
        barcode: null,
        price: null,
      }),
    ).rejects.toThrow("You don't have permission to edit this list.");
  });

  it('deleteListItem rejects a viewer', async () => {
    const { deleteListItem } = await import('../actions');
    await expect(deleteListItem('list-1', 'item-1')).rejects.toThrow(
      "You don't have permission to edit this list.",
    );
  });

  it('toggleItemBought rejects a viewer', async () => {
    const { toggleItemBought } = await import('../actions');
    await expect(toggleItemBought('list-1', 'item-1')).rejects.toThrow(
      "You don't have permission to edit this list.",
    );
  });

  it('clearBoughtItems rejects a viewer', async () => {
    const { clearBoughtItems } = await import('../actions');
    await expect(clearBoughtItems('list-1')).rejects.toThrow(
      "You don't have permission to edit this list.",
    );
  });

  it('reorderItems rejects a viewer', async () => {
    const { reorderItems } = await import('../actions');
    await expect(reorderItems('list-1', ['item-a', 'item-b'])).rejects.toThrow(
      "You don't have permission to edit this list.",
    );
  });
});

describe('owner-only mutations reject non-owner roles', () => {
  it.each(['editor', 'viewer'] as const)('renameList rejects a %s', async (role) => {
    grantShare(role);
    const { renameList } = await import('../actions');
    await expect(renameList('list-1', 'New name')).rejects.toThrow(
      'Only the owner can rename this list.',
    );
  });

  it.each(['editor', 'viewer'] as const)('archiveList rejects a %s', async (role) => {
    grantShare(role);
    const { archiveList } = await import('../actions');
    await expect(archiveList('list-1')).rejects.toThrow('Only the owner can archive this list.');
  });

  it.each(['editor', 'viewer'] as const)('shareList rejects a %s', async (role) => {
    grantShare(role);
    const { shareList } = await import('../actions');
    await expect(shareList('list-1', 'user-2', 'viewer')).rejects.toThrow(
      'Only the owner can share this list.',
    );
  });

  it.each(['editor', 'viewer'] as const)('revokeShare rejects a %s', async (role) => {
    grantShare(role);
    const { revokeShare } = await import('../actions');
    await expect(revokeShare('list-1', 'user-2')).rejects.toThrow(
      'Only the owner can manage sharing.',
    );
  });

  it.each(['editor', 'viewer'] as const)('getListShares returns [] for a %s (owner-only view)', async (role) => {
    grantShare(role);
    const { getListShares } = await import('../actions');
    expect(await getListShares('list-1')).toEqual([]);
  });
});
