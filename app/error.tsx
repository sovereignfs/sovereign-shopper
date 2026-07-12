'use client';

import { Button } from '@sovereignfs/ui';
import styles from './error.module.css';

/**
 * Plugin-scoped error boundary — every plugin ships one so an unexpected
 * error degrades to a plain message here, never the bare platform 500. See
 * UI.md screen 10 for the design rationale.
 */
export default function ShopperError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={styles.centered}>
      <h2 className={styles.heading}>Something went wrong</h2>
      <p className={styles.description}>
        Shopper hit a snag loading your lists. Your data is safe — this is just a display
        hiccup.
      </p>
      <Button onClick={reset}>Try again</Button>
      <p className={styles.hint}>If this keeps happening, contact your instance admin.</p>
    </div>
  );
}
