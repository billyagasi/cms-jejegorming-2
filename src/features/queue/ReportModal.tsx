import { Download, X } from 'lucide-react';
import { Reservation } from '../../types';
import { downloadCSV, formatRupiah, todayISO } from '../../lib/format';

export type ReportType = 'daily' | 'monthly' | 'yearly';

interface ReportModalProps {
  type: ReportType | null;
  reservations: Reservation[];
  onClose: () => void;
}

export default function ReportModal({ type, reservations, onClose }: ReportModalProps) {
  if (!type) return null;

  const today = todayISO();
  const monthPrefix = today.substring(0, 7);
  const yearPrefix = today.substring(0, 4);

  let title = '';
  let list: Reservation[] = [];
  if (type === 'daily') {
    title = `Laporan Harian Operasional (${today.split('-').reverse().join('/')})`;
    list = reservations.filter((r) => r.date === today);
  } else if (type === 'monthly') {
    title = `Laporan Bulanan (${monthPrefix.split('-').reverse().join('/')})`;
    list = reservations.filter((r) => r.date.startsWith(monthPrefix));
  } else {
    title = `Laporan Tahunan (${yearPrefix})`;
    list = reservations.filter((r) => r.date.startsWith(yearPrefix));
  }

  const totalBookings = list.length;
  const completedList = list.filter((r) => r.status === 'Completed');
  const totalCompleted = completedList.length;
  const totalCancelled = list.filter((r) => r.status === 'Cancelled').length;
  const totalWaiting = list.filter((r) => r.status === 'Waiting' || r.status === 'In_Progress').length;
  const totalRevenue = completedList.reduce((sum, r) => {
    const base = r.basePrice || r.price || 0;
    const addOns = (r.addOns || []).reduce((s, a) => s + a.price * a.quantity, 0);
    return sum + Math.max(0, base + addOns - (r.discountApplied || 0));
  }, 0);
  const totalPointsRedeemed = list.reduce((s, r) => s + (r.pointsRedeemed || 0), 0);

  const petTypeCounts: Record<string, number> = {};
  const packageCounts: Record<string, number> = {};
  list.forEach((r) => {
    petTypeCounts[r.petType] = (petTypeCounts[r.petType] || 0) + 1;
    packageCounts[r.packageType] = (packageCounts[r.packageType] || 0) + 1;
  });

  const handleDownload = () => {
    const rows: (string | number)[][] = [
      ['LAPORAN OPERASIONAL - JPC GROOMING HUB'],
      ['Tipe Laporan', type.toUpperCase()],
      ['Tanggal Ekspor', new Date().toLocaleString('id-ID')],
      [],
      ['RINGKASAN EKSEKUTIF'],
      ['Total Reservasi', `${totalBookings} Ekor`],
      ['Selesai Grooming', `${totalCompleted} Ekor`],
      ['Dibatalkan', `${totalCancelled} Ekor`],
      ['Menunggu/Proses', `${totalWaiting} Ekor`],
      ['Total Omset Selesai (IDR)', totalRevenue],
      ['Poin Loyalty Tebusan', `${totalPointsRedeemed} Poin`],
      [],
      ['BREAKDOWN JENIS HEWAN'],
      ['Jenis Hewan', 'Jumlah Ekor'],
      ...Object.entries(petTypeCounts).map(([t, c]) => [t, c]),
      [],
      ['METRIK POPULARITAS PAKET'],
      ['Nama Paket', 'Jumlah Sesi'],
      ...Object.entries(packageCounts).map(([p, c]) => [p, c]),
      [],
      ['DAFTAR TRANSAKSI DETAIL'],
      ['ID', 'Tanggal', 'Pemilik', 'No HP', 'Nama Hewan', 'Jenis', 'Breed', 'Paket', 'Status', 'Biaya Basis', 'Diskon'],
      ...list.map((r) => [
        r.id, r.date, r.ownerName, r.ownerPhone, r.petName, r.petType, r.petBreed, r.packageType, r.status,
        r.basePrice || r.price || 0, r.discountApplied || 0,
      ]),
    ];
    downloadCSV(`laporan_jpc_${type}_${today}.csv`, rows);
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between bg-brand-900 p-5 text-white">
          <div>
            <h3 className="font-display text-sm font-bold tracking-tight">{title}</h3>
            <p className="mt-0.5 text-[10px] text-brand-200">Kalkulasi basis data transaksi</p>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20">
            Tutup
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Total Reservasi" value={`${totalBookings} ekor`} />
            <Metric label="Selesai" value={`${totalCompleted} ekor`} tone="text-emerald-600" />
            <Metric label="Dibatalkan" value={`${totalCancelled} ekor`} tone="text-rose-600" />
            <Metric label="Menunggu/Proses" value={`${totalWaiting} ekor`} tone="text-amber-600" />
          </div>
          <div className="rounded-xl bg-slate-900 p-4 text-white dark:bg-slate-950">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Total Omzet Selesai</span>
            <p className="font-mono mt-0.5 text-xl font-bold text-emerald-300">{formatRupiah(totalRevenue)}</p>
            <p className="mt-1 text-[10px] text-slate-400">Poin loyalty ditebus: {totalPointsRedeemed} poin</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Jenis Hewan</p>
              <div className="space-y-1">
                {Object.entries(petTypeCounts).map(([t, c]) => (
                  <div key={t} className="flex justify-between rounded-lg bg-slate-50 px-2.5 py-1 text-xs dark:bg-slate-800">
                    <span>{t}</span>
                    <span className="font-mono font-bold">{c} ekor</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Popularitas Paket</p>
              <div className="custom-scrollbar max-h-28 space-y-1 overflow-y-auto">
                {Object.entries(packageCounts).map(([p, c]) => (
                  <div key={p} className="flex justify-between rounded-lg bg-slate-50 px-2.5 py-1 text-xs dark:bg-slate-800">
                    <span className="truncate pr-2">{p}</span>
                    <span className="font-mono font-bold">{c}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button onClick={onClose} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              Tutup
            </button>
            <button
              onClick={handleDownload}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <Download size={13} />
              Unduh CSV / Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'text-slate-800 dark:text-slate-100' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
      <p className={`font-mono mt-0.5 font-bold ${tone}`}>{value}</p>
    </div>
  );
}