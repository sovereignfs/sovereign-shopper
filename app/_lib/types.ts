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
  /** Always the list's actual owner, regardless of the current user's role —
   *  the product catalog (SHP-04) is scoped to this id, not the acting
   *  user's, so an editor's suggestions/adds contribute to the owner's
   *  catalog. */
  ownerUserId: string;
}

/** A row from the SHP-04 add-item suggestion dropdown. */
export interface ProductSuggestion {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
  defaultUnit: string | null;
}

/** One item on a list (SHP-04/06/07/08). */
export interface ListItemRow {
  id: string;
  name: string;
  quantity: string;
  unit: string | null;
  category: string | null;
  icon: string | null;
  checkedAt: number | null;
  sortOrder: number;
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
