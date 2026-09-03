import { useMemo, useState } from 'react';
import { Search, BellRing, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { Reservation, ReservationStatus } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Select, Input } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/Section';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { useReservations, useAppConfig } from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { useReservationActions } from './useReservationActions';
import ReservationCard from './ReservationCard';
import ReportModal from './ReportModal';
import { formatDayDateID, todayISO, waLink } from '../../lib/format';

type ReportType = 'daily' | 'monthly' | 'yearly';

export default function QueuePage({
  onEditReservation,
  onOpenResume,
}: {
  onEditReservation: (res: Reservation | null) => void;
  onOpenResume: (res: Reservation) => void;
}) {
  const { data: reservations = [] } = useReservations();
  const { data: config } = useAppConfig();
  const sessionQuotas = config?.sessionQuotas ?? {};
  const setTab = useAppStore((s) => s.setTab);
  const { startGrooming, cancelReservation, removeReservation } = useReservationActions();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | ReservationStatus>('Active');
  const [petTypeFilter, setPetTypeFilter] = useState<'All' | string>('All');
  const [progressFilter, setProgressFilter] = useState('All');
  const [selectedCompletedMonth, setSelectedCompletedMonth] = useState('All');
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);

  const today = todayISO();

  // --- Filter & sort (paritas App lama) ---
  const filtered = useMemo(() => {
    const list = reservations.filter((res) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        res.petName.toLowerCase().includes(q) ||
        res.ownerName.toLowerCase().includes(q) ||
        res.ownerPhone.includes(searchTerm) ||
        res.petBreed.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Active'
            ? res.status !== 'Completed' && res.status !== 'Cancelled'
            : res.status === statusFilter;

      const matchesMonth =
        statusFilter === 'Completed' && selectedCompletedMonth !== 'All'
          ? res.date.startsWith(selectedCompletedMonth)
          : true;

      const matchesType = petTypeFilter === 'All' || res.petType === petTypeFilter;

      const completedSteps = (res.steps || []).filter((s) => s.status === 'completed').length;
      const hasOngoing = (res.steps || []).some((s) => s.status === 'ongoing');
      let matchesProgress = true;
      if (progressFilter === '0') matchesProgress = completedSteps === 0 && !hasOngoing;
      else if (['1', '2', '3', '4', '5'].includes(progressFilter)) matchesProgress = completedSteps === Number(progressFilter);
      else if (progressFilter === 'ongoing') matchesProgress = hasOngoing;

      return matchesSearch && matchesStatus && matchesMonth && matchesType && matchesProgress;
    });

    return [...list].sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return a.timeSlot.localeCompare(b.timeSlot);
    });
  }, [reservations, searchTerm, statusFilter, petTypeFilter, progressFilter, selectedCompletedMonth]);

  // Riwayat completed metrics
  const completedMetrics = useMemo(() => {
    if (statusFilter !== 'Completed') return null;
    const revenue = filtered.reduce((sum, res) => {
      const base = res.basePrice || res.price || 0;
      const addOns = (res.addOns || []).reduce((s, a) => s + a.price * a.quantity, 0);
      return sum + Math.max(0, base + addOns - (res.discountApplied || 0));
    }, 0);
    return { total: filtered.length, revenue };
  }, [statusFilter, filtered]);

  // Bulan tersedia untuk filter completed
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r) => {
      if (r.date?.length >= 7) set.add(r.date.substring(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [reservations]);

  // Hewan overdue H+25
  const overduePets = useMemo(() => {
    const now = new Date();
    const groups: Record<string, Reservation[]> = {};
    reservations.forEach((res) => {
      const key = `${res.ownerPhone.trim()}_${res.petName.trim()}`.toLowerCase();
      (groups[key] ||= []).push(res);
    });
    const list: {
      id: string;
      petName: string;
      ownerName: string;
      ownerPhone: string;
      petType: string;
      petBreed: string;
      lastDate: string;
      daysElapsed: number;
      lastPackage: string;
    }[] = [];

    Object.values(groups).forEach((history) => {
      const completed = history.filter((r) => r.status === 'Completed');
      if (completed.length === 0) return;
      const latest = completed.reduce((max, r) => (new Date(r.date) > new Date(max.date) ? r : max), completed[0]);
      const hasUpcoming = history.some(
        (r) => (r.status === 'Waiting' || r.status === 'In_Progress') && new Date(r.date) >= new Date(latest.date)
      );
      if (!hasUpcoming) {
        const diffDays = Math.floor((now.getTime() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 25) {
          list.push({
            id: latest.id,
            petName: latest.petName,
            ownerName: latest.ownerName,
            ownerPhone: latest.ownerPhone,
            petType: latest.petType,
            petBreed: latest.petBreed,
            lastDate: latest.date,
            daysElapsed: diffDays,
            lastPackage: latest.packageType,
          });
        }
      }
    });
    return list;
  }, [reservations]);

  const queueToday = reservations.filter((r) => r.date === today && r.status !== 'Cancelled');
  const finishedToday = queueToday.filter((r) => r.status === 'Completed').length;

  const sendOverdueReminder = (pet: (typeof overduePets)[number]) => {
    const last = pet.lastDate.split('-').reverse().join('/');
    const msg = `[WA] Halo ${pet.ownerName}! ${pet.petName} (${pet.petBreed}) sudah ${pet.daysElapsed} hari tidak melakukan grooming mandi di Jeje Pet Care sejak kunjungan terakhir (${last}). Mari jadwalkan ulang agar bulu ${pet.petName} tetap harum, halus, bebas gimbal & kutu! 🐾`;
    window.open(waLink(pet.ownerPhone, msg), '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Stat ringkas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Antrean Hari Ini" value={`${queueToday.length} Ekor`} tone="brand" icon={<Clock size={18} />} hint={`${finishedToday} selesai`} />
        <StatCard label="Menunggu" value={reservations.filter((r) => r.status === 'Waiting').length} tone="amber" />
        <StatCard label="In Progress" value={reservations.filter((r) => r.status === 'In_Progress').length} tone="brand" />
        <StatCard label="Selesai" value={reservations.filter((r) => r.status === 'Completed').length} tone="emerald" icon={<CheckCircle2 size={18} />} />
      </div>

      {/* Toolbar laporan */}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">Laporan Operasional</h3>
          <p className="text-[11px] text-slate-500">Ringkasan & unduh CSV per periode</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setActiveReport('daily')}>
            <Calendar size={13} /> Harian
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setActiveReport('monthly')}>
            <Calendar size={13} /> Bulanan
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setActiveReport('yearly')}>
            <Calendar size={13} /> Tahunan
          </Button>
        </div>
      </Card>

      {/* Filter panel */}
      <Card>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Cari nama hewan, pemilik, ras, no WA…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="font-semibold">
            <option value="Active">Antrean Aktif (Waiting & In Progress)</option>
            <option value="Completed">Selesai Grooming (History)</option>
            <option value="Waiting">Menunggu (Waiting)</option>
            <option value="In_Progress">Sedang Diproses (In Progress)</option>
            <option value="Cancelled">Dibatalkan (Cancelled)</option>
            <option value="All">Semua Status</option>
          </Select>
          <Select value={petTypeFilter} onChange={(e) => setPetTypeFilter(e.target.value)}>
            <option value="All">Semua Jenis Hewan</option>
            <option value="Kucing">Kucing Only</option>
            <option value="Anjing">Anjing Only</option>
            <option value="Kelinci">Kelinci Only</option>
            <option value="Lainnya">Lainnya</option>
          </Select>
          <Select value={progressFilter} onChange={(e) => setProgressFilter(e.target.value)}>
            <option value="All">Semua Progress (Langkah)</option>
            <option value="0">Belum Mulai (0 Langkah)</option>
            <option value="1">1 Langkah (20%)</option>
            <option value="2">2 Langkah (40%)</option>
            <option value="3">3 Langkah (60%)</option>
            <option value="4">4 Langkah (80%)</option>
            <option value="5">Selesai 5 Langkah</option>
            <option value="ongoing">Sedang Pengerjaan (Ongoing)</option>
          </Select>
        </div>

        {statusFilter === 'Completed' && (
          <div className="animate-fade-in mt-4 rounded-2xl border border-brand-800 bg-brand-900 p-4 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold">Filter Bulan Riwayat:</span>
              <button
                onClick={() => setSelectedCompletedMonth('All')}
                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                  selectedCompletedMonth === 'All' ? 'bg-white text-brand-900' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Semua
              </button>
              {availableMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedCompletedMonth(m)}
                  className={`cursor-pointer rounded-full px-3 py-1 font-mono text-[11px] font-bold transition-colors ${
                    selectedCompletedMonth === m ? 'bg-white text-brand-900' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {completedMetrics && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-brand-800 pt-3">
                <div>
                  <span className="block text-[10px] font-semibold tracking-wide text-brand-200 uppercase">
                    Total Transaksi Selesai
                  </span>
                  <span className="font-mono text-base font-bold">{completedMetrics.total} Transaksi / Hewan</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-semibold tracking-wide text-brand-200 uppercase">
                    Total Pendapatan
                  </span>
                  <span className="font-mono text-base font-bold text-emerald-300">
                    Rp {completedMetrics.revenue.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Overdue H+25 */}
      {overduePets.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-400">
              <BellRing size={16} />
              {overduePets.length} Peliharaan Overdue (H+25)
            </h3>
            <Badge tone="amber">Butuh Reminder Re-Booking</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {overduePets.map((pet) => (
              <div key={pet.id} className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {pet.petName} <span className="font-normal text-slate-400">({pet.petBreed})</span>
                  </p>
                  <p className="truncate text-[10px] text-slate-500">
                    {pet.ownerName} • terakhir {formatDayDateID(pet.lastDate)}
                  </p>
                  <Badge tone="rose" className="mt-1">
                    +{pet.daysElapsed} hari
                  </Badge>
                </div>
                <Button size="sm" variant="success" onClick={() => sendOverdueReminder(pet)} title="Kirim reminder WhatsApp">
                  <BellRing size={12} />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* List kartu */}
      <div>
        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Search size={22} />}
              title="Tidak ada reservasi yang cocok"
              description="Periksa kembali kata kunci pencarian atau bersihkan filter di atas untuk menampilkan seluruh antrean reservasi."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs font-medium text-slate-500">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {statusFilter === 'Active'
                  ? `📋 Antrean Grooming Aktif Terurut Jadwal (${filtered.length} Hewan)`
                  : statusFilter === 'Completed'
                    ? `📋 History Transaksi Selesai (${filtered.length} Transaksi)`
                    : `📋 Daftar Antrean Terurut Jadwal (${filtered.length} Hewan)`}
              </span>
            </div>
            <div className="custom-scrollbar max-h-[620px] space-y-4 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50/40 p-2.5 shadow-inner dark:border-slate-800 dark:bg-slate-950/30">
              {filtered.map((res) => (
                <ReservationCard
                  key={res.id}
                  res={res}
                  onEdit={(r) => onEditReservation(r)}
                  onStart={startGrooming}
                  onCancel={cancelReservation}
                  onDelete={removeReservation}
                  onOpenResume={onOpenResume}
                  onGoSteps={() => setTab('steps')}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ReportModal type={activeReport} reservations={reservations} onClose={() => setActiveReport(null)} />
    </div>
  );
}