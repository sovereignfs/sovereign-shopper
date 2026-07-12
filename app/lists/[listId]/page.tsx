import { notFound } from 'next/navigation';
import { EmptyState, PageHeader } from '@sovereignfs/ui';
import { getList, getListItemDetail, getListItems, setLastList } from '../../_lib/actions';
import AddItemBar from '../../_components/AddItemBar';
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
 * the edit dialog (SHP-06, T-07), and tap-to-buy (SHP-07, T-08). Reorder and
 * group-by-category are T-09 — items render in manual sort order for now.
 * Accessible to a shared editor/viewer too (SHP-02); viewers get read-only
 * rows with no add bar, owner-only controls, checkbox toggle, or edit link.
 * Records itself as the last-opened list (SHP-03) on every visit.
 *
 * Edit dialog is driven by `?item=<id>` (opened via `<Link>`, closed via
 * `router.replace` from inside the dialog — see ItemEditDialog and the
 * platform's intra-overlay navigation rule), not local component state, so
 * the URL stays the source of truth for what's open. The row body's own tap
 * target is the bought/not-bought toggle (SHP-07's "tap an item to mark it
 * bought"), so editing has its own separate entry point (a pencil link in
 * the row's trailing slot, see ItemRow) rather than sharing the row click.
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
        <ul className={styles.items}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <ItemRow listId={listId} item={item} canEdit={canEdit} />
            </li>
          ))}
        </ul>
      )}

      {editingItem && (
        <ItemEditDialog listId={listId} item={editingItem} closeHref={`/shopper/lists/${listId}`} />
      )}
    </div>
  );
}
