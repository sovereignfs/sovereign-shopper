'use client';

import { Dialog, FormField, IconPicker, Input, QuantityStepper, Select } from '@sovereignfs/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteListItem, updateListItem } from '../_lib/actions';
import { CATEGORIES, GROCERY_ICONS, resolveIcon } from '../_lib/icons';
import type { ListItemDetail } from '../_lib/types';
import styles from './ItemEditDialog.module.css';

interface Props {
  listId: string;
  item: ListItemDetail;
  /** Where the close button/backdrop navigates — the list page with no
   *  `?item=` param, per the platform's intra-overlay navigation rule
   *  (`<Link replace>`, not `router.back()`). */
  closeHref: string;
}

function toDollarsInput(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2);
}

function toCents(dollars: string): number | null {
  const trimmed = dollars.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : Math.round(parsed * 100);
}

export default function ItemEditDialog({ listId, item, closeHref }: Props) {
  const router = useRouter();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(Number.parseFloat(item.quantity) || 0);
  const [unit, setUnit] = useState(item.unit ?? '');
  const [category, setCategory] = useState(item.category ?? '');
  const [icon, setIcon] = useState(resolveIcon(item.icon, item.category));
  const [barcode, setBarcode] = useState(item.barcode ?? '');
  const [price, setPrice] = useState(toDollarsInput(item.price));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    router.replace(closeHref, { scroll: false });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Item name is required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateListItem(listId, item.id, {
          name: trimmed,
          quantity: String(quantity),
          unit: unit || null,
          category: category || null,
          icon,
          barcode: barcode.trim() || null,
          price: toCents(price),
        });
        router.replace(closeHref, { scroll: false });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save changes.');
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      try {
        await deleteListItem(listId, item.id);
        router.replace(closeHref, { scroll: false });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not remove item.');
      }
    });
  }

  return (
    <Dialog open onClose={close} size="md" title="Edit item" aria-label="Edit item">
      <form onSubmit={handleSave} className={styles.form}>
        <FormField label="Name" id="item-name">
          {(field) => (
            <Input
              {...field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          )}
        </FormField>

        <div className={styles.row}>
          <FormField label="Quantity" id="item-quantity">
            {() => (
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                step={1}
                min={0}
                aria-label="Quantity"
                disabled={pending}
              />
            )}
          </FormField>

          <FormField label="Unit" id="item-unit">
            {(field) => (
              <Select
                {...field}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={pending}
              >
                <option value="">No unit</option>
                <option value="pcs">pcs</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="lb">lb</option>
                <option value="L">L</option>
                <option value="mL">mL</option>
                <option value="bag">bag</option>
                <option value="box">box</option>
                <option value="bunch">bunch</option>
                <option value="pack">pack</option>
                <option value="dozen">dozen</option>
              </Select>
            )}
          </FormField>
        </div>

        <div className={styles.row}>
          <FormField label="Category" id="item-category">
            {(field) => (
              <Select
                {...field}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={pending}
              >
                <option value="">Uncategorized</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label="Icon" id="item-icon">
            {() => (
              <IconPicker
                value={icon}
                onChange={setIcon}
                options={GROCERY_ICONS}
                aria-label="Item icon"
                triggerLabel="Change icon"
                disabled={pending}
              />
            )}
          </FormField>
        </div>

        <FormField label="Barcode" hint="Optional — barcode scanning comes in a later update." id="item-barcode">
          {(field) => (
            <Input
              {...field}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter manually"
              disabled={pending}
            />
          )}
        </FormField>

        <FormField label="Price" hint="Optional." id="item-price">
          {(field) => (
            <Input
              {...field}
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              disabled={pending}
            />
          )}
        </FormField>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.remove}
            onClick={handleRemove}
            disabled={pending}
          >
            Remove from list
          </button>
          <button type="submit" className={styles.save} disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
