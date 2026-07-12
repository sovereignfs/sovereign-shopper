import type { ReactNode } from 'react';
import { getLists } from './_lib/actions';
import Sidebar from './_components/Sidebar';
import styles from './layout.module.css';

/**
 * Two-pane shell: sidebar (list switcher) + content pane, per UI.md screens
 * 1-2. Phase 1 sidebar shows only "My lists" (owner-scoped) — the "Shared
 * with me" and "Combined view" sections are T-03's job, once sharing (T-10)
 * and the read-only roll-up exist. Mobile (<=768px) currently stacks the two
 * panes instead of the dedicated carousel/switcher screens in UI.md 6-9;
 * that fuller mobile treatment lands with T-03 too.
 */
export default async function ShopperLayout({ children }: { children: ReactNode }) {
  const lists = await getLists();

  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>
        <Sidebar lists={lists} />
      </div>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
