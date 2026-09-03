import { Menu, Moon, PawPrint, Sun, Plus, LogIn } from 'lucide-react';
import { useAppStore } from '../app/store';
import { useRbac } from './useRbac';
import { useReservations } from '../data-layer/hooks';
import { todayISO } from '../lib/format';

interface HeaderProps {
  onOpenStaffLogin: () => void;
  onOpenAddReservation: () => void;
}

export default function Header({ onOpenStaffLogin, onOpenAddReservation }: HeaderProps) {
  const { isDarkMode, toggleDarkMode, setNavMenuOpen } = useAppStore();
  const { isAuthenticated } = useRbac();
  const { data: reservations = [] } = useReservations();

  const today = todayISO();
  const activeToday = reservations.filter(
    (r) => r.date === today && (r.status === 'Waiting' || r.status === 'In_Progress')
  ).length;

  return (
    <header className="sticky top-0 z-40 border-b border-brand-950/40 bg-brand-900 shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Hamburger hanya untuk staf login di mobile — desktop punya sidebar persisten */}
          {isAuthenticated && (
            <button
              onClick={() => setNavMenuOpen(true)}
              className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu size={20} />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <PawPrint size={18} />
            </div>
            <div>
              <h1 className="font-display text-[15px] leading-tight font-bold text-white">JPC Grooming Hub</h1>
              <p className="text-[10.5px] leading-tight text-white/60">Pet Care Management System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              <div className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400" />
                {activeToday} sesi aktif hari ini
              </div>
              <button
                onClick={onOpenAddReservation}
                className="hidden h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 font-display text-xs font-bold text-brand-800 shadow-sm transition-colors hover:bg-brand-50 sm:inline-flex"
              >
                <Plus size={15} strokeWidth={2.5} />
                Grooming Baru
              </button>
            </>
          )}
          <button
            onClick={toggleDarkMode}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={isDarkMode ? 'Mode terang' : 'Mode gelap'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {!isAuthenticated && (
            <button
              onClick={onOpenStaffLogin}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3.5 font-display text-xs font-bold text-white ring-1 ring-white/25 shadow-sm transition-colors hover:bg-white/20"
            >
              <LogIn size={14} />
              Login Staf
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
