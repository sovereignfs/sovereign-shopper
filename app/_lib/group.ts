import type { ListItemRow } from './types';

export interface CategoryGroup {
  category: string;
  items: ListItemRow[];
}

const UNCATEGORIZED = 'Uncategorized';

/** Groups active (unchecked) items by category for the list view (SHP-08),
 *  preserving each item's `sort_order` within its group and ordering groups
 *  by their first item's `sort_order` (so the group layout doesn't jump
 *  around as items are added). Items with no category land in a trailing
 *  "Uncategorized" group. Pure — takes the already sort_order-sorted list
 *  from getListItems(), doesn't hit the DB itself. */
export function groupItemsByCategory(items: ListItemRow[]): CategoryGroup[] {
  const groups = new Map<string, ListItemRow[]>();
  for (const item of items) {
    const key = item.category ?? UNCATEGORIZED;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const entries = [...groups.entries()];
  // Uncategorized always sorts last, regardless of when it first appeared.
  entries.sort((a, b) => {
    if (a[0] === UNCATEGORIZED) return 1;
    if (b[0] === UNCATEGORIZED) return -1;
    return 0; // stable: Map preserves first-appearance insertion order otherwise
  });

  return entries.map(([category, groupItems]) => ({ category, items: groupItems }));
}
