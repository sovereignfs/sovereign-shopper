import { EmptyState, Icon, PageHeader } from '@sovereignfs/ui';
import { getCombinedItems } from '../_lib/actions';
import { resolveIcon } from '../_lib/icons';
import styles from './page.module.css';

/**
 * Read-only roll-up of items across every list the user can access (SHP-02).
 * SPEC.md open question 5 resolves this as read-only for Phase 1 — check
 * items off from their own list instead. Always shows the empty state today
 * since item CRUD (T-05–T-09) hasn't shipped yet; the aggregation query is
 * ready ahead of it (see getCombinedItems).
 */
export default async function CombinedViewPage() {
  const items = await getCombinedItems();

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.category ?? 'Uncategorized';
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  return (
    <div className={styles.page}>
      <PageHeader title="All lists" description="Everything across your accessible lists" />

      <div className={styles.banner}>
        Read-only — check items off from their own list to keep this view simple.
      </div>

      {items.length === 0 ? (
        <EmptyState
          heading="No items yet"
          description="Items you add to your lists will show up here once you start adding them."
        />
      ) : (
        <div className={styles.groups}>
          {[...grouped.entries()].map(([category, categoryItems]) => (
            <section key={category} className={styles.group}>
              <h2 className={styles.groupLabel}>{category}</h2>
              <ul className={styles.itemList}>
                {categoryItems.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <span className={styles.itemIcon}>
                      <Icon name={resolveIcon(item.icon, item.category)} size="md" aria-hidden />
                    </span>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.sourceTag}>{item.sourceListName}</span>
                    <span className={styles.quantity}>
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
