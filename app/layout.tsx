import type { ReactNode } from 'react';
import { getLists, getSharedLists } from './_lib/actions';
import { registerPortabilityHandlers } from './_lib/portability';
import MobileAwareShell from './_components/MobileAwareShell';

/**
 * Two-pane shell on desktop: sidebar (list switcher) + content pane, per
 * UI.md screens 1-3. Sidebar shows "My lists", "Shared with me" (SHP-02) and
 * a "Combined view" link. Mobile (<=768px) forks to a completely different
 * component tree — a swipeable scroll-snap carousel (`MobileAwareShell` →
 * `MobileShopperCarousel`), the dedicated carousel/switcher screens from
 * UI.md 6-9 — same pattern as sovereign-tasks' mobile shell.
 */
export default async function ShopperLayout({ children }: { children: ReactNode }) {
  // In-process and reset on restart — the platform SDK requires
  // re-registering from a request-scoped plugin route, so this runs on
  // every request. Best-effort: a registration failure must not block the
  // plugin's own UI (matches sovereign-tasks' layout.tsx).
  try {
    await registerPortabilityHandlers();
  } catch {
    // Portability is a best-effort platform integration.
  }

  const [lists, sharedLists] = await Promise.all([getLists(), getSharedLists()]);

  return (
    <MobileAwareShell lists={lists} sharedLists={sharedLists}>
      {children}
    </MobileAwareShell>
  );
}
