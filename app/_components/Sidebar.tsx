'use client';

import { ConfirmDialog, Icon } from '@sovereignfs/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { archiveList, renameList } from '../_lib/actions';
import type { ListRow, SharedListRow } from '../_lib/types';
import CreateListForm from './CreateListForm';
import styles from './Sidebar.module.css';

interface Props {
  lists: ListRow[];
  sharedLists: SharedListRow[];
}

export default function Sidebar({ lists, sharedLists }: Props) {
  const pathname = usePathname();
  const accessibleCount = lists.length + sharedLists.length;
  const combinedHref = '/shopper/combined';
  const combinedActive = pathname === combinedHref;
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<ListRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) renameInputRef.current?.focus();
  }, [editingId]);

  function startRename(list: ListRow) {
    setEditingId(list.id);
    setEditName(list.name);
  }

  function commitRename(list: ListRow) {
    const trimmed = editName.trim();
    setEditingId(null);
    if (trimmed && trimmed !== list.name) {
      startTransition(async () => {
        await renameList(list.id, trimmed);
        router.refresh();
      });
    }
  }

  function confirmArchive() {
    const list = archiveTarget;
    if (!list) return;
    startTransition(async () => {
      await archiveList(list.id);
      setArchiveTarget(null);
      if (pathname === `/shopper/lists/${list.id}`) router.push('/shopper');
      router.refresh();
    });
  }

  return (
    <nav className={styles.nav} aria-label="Your lists">
      <div className={styles.header}>
        <span className={styles.wordmark}>Shopper</span>
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>My lists</span>
        <button
          type="button"
          className={styles.newListButton}
          aria-label="New list"
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" size="sm" aria-hidden />
        </button>
      </div>

      {adding && (
        <div className={styles.newListRow}>
          <CreateListForm variant="inline" open={adding} onOpenChange={setAdding} />
        </div>
      )}

      <ul className={styles.list}>
        {lists.map((list) => {
          const href = `/shopper/lists/${list.id}`;
          const active = pathname === href;
          return (
            <li key={list.id} className={styles.item}>
              {editingId === list.id ? (
                <input
                  ref={renameInputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => commitRename(list)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(list);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  aria-label={`Rename ${list.name}`}
                  className={styles.renameInput}
                />
              ) : (
                <>
                  <Link
                    href={href}
                    className={active ? `${styles.link} ${styles.linkActive}` : styles.link}
                  >
                    {list.name}
                  </Link>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.rowAction}
                      onClick={() => startRename(list)}
                      aria-label={`Rename ${list.name}`}
                      disabled={pending}
                    >
                      <Icon name="pencil" size="sm" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.rowAction}
                      onClick={() => setArchiveTarget(list)}
                      aria-label={`Archive ${list.name}`}
                      disabled={pending}
                    >
                      <Icon name="trash-2" size="sm" aria-hidden />
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className={`${styles.sectionHeader} ${styles.sectionHeaderSpaced}`}>
        <span className={styles.sectionLabel}>Shared with me</span>
      </div>

      {sharedLists.length === 0 ? (
        <p className={styles.emptyHint}>Nothing shared with you yet</p>
      ) : (
        <ul className={styles.list}>
          {sharedLists.map((list) => {
            const href = `/shopper/lists/${list.id}`;
            const active = pathname === href;
            return (
              <li key={list.id} className={styles.item}>
                <Link
                  href={href}
                  className={active ? `${styles.link} ${styles.linkActive}` : styles.link}
                >
                  <span className={styles.sharedName}>{list.name}</span>
                  <span className={styles.sharedMeta}>
                    Shared by {list.ownerName} · {list.role === 'editor' ? 'Can edit' : 'Can view'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.divider} />

      {accessibleCount >= 2 ? (
        <Link
          href={combinedHref}
          className={
            combinedActive
              ? `${styles.combinedLink} ${styles.combinedLinkActive}`
              : styles.combinedLink
          }
        >
          Combined view
        </Link>
      ) : (
        <div className={styles.combinedDisabled}>
          <span>Combined view</span>
          <span className={styles.combinedHint}>Available once you have 2+ lists</span>
        </div>
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        title="Archive list"
        message={
          <>
            Archive <strong>{archiveTarget?.name}</strong>? You can&apos;t undo this from here
            yet — the list and its items stay in the database but disappear from your lists.
          </>
        }
        onConfirm={confirmArchive}
        confirmLabel={pending ? 'Archiving…' : 'Archive'}
        destructive
        pending={pending}
      />
    </nav>
  );
}
