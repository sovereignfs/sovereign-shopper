import { notFound } from 'next/navigation';
import { EmptyState, Icon, PageHeader } from '@sovereignfs/ui';
import { getList, getListItems, setLastList } from '../../_lib/actions';
import { resolveIcon } from '../../_lib/icons';
import AddItemBar from '../../_components/AddItemBar';
import ListHeaderActions from '../../_components/ListHeaderActions';
import styles from './page.module.css';

interface Props {
  params: Promise<{ listId: string }>;
}

/**
 * List detail. Header + rename/archive (owner only, T-02/T-03), the add-item
 * bar and items themselves (SHP-04, T-05). Tap-to-buy, reorder, and
 * group-by-category are T-08/T-09 — items render as a flat, non-interactive
 * list for now. Accessible to a shared editor/viewer too (SHP-02); viewers
 * don't get the add-item bar or owner-only controls. Records itself as the
 * last-opened list (SHP-03) on every visit.
 */
export default async function ListDetailPage({ params }: Props) {
  const { listId } = await params;
  const list = await getList(listId);
  if (!list) notFound();

  await setLastList(listId);
  const items = await getListItems(listId);

  return (
    <div className={styles.page}>
      <PageHeader
        title={list.name}
        action={list.role === 'owner' ? <ListHeaderActions list={list} /> : undefined}
      />

      {list.role !== 'viewer' && (
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
              <span className={styles.itemIcon}>
                <Icon name={resolveIcon(item.icon, item.category)} size="md" aria-hidden />
              </span>
              <span className={styles.itemName}>{item.name}</span>
              <span className={styles.itemQuantity}>
                {item.quantity}
                {item.unit ? ` ${item.unit}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
