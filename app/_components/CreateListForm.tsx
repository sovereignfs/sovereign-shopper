'use client';

import { Button } from '@sovereignfs/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createList } from '../_lib/actions';
import styles from './CreateListForm.module.css';

interface Props {
  /** 'inline' renders a compact input+button row (sidebar "+ New list").
   *  'cta' renders a single button that reveals the input on click, for use
   *  as an EmptyState action. */
  variant?: 'inline' | 'cta';
  className?: string;
}

export default function CreateListForm({ variant = 'inline', className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(variant === 'inline');
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && variant === 'cta') inputRef.current?.focus();
  }, [open, variant]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const id = await createList(trimmed);
      setName('');
      if (variant === 'cta') setOpen(false);
      router.push(`/shopper/lists/${id}`);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} className={className}>
        Create list
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className={`${styles.form} ${className ?? ''}`}>
      <input
        ref={inputRef}
        className={styles.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="List name"
        aria-label="List name"
        disabled={pending}
      />
      <Button type="submit" loading={pending} disabled={!name.trim()}>
        Create
      </Button>
    </form>
  );
}
