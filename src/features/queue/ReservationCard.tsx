import { useState } from 'react';
import { Calendar, ChevronDown, Phone, User, X, ClipboardCheck, Trash2, Truck } from 'lucide-react';
import { Reservation, ReservationStatus } from '../../types';
import { formatRupiah } from '../../lib/format';

const petTypeStyles: Record<string, { ribbon: string; iconBg: string; emoji: string }> = {
  Kucing: { ribbon: 'bg-sky-400', iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400', emoji: '🐱' },
  Anjing: { ribbon: 'bg-amber-400', iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400', emoji: '🐶' },
  Lainnya: { ribbon: 'bg-emerald-400', iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400', emoji: '🐾' },
};

const statusBadge: Record<ReservationStatus, string> = {
  Completed:
    'bg-brand-50 border border-brand-200 text-brand-700 dark:bg-brand-950/60 dark:border-brand-800 dark:text-brand-300',
  In_Progress:
    'bg-brand-100 border border-brand-300 text-brand-800 animate-pulse-soft dark:bg-brand-950 dark:border-brand-800 dark:text-brand-300',
  Cancelled: 'bg-slate-100 border border-slate-300 text-slate-500 dark:bg-slate-800 dark:border-slate-700',
  Waiting: 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300',
};

interface ReservationCardProps {
  res: Reservation;
  onEdit: (res: Reservation) => void;
  onStart: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenResume: (res: Reservation) => void;
  onGoSteps: () => void;
}

export default function ReservationCard({ res, onEdit, onStart, onCancel, onDelete, onOpenResume, onGoSteps }: ReservationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isCompleted = res.status === 'Completed';
  const isInProgress = res.status === 'In_Progress';
  const isCancelled = res.status === 'Cancelled';
  const isWaiting = res.status === 'Waiting';
  const style = petTypeStyles[res.petType] || petTypeStyles.Lainnya;

  const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dateObj = new Date(res.date);
  const formattedDateStr = `${daysOfWeek[dateObj.getDay()] || ''}, ${res.date.split('-').reverse().join('/')}`;

  const completedSteps = (res.steps || []).filter((s) => s.status === 'completed').length;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-slate-900 ${
        isCancelled
          ? 'border-slate-200 opacity-60 dark:border-slate-800'
          : isCompleted
            ? 'border-brand-200 dark:border-brand-800'
            : isInProgress
              ? 'border-brand-300 ring-1 ring-brand-100 dark:border-brand-700'
              : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className={`absolute top-0 left-0 h-full w-1.5 ${style.ribbon}`} />

      {/* Header badges */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">ID: {res.id}</span>
        <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${statusBadge[res.status]}`}>
          {res.status.replace('_', ' ')}
        </span>
      </div>

      {/* Identity */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <div className={`shrink-0 rounded-xl p-2.5 ${style.iconBg}`}>
            <span className="text-xl leading-none">{style.emoji}</span>
          </div>
          <div>
            <h4 className="font-display text-sm leading-none font-bold text-slate-900 dark:text-white">
              {res.petName} <span className="text-xs font-semibold text-slate-500">({res.petType})</span>
            </h4>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              📅 {formattedDateStr} • 🕒 {res.timeSlot}
            </p>
            {/* Mini step tracker */}
            <div className="mt-2 flex items-center gap-1">
              {res.steps?.map((step) => (
                <span
                  key={step.id}
                  title={`${step.name} — ${step.status}`}
                  className={`h-1.5 w-7 rounded-full ${
                    step.status === 'completed'
                      ? 'bg-emerald-500'
                      : step.status === 'ongoing'
                        ? 'animate-pulse-soft bg-amber-500'
                        : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
              <span className="ml-1.5 text-[10px] font-bold text-slate-400">Progres: {completedSteps}/5</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-fit cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 font-bold text-brand-700 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:text-brand-300 dark:hover:bg-slate-800"
          title={expanded ? 'Sembunyikan detail' : 'Lihat Pemilik & Grooming'}
        >
          <span className="text-[10px]">{expanded ? 'Tutup' : 'Detail'}</span>
          <ChevronDown size={13} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="animate-fade-in mt-4 space-y-2 border-t border-dashed border-slate-200 pt-3 text-xs dark:border-slate-700" >
          <p className="mb-1 text-[9px] font-bold tracking-wider text-slate-400 uppercase">DETAIL PEMILIK & LAYANAN</p>
          <DetailRow icon={<User size={13} />} label="Pemilik:" value={res.ownerName} />
          <DetailRow icon={<Phone size={13} />} label="No. WA:" value={res.ownerPhone} mono />
          <DetailRow icon={<Calendar size={13} />} label="Jadwal Sesi:" value={`${formattedDateStr} • ${res.timeSlot}`} strong />
          {res.transportMode && (
            <DetailRow icon={<Truck size={13} />} label="Moda Antar:" value={res.transportMode} strong />
          )}

          {/* Paket & harga */}
          <div className="mt-1.5 rounded-xl border border-slate-800 bg-slate-900 p-3 text-white dark:border-slate-700">
            <span className="mb-1 block text-[8px] font-bold tracking-widest text-slate-400 uppercase">
              METODE GROOMING
            </span>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="truncate pr-3 text-brand-200">{res.packageType}</span>
              <span className="shrink-0 font-mono font-bold text-white">{formatRupiah(res.basePrice ?? res.price)}</span>
            </div>
            {res.addOns && res.addOns.length > 0 && (
              <div className="mt-2 space-y-0.5 border-t border-slate-800 pt-2 text-[10px] text-slate-300">
                <span className="mb-0.5 block text-[8px] font-bold tracking-wider text-slate-400 uppercase">
                  Add-ons Tambahan:
                </span>
                {res.addOns.map((add) => (
                  <div key={add.name} className="flex justify-between">
                    <span>- {add.name} (x{add.quantity})</span>
                    <span className="font-mono">{formatRupiah(add.price * add.quantity)}</span>
                  </div>
                ))}
              </div>
            )}
            {!!res.pointsRedeemed && (
              <div className="mt-2 flex justify-between border-t border-slate-800 pt-1 text-[10px] font-bold text-rose-300">
                <span>Potongan Poin Loyalty ({res.pointsRedeemed} P):</span>
                <span className="font-mono">- {formatRupiah(res.discountApplied || 0)}</span>
              </div>
            )}
          </div>

          {res.notes && (
            <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50/60 p-2.5 text-[11px] leading-relaxed text-slate-500 italic dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-slate-300">
              <span className="mb-0.5 block text-[10px] font-bold text-amber-800 not-italic dark:text-amber-400">
                📝 CATATAN KHUSUS HEWAN:
              </span>
              "{res.notes}"
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
        {!isCancelled && (
          <button
            onClick={() => onEdit(res)}
            className="shrink-0 cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Edit Detail
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {isWaiting && (
            <>
              <button
                onClick={() => onEdit(res)}
                className="cursor-pointer rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95"
                title="Reschedule cepat / pindah jadwal"
              >
                <Calendar size={12} className="mr-1 inline" />
                Reschedule
              </button>
              <button
                onClick={() => onStart(res.id)}
                className="cursor-pointer rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:scale-[1.02] active:scale-[0.98]"
              >
                Mulai Grooming 🛁
              </button>
              <button
                onClick={() => onCancel(res.id)}
                className="cursor-pointer rounded-lg border border-transparent p-1.5 text-rose-500 transition-colors hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                title="Batalkan booking"
              >
                <X size={15} />
              </button>
            </>
          )}

          {isInProgress && (
            <button
              onClick={onGoSteps}
              className="cursor-pointer rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-800"
            >
              ⏳ Lengkapi Data Tindakan
            </button>
          )}

          {isCompleted && (
            <button
              onClick={() => onOpenResume(res)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <ClipboardCheck size={13} />
              Resume & Cetak
            </button>
          )}

          {isCancelled && (
            <>
              <span className="py-1 font-mono text-[10px] text-slate-400 italic">Gagal Hadir / Cancel</span>
              <button
                onClick={() => onEdit(res)}
                className="cursor-pointer rounded-lg bg-brand-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
                title="Reschedule ke jadwal baru"
              >
                <Calendar size={12} className="mr-1 inline" />
                Re-Booking
              </button>
              <button
                onClick={() => onDelete(res.id)}
                className="cursor-pointer rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-rose-700 active:scale-95"
                title="Hapus data selamanya"
              >
                <Trash2 size={12} className="mr-1 inline" />
                Hapus
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, mono, strong }: { icon: React.ReactNode; label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950/40">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <span className={`ml-auto ${mono ? 'font-mono' : ''} ${strong ? 'font-display text-[11px] font-bold text-brand-900 dark:text-brand-300' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
        {value}
      </span>
    </div>
  );
}