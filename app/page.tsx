import { EmptyState } from '@sovereignfs/ui';
import { getLists } from './_lib/actions';
import CreateListForm from './_components/CreateListForm';
import styles from './page.module.css';

/**
 * Landing page. Falls back to an empty state when the user has no lists yet
 * (SHP-01). Redirecting to the last-used list when lists exist is T-04's
 * job — for now, having 1+ lists just prompts the user to pick one from the
 * sidebar.
 */
export default async function ShopperHomePage() {
  const lists = await getLists();

  if (lists.length === 0) {
    return (
      <div className={styles.centered}>
        <EmptyState
          icon="package"
          heading="Start your first list"
          description="Add items as you think of them, then check them off at the store."
          action={<CreateListForm variant="cta" />}
        />
      </div>
    );
  }

  return (
    <div className={styles.centered}>
      <EmptyState heading="Choose a list" description="Pick a list from the sidebar to open it." />
    </div>
  );
}
