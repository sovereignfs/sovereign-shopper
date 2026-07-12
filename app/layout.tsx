import type { ReactNode } from 'react';
import { getLists, getSharedLists } from './_lib/actions';
import Sidebar from './_components/Sidebar';
import styles from './layout.module.css';

/**
 * Two-pane shell: sidebar (list switcher) + content pane, per UI.md screens
 * 1-3. Sidebar shows "My lists", "Shared with me" (SHP-02 — always empty
 * until sharing UI, T-10, ships; the read path is ready ahead of it), and a
 * "Combined view" link. Mobile (<=768px) currently stacks the two panes
 * instead of the dedicated carousel/switcher screens in UI.md 6-9; that
 * fuller mobile treatment is a later refinement, not required for the SHP-02
 * read-only roll-up itself.
 */
export default async function ShopperLayout({ children }: { children: ReactNode }) {
  const [lists, sharedLists] = await Promise.all([getLists(), getSharedLists()]);

  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>
        <Sidebar lists={lists} sharedLists={sharedLists} />
      </div>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
