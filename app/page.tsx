import { redirect } from 'next/navigation';
import { EmptyState } from '@sovereignfs/ui';
import { getAccessibleLists, getLastListId, getList } from './_lib/actions';
import CreateListForm from './_components/CreateListForm';
import styles from './page.module.css';

/**
 * Landing page. Falls back to an empty state when the user has no accessible
 * lists yet (SHP-01). Otherwise redirects to the last-opened list (SHP-03,
 * `shopper_user_state.last_list_id`, recorded by the list detail page on
 * every visit); if that list is gone (archived/unshared) or never set,
 * falls back to the first accessible list instead of erroring.
 */
export default async function ShopperHomePage() {
  const accessible = await getAccessibleLists();

  if (accessible.length === 0) {
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

  const lastListId = await getLastListId();
  if (lastListId) {
    const lastList = await getList(lastListId);
    if (lastList) redirect(`/shopper/lists/${lastList.id}`);
  }

  const [fallback] = accessible;
  if (fallback) redirect(`/shopper/lists/${fallback.id}`);
  return null;
}
