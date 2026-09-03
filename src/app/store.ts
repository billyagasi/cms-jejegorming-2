import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TabId =
  | 'portal'
  | 'appointment'
  | 'appointments'
  | 'queue'
  | 'profile'
  | 'scheduler'
  | 'reminder'
  | 'steps'
  | 'setup'
  | 'logs'
  | 'laporan'
  | 'inventaris'
  | 'activityLogs'
  | 'pos';

export interface StaffUser {
  username: string;
  role: string;
}

interface AppState {
  currentTab: TabId;
  setTab: (tab: TabId) => void;

  /** Drawer mobile sidebar (staff) — tidak dipersist, mengikuti lebar layar */
  isNavMenuOpen: boolean;
  setNavMenuOpen: (open: boolean) => void;

  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;

  /** Sesi staf yang login (null = belum login backoffice) */
  session: StaffUser | null;
  loginStaff: (user: StaffUser) => void;
  logoutStaff: () => void;

  /** Prefill portal dari kalender (quick-book) */
  portalPrefill: { date?: string; slot?: string } | null;
  setPortalPrefill: (prefill: { date?: string; slot?: string } | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentTab: 'portal',
      setTab: (tab) => set({ currentTab: tab }),

      isNavMenuOpen: false,
      setNavMenuOpen: (open) => set({ isNavMenuOpen: open }),

      isDarkMode: false,
      toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
      setDarkMode: (v) => set({ isDarkMode: v }),

      session: null,
      loginStaff: (user) => set({ session: user }),
      logoutStaff: () => set({ session: null, currentTab: 'portal' }),

      portalPrefill: null,
      setPortalPrefill: (prefill) => set({ portalPrefill: prefill }),
    }),
    {
      name: 'jpc_app_state',
      partialize: (s) => ({
        isDarkMode: s.isDarkMode,
        session: s.session,
      }),
    }
  )
);

// --- Sesi owner (akses keuangan) dengan timeout inaktivitas 10 menit ---

const OWNER_TIMEOUT_MS = 10 * 60 * 1000;

interface OwnerState {
  isOwnerAuthenticated: boolean;
  setOwnerAuthenticated: (v: boolean) => void;
}

export const useOwnerStore = create<OwnerState>()(
  persist(
    (set) => ({
      isOwnerAuthenticated: false,
      setOwnerAuthenticated: (v) => set({ isOwnerAuthenticated: v }),
    }),
    { name: 'jpc_owner_state' }
  )
);

let ownerActivityTimer: number | null = null;

function touchOwnerActivity(): void {
  try {
    localStorage.setItem('jpc_owner_auth_time', String(Date.now()));
  } catch {
    /* diabaikan */
  }
}

/** Mulai watchdog inaktivitas owner; return cleanup */
export function startOwnerActivityWatch(onExpire: () => void): () => void {
  touchOwnerActivity();
  const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
  events.forEach((e) => window.addEventListener(e, touchOwnerActivity));
  ownerActivityTimer = window.setInterval(() => {
    try {
      const ts = Number(localStorage.getItem('jpc_owner_auth_time') || '0');
      if (Date.now() - ts >= OWNER_TIMEOUT_MS) onExpire();
    } catch {
      onExpire();
    }
  }, 10_000);
  return () => {
    events.forEach((e) => window.removeEventListener(e, touchOwnerActivity));
    if (ownerActivityTimer) {
      clearInterval(ownerActivityTimer);
      ownerActivityTimer = null;
    }
  };
}
