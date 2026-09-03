import { DoorOpen, LogOut, PawPrint, X } from 'lucide-react';
import { useAppStore } from '../app/store';
import { useRbac } from './useRbac';
import { TAB_GROUPS } from './tabs';

interface SidebarProps {
  onClose: () => void;
}

/**
 * Navigasi utama KHUSUS staf yang telah login.
 * - Guest / pelanggan self-booking: tidak melihat sidebar sama sekali (return null).
 * - Desktop (>= lg): kolom kiri persisten, konten aplikasi bergeser.
 * - Mobile (< lg): slide-over drawer, dibuka hamburger di header.
 */
export default function Sidebar({ onClose }: SidebarProps) {
  const { isNavMenuOpen, setNavMenuOpen, session } = useAppStore();

  // Sidebar hanya untuk staf yang login — guest self-booking tanpa navigasi
  if (!session) return null;

  return (
    <>
      {/* Desktop — sidebar persisten */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-slate-900 shadow-2xl lg:flex">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile — slide-over drawer */}
      {isNavMenuOpen && (
        <div className="fixed inset-0 z-[45] lg:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setNavMenuOpen(false)}
            aria-hidden
          />
          <aside className="animate-slide-drawer-left relative flex h-full w-72 flex-col bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-end border-b border-slate-800 px-4 py-3">
              <button
                onClick={() => setNavMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const { currentTab, setTab, session, logoutStaff } = useAppStore();
  const { isTabAllowed } = useRbac();

  const handleLogout = () => {
    logoutStaff();
    onClose();
  };

  // Portal tetap bisa diakses staf sebagai pintu masuk pertama
  const homeItems = [{ id: 'portal' as const, label: 'Reservasi Mandiri', icon: DoorOpen }];

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <PawPrint size={18} />
        </div>
        <div>
          <p className="font-display text-sm font-bold text-white">Navigasi</p>
          <p className="text-[10.5px] text-slate-400">JPC Grooming Hub</p>
        </div>
      </div>

      <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-5">
          <p className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">Beranda</p>
          <div className="space-y-0.5">
            {homeItems.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setTab(tab.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all ${
                    active
                      ? 'bg-brand-600 font-semibold text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {TAB_GROUPS.map((group) => {
          const items = group.tabs.filter((t) => isTabAllowed(t.id));
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((tab) => {
                  const Icon = tab.icon;
                  const active = currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setTab(tab.id);
                        onClose();
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all ${
                        active
                          ? 'bg-brand-600 font-semibold text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="mb-2 rounded-lg bg-slate-800/60 px-3 py-2">
          <p className="truncate text-xs font-semibold text-white">{session?.username}</p>
          <p className="text-[10.5px] text-brand-300">{session?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 px-4 py-2 font-display text-xs font-bold text-rose-400 transition-colors hover:bg-rose-500/10"
        >
          <LogOut size={14} />
          Keluar Sesi
        </button>
      </div>
    </>
  );
}
