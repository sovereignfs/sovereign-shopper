'use client';

import { Button, ConfirmDialog } from '@sovereignfs/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { archiveList, renameList } from '../_lib/actions';
import type { ListRow } from '../_lib/types';
import styles from './ListHeaderActions.module.css';

interface Props {
  list: ListRow;
}

export default function ListHeaderActions({ list }: Props) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [archiveOpen, setArchiveOpen] = useState(false);
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

  return (
    <div className={styles.actions}>
      <Button variant="secondary" onClick={() => setRenaming(true)} disabled={pending}>
        Rename
      </Button>
      <Button variant="destructive" onClick={() => setArchiveOpen(true)} disabled={pending}>
        Archive
      </Button>

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
