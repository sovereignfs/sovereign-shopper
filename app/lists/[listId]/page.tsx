import { notFound } from 'next/navigation';
import { PageHeader } from '@sovereignfs/ui';
import { getList } from '../../_lib/actions';
import ListHeaderActions from '../../_components/ListHeaderActions';
import styles from './page.module.css';

interface Props {
  params: Promise<{ listId: string }>;
}

/**
 * List detail. Phase 1 (T-02/T-03) ships the header + rename/archive (owner
 * only) here — the item ledger (add/edit/check-off, T-05–T-09) lands in
 * later tasks. Accessible to a shared editor/viewer too (SHP-02), just
 * without the owner-only controls.
 */
export default async function ListDetailPage({ params }: Props) {
  const { listId } = await params;
  const list = await getList(listId);
  if (!list) notFound();

  return (
    <div className={styles.page}>
      <PageHeader
        title={list.name}
        action={list.role === 'owner' ? <ListHeaderActions list={list} /> : undefined}
      />
      <p className={styles.placeholder}>
        Items are coming in a future update — for now this list just holds a name.
      </p>
    </div>
  );
}
