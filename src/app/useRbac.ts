import { useAppStore } from '../app/store';
import { useAppConfig } from '../data-layer/hooks';

/** RBAC per-tab — paritas dengan isTabAllowed aplikasi lama. */
export function useRbac() {
  const session = useAppStore((s) => s.session);
  const { data: config } = useAppConfig();

  const isAuthenticated = !!session;

  const isTabAllowed = (tab: string): boolean => {
    if (!session) return false;
    if (session.role === 'Administrator') return true;
    const acc = config?.roleAccounts.find((a) => a.role === session.role && a.username === session.username);
    if (!acc || !acc.allowedTabs) return true;
    return acc.allowedTabs.includes(tab);
  };

  return { isAuthenticated, session, isTabAllowed };
}
