import { useAppStore } from './store';
import { useRbac } from './useRbac';

/**
 * Pemilih layanan untuk GUEST: reservasi dan pelacakan status tanpa akun.
 * Staf yang login tidak melihat ini — mereka pakai sidebar.
 */
export default function GuestTabSwitcher() {
  const currentTab = useAppStore((s) => s.currentTab);
  const setTab = useAppStore((s) => s.setTab);
  const { isAuthenticated } = useRbac();

  if (isAuthenticated) return null;

  const options = [
    { id: 'portal' as const, label: '🐾 Reservasi Grooming' },
    { id: 'appointment' as const, label: '🩺 Appointment Dokter' },
    { id: 'tracker' as const, label: '🔎 Cek Status' },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
      <div
        className="mx-auto inline-flex w-full items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        role="tablist"
      >
        {options.map((opt) => {
          const active = currentTab === opt.id || (opt.id === 'portal' && !['appointment', 'tracker'].includes(currentTab));
          return (
            <button
              key={opt.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(opt.id)}
              className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-display text-[10px] font-bold transition-all sm:px-4 sm:text-sm ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
