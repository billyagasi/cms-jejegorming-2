import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, PawPrint } from 'lucide-react';
import { Reservation } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { useAppConfig, useReservations } from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { MONTHS_ID, DAYS_ID, formatDayDateID } from '../../lib/format';

const slotQuotaDefault = 3;

interface ScheduleKalenderProps {
  onOpenEditReservation: (res: Reservation) => void;
  onOpenResume: (res: Reservation) => void;
  onOpenAddWithSlot: (date: string, slot: string) => void;
}

export default function ScheduleKalender({ onOpenEditReservation, onOpenResume, onOpenAddWithSlot }: ScheduleKalenderProps) {
  const { data: reservations = [] } = useReservations();
  const { data: config } = useAppConfig();
  const setTab = useAppStore((s) => s.setTab);
  const setPortalPrefill = useAppStore((s) => s.setPortalPrefill);

  const sessionQuotas = config?.sessionQuotas ?? {};
  const weeklyHolidays = config?.weeklyHolidays ?? [];
  const specialHolidays = config?.specialHolidays ?? [];

  const slots = useMemo(() => Object.keys(sessionQuotas).sort((a, b) => a.localeCompare(b)), [sessionQuotas]);

  const todayIso = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }, []);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayIso);

  // 7 hari strip
  const days = useMemo(() => {
    const base = new Date(todayIso);
    base.setDate(base.getDate() + weekOffset * 7 - 3);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { iso, dayName: DAYS_ID[d.getDay()], dayNum: d.getDate(), monthName: MONTHS_ID[d.getMonth()] };
    });
  }, [todayIso, weekOffset]);

  const dayReservations = reservations.filter((r) => r.date === selectedDate);

  const isHoliday = (iso: string): { name: string; type: 'weekly' | 'special' } | null => {
    const d = new Date(iso);
    if (weeklyHolidays.includes(d.getDay())) return { name: 'Hari Libur Rutin Mingguan', type: 'weekly' };
    const special = specialHolidays.find((h) => h.date === iso);
    if (special) return { name: special.name, type: 'special' };
    return null;
  };

  const holiday = isHoliday(selectedDate);

  return (
    <div className="space-y-5">
      {/* Strip tanggal */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">Kalender Sesi Grooming</h3>
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="icon" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Minggu sebelumnya">
              <ChevronLeft size={15} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setWeekOffset(0);
                setSelectedDate(todayIso);
              }}
            >
              Hari Ini
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Minggu berikutnya">
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const isSel = d.iso === selectedDate;
            const isToday = d.iso === todayIso;
            const hol = isHoliday(d.iso);
            const count = reservations.filter((r) => r.date === d.iso && r.status !== 'Cancelled').length;
            return (
              <button
                key={d.iso}
                onClick={() => setSelectedDate(d.iso)}
                className={`cursor-pointer rounded-xl border px-1 py-2.5 text-center transition-all ${
                  isSel
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : hol
                      ? 'border-rose-200 bg-rose-50/60 text-rose-400 dark:border-rose-900 dark:bg-rose-950/30'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                <span className={`block text-[9.5px] font-bold uppercase ${isSel ? 'text-white/80' : 'text-slate-400'}`}>{d.dayName}</span>
                <span className="font-display mt-0.5 block text-lg font-bold">{d.dayNum}</span>
                <span className={`mt-0.5 block text-[9px] ${isSel ? 'text-white/70' : 'text-slate-400'}`}>
                  {hol ? 'Libur' : count > 0 ? `${count} ekor` : 'Kosong'}
                </span>
                {isToday && !isSel && <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-brand-500" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Detail hari */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">{formatDayDateID(selectedDate)}</h3>
            <p className="text-[11px] text-slate-500">
              {dayReservations.length} booking • {slots.reduce((s, slot) => s + (sessionQuotas[slot] ?? slotQuotaDefault), 0)} kuota total
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setPortalPrefill({ date: selectedDate, slot: slots[0] });
              setTab('portal');
            }}
          >
            <Plus size={13} /> Booking via Portal
          </Button>
        </div>

        {holiday ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            🚨 Toko libur — {holiday.name}. Semua sesi ditutup pada tanggal ini.
          </div>
        ) : dayReservations.length === 0 && slots.length === 0 ? (
          <EmptyState icon={<Calendar size={22} />} title="Belum ada kuota sesi" description="Atur kuota sesi jam operasional melalui Database Master." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {slots.map((slot) => {
              const quota = sessionQuotas[slot] ?? slotQuotaDefault;
              const booked = dayReservations.filter((r) => r.timeSlot === slot && r.status !== 'Cancelled');
              const closed = quota === 0;
              const full = booked.length >= quota;
              return (
                <div
                  key={slot}
                  className={`rounded-xl border p-3 ${
                    closed
                      ? 'border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900/60'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                      <Clock size={12} className="text-slate-400" />
                      {slot}
                    </span>
                    <Badge tone={closed ? 'slate' : full ? 'rose' : 'emerald'}>
                      {closed ? 'Tutup' : full ? 'Penuh' : `${booked.length}/${quota}`}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {booked.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => (r.status === 'Completed' ? onOpenResume(r) : onOpenEditReservation(r))}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-brand-800"
                      >
                        <span className="text-sm">{r.petType === 'Kucing' ? '🐱' : r.petType === 'Anjing' ? '🐶' : '🐾'}</span>
                        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          {r.petName} <span className="font-normal text-slate-400">— {r.ownerName}</span>
                        </span>
                        <Badge tone={r.status === 'Completed' ? 'emerald' : r.status === 'In_Progress' ? 'amber' : 'brand'} className="shrink-0">
                          {r.status === 'Waiting' ? 'Wait' : r.status.replace('_', ' ')}
                        </Badge>
                      </button>
                    ))}
                    {!closed && booked.length < quota && (
                      <button
                        onClick={() => onOpenAddWithSlot(selectedDate, slot)}
                        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-semibold text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700"
                      >
                        <Plus size={12} /> Tambah ({quota - booked.length} sisa)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}