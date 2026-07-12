'use client';

import { CheckableListRow, Icon } from '@sovereignfs/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toggleItemBought } from '../_lib/actions';
import { resolveIcon } from '../_lib/icons';
import type { ListItemRow } from '../_lib/types';
import styles from './ItemRow.module.css';

interface Props {
  listId: string;
  item: ListItemRow;
  /** Viewers see the row read-only — no checkbox toggle, no edit link. */
  canEdit: boolean;
}

/** One item row (SHP-04–07): tap-to-buy via CheckableListRow, quantity +
 *  a separate edit entry point in the trailing slot — the row body's tap
 *  target is the bought/not-bought toggle, per SPEC, so editing needs its
 *  own affordance rather than sharing the row click. */
export default function ItemRow({ listId, item, canEdit }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleItemBought(listId, item.id);
      router.refresh();
    });
  }

  return (
    <CheckableListRow
      checked={item.checkedAt !== null}
      onCheckedChange={handleToggle}
      label={item.name}
      icon={<Icon name={resolveIcon(item.icon, item.category)} size="md" aria-hidden />}
      disabled={!canEdit || pending}
      trailing={
        <div className={styles.trailing}>
          <span className={styles.quantity}>
            {item.quantity}
            {item.unit ? ` ${item.unit}` : ''}
          </span>
          {canEdit && (
            <Link
              href={`?item=${item.id}`}
              className={styles.editLink}
              aria-label={`Edit ${item.name}`}
            >
              <Icon name="pencil" size="sm" aria-hidden />
            </Link>
          )}
        </div>
      }
    />
  );
}
