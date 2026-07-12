export interface ListRow {
  id: string;
  name: string;
  kind: 'personal' | 'household';
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
  /** The current user's relationship to this list. 'owner' for everything
   *  returned by getLists(); 'editor'/'viewer' only appears on a list
   *  fetched via getList() when it was shared rather than owned. */
  role: 'owner' | 'editor' | 'viewer';
}

/** A list shared with the current user by someone else (SHP-02). */
export interface SharedListRow {
  id: string;
  name: string;
  role: 'editor' | 'viewer';
  ownerName: string;
}

/** One item in the read-only combined roll-up (SHP-02) — a shopper_list_items
 *  row plus which list it came from, so the combined view can tag it. Always
 *  empty until item CRUD (T-05+) ships; the read path is ready ahead of it. */
export interface CombinedItemRow {
  id: string;
  name: string;
  quantity: string;
  unit: string | null;
  category: string | null;
  icon: string | null;
  checkedAt: number | null;
  sourceListId: string;
  sourceListName: string;
}
