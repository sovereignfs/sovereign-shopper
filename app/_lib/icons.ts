import type { IconName } from '@sovereignfs/ui';

/**
 * Per-item icon (SHP-05) — curated icon set + category-mapped fallback.
 * SPEC.md open question 4 resolved: real Lucide SVG icons via
 * `@sovereignfs/ui`'s `IconPicker` (packages/ui PR #195), not emoji or
 * per-plugin assets. AI-generated unique icons are v0.6 (out of scope) —
 * Phase 1 settles for category-level curation, per SPEC's own framing.
 *
 * Two tiers, cheapest match wins:
 * 1. A specific item-name keyword match (`suggestCategoryAndIcon`) — covers
 *    the common items curated in `packages/ui`'s grocery icon set.
 * 2. A category fallback (`getCategoryIcon`) — for items whose name doesn't
 *    match a keyword but do have a category (set manually via the icon
 *    picker in T-07, or later, T-23's learned suggestions).
 * `DEFAULT_ICON` covers everything else.
 *
 * Applied automatically on create (`addItemToList` in actions.ts) so items
 * get a sensible icon before the manual picker (T-07) exists — re-picking
 * later always wins, this is only ever a starting guess.
 */

export const CATEGORIES = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Beverages',
  'Household',
  'Frozen',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICON: Record<Category, IconName> = {
  Produce: 'salad',
  'Dairy & Eggs': 'milk',
  'Meat & Seafood': 'drumstick',
  Bakery: 'croissant',
  Pantry: 'package',
  Beverages: 'cup-soda',
  Household: 'spray-can',
  Frozen: 'snowflake',
};

/** The full curated grocery icon set, for `IconPicker`'s `options` prop. */
export const GROCERY_ICONS: readonly IconName[] = [
  'banana',
  'apple',
  'carrot',
  'salad',
  'egg',
  'milk',
  'beef',
  'drumstick',
  'fish',
  'croissant',
  'cookie',
  'pizza',
  'candy',
  'coffee',
  'wine',
  'beer',
  'cup-soda',
  'spray-can',
  'snowflake',
  'package',
  'shopping-basket',
];

export const DEFAULT_ICON: IconName = 'shopping-basket';

interface KeywordMatch {
  keywords: string[];
  category: Category;
  icon: IconName;
}

/** Curated, not exhaustive — new keywords are cheap to add as real usage
 *  surfaces gaps. Order matters: first match wins, so more specific item
 *  names (e.g. "banana") are listed before broader category catch-alls
 *  (e.g. generic produce). */
const KEYWORD_MATCHES: readonly KeywordMatch[] = [
  { keywords: ['banana'], category: 'Produce', icon: 'banana' },
  { keywords: ['apple'], category: 'Produce', icon: 'apple' },
  { keywords: ['carrot'], category: 'Produce', icon: 'carrot' },
  {
    keywords: [
      'lettuce',
      'spinach',
      'kale',
      'salad',
      'tomato',
      'onion',
      'pepper',
      'cucumber',
      'broccoli',
      'avocado',
      'potato',
    ],
    category: 'Produce',
    icon: 'salad',
  },
  { keywords: ['egg'], category: 'Dairy & Eggs', icon: 'egg' },
  { keywords: ['milk'], category: 'Dairy & Eggs', icon: 'milk' },
  {
    keywords: ['cheese', 'yogurt', 'yoghurt', 'butter', 'cream'],
    category: 'Dairy & Eggs',
    icon: 'milk',
  },
  { keywords: ['chicken', 'turkey'], category: 'Meat & Seafood', icon: 'drumstick' },
  { keywords: ['beef', 'steak', 'pork', 'bacon', 'ham'], category: 'Meat & Seafood', icon: 'beef' },
  {
    keywords: ['fish', 'salmon', 'shrimp', 'seafood', 'tuna'],
    category: 'Meat & Seafood',
    icon: 'fish',
  },
  {
    keywords: ['bread', 'bagel', 'croissant', 'muffin', 'bun', 'roll'],
    category: 'Bakery',
    icon: 'croissant',
  },
  { keywords: ['cookie', 'cracker'], category: 'Bakery', icon: 'cookie' },
  { keywords: ['coffee'], category: 'Beverages', icon: 'coffee' },
  { keywords: ['wine'], category: 'Beverages', icon: 'wine' },
  { keywords: ['beer'], category: 'Beverages', icon: 'beer' },
  {
    keywords: ['soda', 'cola', 'juice', 'water', 'tea', 'drink'],
    category: 'Beverages',
    icon: 'cup-soda',
  },
  { keywords: ['candy', 'chocolate'], category: 'Pantry', icon: 'candy' },
  { keywords: ['pizza'], category: 'Pantry', icon: 'pizza' },
  {
    keywords: ['soap', 'detergent', 'paper towel', 'tissue', 'cleaner', 'sponge'],
    category: 'Household',
    icon: 'spray-can',
  },
  { keywords: ['frozen', 'ice cream'], category: 'Frozen', icon: 'snowflake' },
];

export interface CategoryIconSuggestion {
  category: Category | null;
  icon: IconName;
}

/** Best-effort category + icon from an item's name, for auto-assignment on
 *  create. Falls back to no category + the generic default icon when
 *  nothing matches — never guesses wrong on purpose. */
export function suggestCategoryAndIcon(name: string): CategoryIconSuggestion {
  const normalized = name.trim().toLowerCase();
  for (const match of KEYWORD_MATCHES) {
    if (match.keywords.some((keyword) => normalized.includes(keyword))) {
      return { category: match.category, icon: match.icon };
    }
  }
  return { category: null, icon: DEFAULT_ICON };
}

/** Icon for a known category, or the generic default when `category` is
 *  null/unrecognized (e.g. a category set by a future free-text field). */
export function getCategoryIcon(category: string | null): IconName {
  if (category && (CATEGORIES as readonly string[]).includes(category)) {
    return CATEGORY_ICON[category as Category];
  }
  return DEFAULT_ICON;
}

/** Safe resolver for rendering: `icon`/`category` come from a free-text DB
 *  column, not the `IconName` union, so a stale or unrecognized value must
 *  never reach `<Icon name>` directly (it does an unchecked lookup). Falls
 *  through icon → category → default. */
export function resolveIcon(icon: string | null, category: string | null): IconName {
  if (icon && (GROCERY_ICONS as readonly string[]).includes(icon)) {
    return icon as IconName;
  }
  return getCategoryIcon(category);
}
