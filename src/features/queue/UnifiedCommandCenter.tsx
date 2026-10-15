import { useState } from 'react';
import { Scissors, Stethoscope } from 'lucide-react';
import type { Reservation } from '../../types';
import QueuePage from './QueuePage';
import AppointmentManager from '../appointment/AppointmentManager';

export default function UnifiedCommandCenter({
  onEditReservation,
  onOpenResume,
  initialMode = 'grooming',
}: {
  onEditReservation: (res: Reservation | null) => void;
  onOpenResume: (res: Reservation) => void;
  initialMode?: 'grooming' | 'clinic';
}) {
  const [mode, setMode] = useState<'grooming' | 'clinic'>(initialMode);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Command Center Operasional</h2>
          <p className="text-[11px] text-slate-500">Satu pintu untuk antrean grooming dan layanan klinik.</p>
        </div>
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Jenis antrean">
          <ModeButton active={mode === 'grooming'} onClick={() => setMode('grooming')} icon={<Scissors size={14} />} label="Grooming" />
          <ModeButton active={mode === 'clinic'} onClick={() => setMode('clinic')} icon={<Stethoscope size={14} />} label="Klinik" />
        </div>
      </div>
      {mode === 'grooming' ? (
        <QueuePage onEditReservation={onEditReservation} onOpenResume={onOpenResume} />
      ) : (
        <AppointmentManager />
      )}
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
        active ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {icon}{label}
    </button>
  );
}
