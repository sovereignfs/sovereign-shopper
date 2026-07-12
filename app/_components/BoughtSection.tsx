'use client';

import { Icon } from '@sovereignfs/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { clearBoughtItems } from '../_lib/actions';
import type { ListItemRow } from '../_lib/types';
import ItemRow from './ItemRow';
import styles from './BoughtSection.module.css';

interface Props {
  listId: string;
  items: ListItemRow[];
  canEdit: boolean;
}

/** Collapsed "Bought (N)" section (SHP-08) below the active category
 *  groups, with a "Clear bought items" action that permanently removes
 *  them from the list (purchase history stays — see clearBoughtItems). */
export default function BoughtSection({ listId, items, canEdit }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  function handleClear() {
    startTransition(async () => {
      await clearBoughtItems(listId);
      router.refresh();
    });
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <button type="button" className={styles.toggle} onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" aria-hidden />
          Bought ({items.length})
        </button>
        {canEdit && (
          <button type="button" className={styles.clear} onClick={handleClear} disabled={pending}>
            {pending ? 'Clearing…' : 'Clear bought items'}
          </button>
        )}
      </div>
      {open && (
        <ul className={styles.items}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <ItemRow listId={listId} item={item} canEdit={canEdit} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
