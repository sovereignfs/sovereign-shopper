'use client';

import { SuggestionInput, type SuggestionOption } from '@sovereignfs/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { addItemToList, searchListSuggestions } from '../_lib/actions';
import type { ProductSuggestion } from '../_lib/types';

interface Props {
  listId: string;
}

const DEBOUNCE_MS = 200;

function toOption(product: ProductSuggestion): SuggestionOption {
  return {
    id: product.id,
    label: product.name,
    icon: product.icon ?? undefined,
  };
}

/** Add-item bar (SHP-04): type-ahead suggestions from the list owner's
 *  catalog + purchase history, with one-tap quick-add for both a matched
 *  suggestion and free text. */
export default function AddItemBar({ listId }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchListSuggestions(listId, trimmed)
        .then(setSuggestions)
        .finally(() => setSearching(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [listId, query]);

  function commit(name: string) {
    setQuery('');
    setSuggestions([]);
    startTransition(async () => {
      await addItemToList(listId, name);
      router.refresh();
    });
  }

  return (
    <SuggestionInput
      value={query}
      onChange={setQuery}
      options={suggestions.map(toOption)}
      onSelect={(option) => commit(option.label)}
      placeholder="Add an item…"
      aria-label="Add an item"
      loading={searching}
      disabled={pending}
      createLabel={(v) => `Add "${v}" as a new item`}
      onCreate={commit}
    />
  );
}
