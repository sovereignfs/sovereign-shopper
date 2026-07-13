'use client';

import { Button, ConfirmDialog, Icon, Menu, type MenuEntry, useIsMobile } from '@sovereignfs/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { archiveList, renameList } from '../_lib/actions';
import type { ListRow } from '../_lib/types';
import ShareDialog from './ShareDialog';
import styles from './ListHeaderActions.module.css';

interface Props {
  list: ListRow;
}

export default function ListHeaderActions({ list }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) renameInputRef.current?.focus();
  }, [renaming]);

  function commitRename() {
    const trimmed = name.trim();
    setRenaming(false);
    if (trimmed && trimmed !== list.name) {
      startTransition(async () => {
        await renameList(list.id, trimmed);
        router.refresh();
      });
    }
  }

  function confirmArchive() {
    startTransition(async () => {
      await archiveList(list.id);
      setArchiveOpen(false);
      router.push('/shopper');
      router.refresh();
    });
  }

  if (renaming) {
    return (
      <input
        ref={renameInputRef}
        className={styles.renameInput}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitRename();
          if (e.key === 'Escape') {
            setName(list.name);
            setRenaming(false);
          }
        }}
        aria-label="List name"
      />
    );
  }

  // Three full-width buttons (Share/Rename/Archive) don't fit next to a
  // list-name title on mobile — they either wrapped onto their own line
  // above the title or overlapped it, depending on title length. Folds all
  // three into the same adaptive `⋯` Menu (Popover on desktop, Drawer on
  // mobile) that sovereign-tasks' col-2 header uses for its own list-options
  // menu — desktop keeps the three-button row unchanged; mobile gets one
  // trigger that can never collide with the title regardless of its length.
  const menuItems: MenuEntry[] = [
    { label: 'Share', icon: 'user', onSelect: () => setShareOpen(true) },
    { label: 'Rename', icon: 'pencil', onSelect: () => setRenaming(true) },
    { label: 'Archive', icon: 'trash-2', destructive: true, onSelect: () => setArchiveOpen(true) },
  ];

  return (
    <div className={styles.actions}>
      {isMobile ? (
        <Menu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          align="right"
          aria-label={`Options for "${list.name}"`}
          items={menuItems}
          trigger={
            <button
              type="button"
              className={styles.menuBtn}
              aria-label={`Options for "${list.name}"`}
              onClick={() => setMenuOpen((o) => !o)}
              disabled={pending}
            >
              <Icon name="ellipsis-vertical" size="sm" aria-hidden />
            </button>
          }
        />
      ) : (
        <>
          <Button variant="secondary" onClick={() => setShareOpen(true)} disabled={pending}>
            Share
          </Button>
          <Button variant="secondary" onClick={() => setRenaming(true)} disabled={pending}>
            Rename
          </Button>
          <Button variant="destructive" onClick={() => setArchiveOpen(true)} disabled={pending}>
            Archive
          </Button>
        </>
      )}

      <ShareDialog
        listId={list.id}
        listName={list.name}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Archive list"
        message={
          <>
            Archive <strong>{list.name}</strong>? It stays in the database but disappears from
            your lists.
          </>
        }
        onConfirm={confirmArchive}
        confirmLabel={pending ? 'Archiving…' : 'Archive'}
        destructive
        pending={pending}
      />
    </div>
  );
}
