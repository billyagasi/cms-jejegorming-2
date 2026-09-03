import { useMemo, useState } from 'react';
import { Layers, Search, ListChecks, Clock, CheckCircle2 } from 'lucide-react';
import { Reservation } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Input, Select } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/Section';
import { useReservations, useAppConfig } from '../../data-layer/hooks';
import { useReservationActions } from '../queue/useReservationActions';

interface GroomingStepsManagerProps {
  onOpenResume: (res: Reservation) => void;
}

export default function GroomingStepsManager({ onOpenResume }: GroomingStepsManagerProps) {
  const { data: reservations = [] } = useReservations();
  const { data: config } = useAppConfig();
  const { updateStepStatus, updateStepPic } = useReservationActions();

  const staffChoices = useMemo(() => {
    const set = new Set<string>(config?.staffOptions ?? []);
    return Array.from(set);
  }, [config?.staffOptions]);

  const [search, setSearch] = useState('');
  const [slotFilter, setSlotFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  const slots = useMemo(() => Object.keys(config?.sessionQuotas ?? {}), [config?.sessionQuotas]);

  const filtered = reservations
    .filter((r) => r.status !== 'Cancelled')
    .filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.petName.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.ownerPhone.includes(search) ||
        r.petBreed.toLowerCase().includes(q);
      const matchesSlot = slotFilter === 'All' || r.timeSlot === slotFilter;
      const matchesDate = !dateFilter || r.date === dateFilter;
      return matchesSearch && matchesSlot && matchesDate;
    })
    .sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return a.timeSlot.localeCompare(b.timeSlot);
    });

  const waiting = filtered.filter((r) => r.status === 'Waiting').length;
  const inProgress = filtered.filter((r) => r.status === 'In_Progress').length;
  const completed = filtered.filter((r) => r.status === 'Completed').length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="In Progress" value={inProgress} tone="amber" icon={<Layers size={18} />} hint="Sesi sedang berjalan" />
        <StatCard label="Waiting" value={waiting} tone="brand" icon={<Clock size={18} />} hint="Menunggu diproses" />
        <StatCard label="Completed" value={completed} tone="emerald" icon={<CheckCircle2 size={18} />} hint="Selesai 5-step" />
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Cari hewan / pemilik / ras / WA…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
            <option value="All">Semua Sesi</option>
            {slots.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<ListChecks size={22} />} title="Belum ada sesi aktif" description="Reservasi dengan status Waiting atau In Progress akan tampil di sini." />
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((res) => {
            const completedSteps = res.steps.filter((s) => s.status === 'completed').length;
            return (
              <Card key={res.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        {res.petName} <span className="text-xs font-semibold text-slate-500">({res.petType} {res.petBreed})</span>
                      </h4>
                      <Badge tone={res.status === 'Completed' ? 'emerald' : res.status === 'In_Progress' ? 'amber' : 'brand'}>
                        {res.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {res.ownerName} • {res.date.split('-').reverse().join('/')} • {res.timeSlot}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => onOpenResume(res)}>
                    {res.status === 'Completed' ? 'Lihat Resume Hasil' : 'Buka Draf Resume'}
                  </Button>
                </div>

                {/* Mini step tracker interaktif */}
                <div className="mt-4 space-y-1.5">
                  {res.steps.map((step) => (
                    <div key={step.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5 dark:border-slate-800">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          step.status === 'completed' ? 'bg-emerald-500' : step.status === 'ongoing' ? 'animate-pulse-soft bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {step.name}
                      </span>
                      <Select value={step.pic} onChange={(e) => updateStepPic(res.id, step.id, e.target.value)} className="w-36 text-[11px]">
                        <option value="">PJ: belum diatur</option>
                        {staffChoices.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                      <div className="flex gap-1">
                        {(['pending', 'ongoing', 'completed'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => updateStepStatus(res.id, step.id, st)}
                            className={`cursor-pointer rounded-md px-2 py-0.5 text-[9.5px] font-bold uppercase transition-colors ${
                              step.status === st
                                ? st === 'completed'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'ongoing'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-400 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {st === 'completed' ? '✓' : st === 'ongoing' ? '▶' : '○'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-right text-[10px] font-bold text-slate-400">Progres: {completedSteps}/5 langkah selesai</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}