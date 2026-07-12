import { notFound } from 'next/navigation';
import { EmptyState, PageHeader } from '@sovereignfs/ui';
import { getList, getListItemDetail, getListItems, setLastList } from '../../_lib/actions';
import { groupItemsByCategory } from '../../_lib/group';
import AddItemBar from '../../_components/AddItemBar';
import BoughtSection from '../../_components/BoughtSection';
import ItemEditDialog from '../../_components/ItemEditDialog';
import ItemRow from '../../_components/ItemRow';
import ListHeaderActions from '../../_components/ListHeaderActions';
import styles from './page.module.css';

interface Props {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ item?: string }>;
}

/**
 * List detail. Header + rename/archive (owner only, T-02/T-03), the add-item
 * bar and items themselves (SHP-04, T-05), per-item icons (SHP-05, T-06),
 * the edit dialog (SHP-06, T-07), tap-to-buy (SHP-07, T-08), and grouping/
 * reorder/clear (SHP-08, T-09). Accessible to a shared editor/viewer too
 * (SHP-02); viewers get read-only rows with no add bar, owner-only
 * controls, checkbox toggle, edit link, reorder buttons, or clear action.
 * Records itself as the last-opened list (SHP-03) on every visit.
 *
 * Edit dialog is driven by `?item=<id>` (opened via `<Link>`, closed via
 * `router.replace` from inside the dialog — see ItemEditDialog and the
 * platform's intra-overlay navigation rule), not local component state, so
 * the URL stays the source of truth for what's open. The row body's own tap
 * target is the bought/not-bought toggle (SHP-07's "tap an item to mark it
 * bought"), so editing has its own separate entry point (a pencil link in
 * the row's trailing slot, see ItemRow) rather than sharing the row click.
 *
 * Active (unchecked) items group by category (groupItemsByCategory) with
 * up/down reorder buttons scoped to each group, not the whole list — moving
 * an item only ever swaps it with a neighbor in the same category section,
 * matching what's visually adjacent. Bought items collapse into
 * BoughtSection below the groups.
 */
export default async function ListDetailPage({ params, searchParams }: Props) {
  const { listId } = await params;
  const { item: itemId } = await searchParams;
  const list = await getList(listId);
  if (!list) notFound();

  await setLastList(listId);
  const items = await getListItems(listId);
  const canEdit = list.role !== 'viewer';
  const editingItem = canEdit && itemId ? await getListItemDetail(listId, itemId) : null;

  const activeItems = items.filter((item) => item.checkedAt === null);
  const boughtItems = items.filter((item) => item.checkedAt !== null);
  const groups = groupItemsByCategory(activeItems);

  return (
    <div className={styles.page}>
      <PageHeader
        title={list.name}
        action={list.role === 'owner' ? <ListHeaderActions list={list} /> : undefined}
      />

      {canEdit && (
        <div className={styles.addBar}>
          <AddItemBar listId={listId} />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          heading="No items yet"
          description={
            list.role === 'viewer'
              ? "This list doesn't have any items yet."
              : 'Add an item above to get started.'
          }
        />
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.category} className={styles.group}>
              <h2 className={styles.groupLabel}>{group.category}</h2>
              <ul className={styles.items}>
                {group.items.map((item, index) => (
                  <li key={item.id} className={styles.item}>
                    <ItemRow
                      listId={listId}
                      item={item}
                      canEdit={canEdit}
                      prevItemId={index > 0 ? group.items[index - 1]?.id : undefined}
                      nextItemId={
                        index < group.items.length - 1 ? group.items[index + 1]?.id : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <BoughtSection listId={listId} items={boughtItems} canEdit={canEdit} />
        </>
      )}

      {editingItem && (
        <ItemEditDialog listId={listId} item={editingItem} closeHref={`/shopper/lists/${listId}`} />
      )}
    </div>
  );
}
