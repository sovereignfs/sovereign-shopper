import { notFound } from 'next/navigation';
import { EmptyState, Icon, PageHeader } from '@sovereignfs/ui';
import Link from 'next/link';
import { getList, getListItemDetail, getListItems, setLastList } from '../../_lib/actions';
import { resolveIcon } from '../../_lib/icons';
import AddItemBar from '../../_components/AddItemBar';
import ItemEditDialog from '../../_components/ItemEditDialog';
import ListHeaderActions from '../../_components/ListHeaderActions';
import styles from './page.module.css';

interface Props {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ item?: string }>;
}

/**
 * List detail. Header + rename/archive (owner only, T-02/T-03), the add-item
 * bar and items themselves (SHP-04, T-05), per-item icons (SHP-05, T-06),
 * and the edit dialog (SHP-06, T-07). Tap-to-buy, reorder, and
 * group-by-category are T-08/T-09 — items render as a flat list for now.
 * Accessible to a shared editor/viewer too (SHP-02); viewers get read-only
 * rows with no add bar, owner-only controls, or edit affordance. Records
 * itself as the last-opened list (SHP-03) on every visit.
 *
 * Edit dialog is driven by `?item=<id>` (opened via `<Link>`, closed via
 * `router.replace` from inside the dialog — see ItemEditDialog and the
 * platform's intra-overlay navigation rule), not local component state, so
 * the URL stays the source of truth for what's open.
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
          {items.map((item) => {
            const row = (
              <>
                <span className={styles.itemIcon}>
                  <Icon name={resolveIcon(item.icon, item.category)} size="md" aria-hidden />
                </span>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemQuantity}>
                  {item.quantity}
                  {item.unit ? ` ${item.unit}` : ''}
                </span>
              </>
            );
            return (
              <li key={item.id} className={styles.item}>
                {canEdit ? (
                  <Link href={`?item=${item.id}`} className={styles.itemRow}>
                    {row}
                  </Link>
                ) : (
                  <div className={styles.itemRow}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editingItem && (
        <ItemEditDialog listId={listId} item={editingItem} closeHref={`/shopper/lists/${listId}`} />
      )}
    </div>
  );
}
