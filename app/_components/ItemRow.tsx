'use client';

import { CheckableListRow, Icon } from '@sovereignfs/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { swapItemOrder, toggleItemBought } from '../_lib/actions';
import { resolveIcon } from '../_lib/icons';
import type { ListItemRow } from '../_lib/types';
import styles from './ItemRow.module.css';

interface Props {
  listId: string;
  item: ListItemRow;
  /** Viewers see the row read-only — no checkbox toggle, edit link, or
   *  reorder buttons. */
  canEdit: boolean;
  /** Adjacent item id within the same category group (SHP-08) — omit at a
   *  group's start/end to disable that direction's button rather than pass
   *  a swap target that doesn't exist. */
  prevItemId?: string;
  nextItemId?: string;
}

/** One item row (SHP-04–08): tap-to-buy via CheckableListRow, quantity, an
 *  edit entry point, and manual reorder — all in the trailing slot so
 *  nothing but the checkbox toggle lives inside the row's own
 *  `role="checkbox"` tap target (see CheckableListRow's doc comment on why
 *  `trailing` is kept outside that role). */
export default function ItemRow({ listId, item, canEdit, prevItemId, nextItemId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleItemBought(listId, item.id);
      router.refresh();
    });
  }

  function handleMove(targetId: string) {
    startTransition(async () => {
      await swapItemOrder(listId, item.id, targetId);
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
            <>
              <button
                type="button"
                className={styles.moveButton}
                onClick={() => prevItemId && handleMove(prevItemId)}
                disabled={!prevItemId || pending}
                aria-label={`Move ${item.name} up`}
              >
                <Icon name="chevron-up" size="sm" aria-hidden />
              </button>
              <button
                type="button"
                className={styles.moveButton}
                onClick={() => nextItemId && handleMove(nextItemId)}
                disabled={!nextItemId || pending}
                aria-label={`Move ${item.name} down`}
              >
                <Icon name="chevron-down" size="sm" aria-hidden />
              </button>
              <Link
                href={`?item=${item.id}`}
                className={styles.editLink}
                aria-label={`Edit ${item.name}`}
              >
                <Icon name="pencil" size="sm" aria-hidden />
              </Link>
            </>
          )}
        </div>
      }
    />
  );
}
