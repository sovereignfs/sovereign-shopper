'use client';

import { Avatar, Button, Dialog, Select, SuggestionInput } from '@sovereignfs/ui';
import { useEffect, useState, useTransition } from 'react';
import { getListShares, revokeShare, searchDirectoryUsers, shareList } from '../_lib/actions';
import type { DirectoryUserRow, ListShareRow } from '../_lib/types';
import styles from './ShareDialog.module.css';

interface Props {
  listId: string;
  listName: string;
  open: boolean;
  onClose: () => void;
}

const DEBOUNCE_MS = 200;

/** Share dialog (SHP-09, T-10): search-and-add via SuggestionInput (no
 *  create row — picking an existing directory user, not typing free text),
 *  then a "People with access" list with a role Select and a remove button
 *  per share. Owner-only; sharing/role changes/revokes all refresh the
 *  share list from the server rather than assuming the optimistic result. */
export default function ShareDialog({ listId, listName, open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryUserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [shares, setShares] = useState<ListShareRow[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    getListShares(listId).then(setShares);
  }, [open, listId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchDirectoryUsers(trimmed)
        .then(setResults)
        .finally(() => setSearching(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function refreshShares() {
    getListShares(listId).then(setShares);
  }

  function handleAdd(userId: string) {
    setQuery('');
    setResults([]);
    startTransition(async () => {
      await shareList(listId, userId, 'viewer');
      refreshShares();
    });
  }

  function handleRoleChange(userId: string, role: 'editor' | 'viewer') {
    startTransition(async () => {
      await shareList(listId, userId, role);
      refreshShares();
    });
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      await revokeShare(listId, userId);
      refreshShares();
    });
  }

  const sharedIds = new Set(shares.map((s) => s.userId));
  const searchOptions = results
    .filter((u) => !sharedIds.has(u.id))
    .map((u) => ({ id: u.id, label: u.name, meta: u.email }));

  return (
    <Dialog open={open} onClose={onClose} size="md" title="Share list" aria-label="Share list">
      <p className={styles.subtitle}>{listName}</p>

      <SuggestionInput
        value={query}
        onChange={setQuery}
        options={searchOptions}
        onSelect={(option) => handleAdd(option.id)}
        placeholder="Search people by name or email…"
        aria-label="Search people"
        loading={searching}
        disabled={pending}
      />

      <div className={styles.divider} />
      <h3 className={styles.sectionLabel}>People with access</h3>

      <ul className={styles.list}>
        <li className={styles.row}>
          <Avatar name="You" size="sm" />
          <div className={styles.identity}>
            <span className={styles.name}>You</span>
          </div>
          <span className={styles.ownerBadge}>Owner</span>
        </li>
        {shares.map((share) => (
          <li key={share.userId} className={styles.row}>
            <Avatar name={share.name} size="sm" />
            <div className={styles.identity}>
              <span className={styles.name}>{share.name}</span>
            </div>
            <Select
              size="sm"
              value={share.role}
              onChange={(e) => handleRoleChange(share.userId, e.target.value as 'editor' | 'viewer')}
              disabled={pending}
              aria-label={`${share.name}'s access`}
            >
              <option value="editor">Can edit</option>
              <option value="viewer">Can view</option>
            </Select>
            <button
              type="button"
              className={styles.remove}
              onClick={() => handleRemove(share.userId)}
              disabled={pending}
              aria-label={`Remove ${share.name}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  );
}
