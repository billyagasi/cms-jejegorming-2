import { useMemo, useState } from 'react';
import { BarChart3, Lock, LogOut, Download, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import { Field, Input } from '../../components/ui/Input';
import { StatCard, SectionTitle } from '../../components/ui/Section';
import { useOwnerSession } from '../../app/useOwnerSession';
import { useReservations, usePosTransactions } from '../../data-layer/hooks';
import { formatRupiah, formatDayDateID, todayISO } from '../../lib/format';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

const PIE_COLORS = ['#0d9488', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e'];

export default function ReportsPage() {
  const { isOwnerAuthenticated, loginOwner, logoutOwner } = useOwnerSession();
  const { data: reservations = [] } = useReservations();
  const { data: posTransactions = [] } = usePosTransactions();

  const [period, setPeriod] = useState<Period>('monthly');
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginOwner(username, accessCode)) {
      setLoginError('');
      pushToastSafe('Selamat datang, Owner', 'Akses laporan keuangan dibuka.');
    } else {
      setLoginError('Username atau kode akses salah.');
    }
  };

  // Filter periode
  const filtered = useMemo(() => {
    const now = new Date();
    const today = todayISO();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoIso = weekAgo.toISOString().split('T')[0];
    const monthPrefix = today.substring(0, 7);
    const yearPrefix = today.substring(0, 4);

    return reservations.filter((r) => {
      if (period === 'daily') return r.date === today;
      if (period === 'weekly') return r.date >= weekAgoIso && r.date <= today;
      if (period === 'monthly') return r.date.startsWith(monthPrefix);
      if (period === 'yearly') return r.date.startsWith(yearPrefix);
      return true;
    });
  }, [reservations, period]);

  const completed = filtered.filter((r) => r.status === 'Completed');
  const revenue = completed.reduce((sum, r) => {
    const base = r.basePrice || r.price || 0;
    const addOns = (r.addOns || []).reduce((s, a) => s + a.price * a.quantity, 0);
    return sum + Math.max(0, base + addOns - (r.discountApplied || 0));
  }, 0);
  const discounts = completed.reduce((s, r) => s + (r.discountApplied || 0), 0);
  const posRevenue = posTransactions
    .filter((tx) => {
      const d = tx.timestamp.substring(0, 10);
      if (period === 'daily') return d === todayISO();
      if (period === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo.toISOString().split('T')[0];
      }
      if (period === 'monthly') return d.startsWith(todayISO().substring(0, 7));
      if (period === 'yearly') return d.startsWith(todayISO().substring(0, 4));
      return true;
    })
    .reduce((s, tx) => s + tx.totalTransaction, 0);

  const grossRevenue = revenue + posRevenue;
  const maxSpend = Math.max(...completed.map((r) => r.price), 0);
  const minSpend = completed.length ? Math.min(...completed.map((r) => r.price)) : 0;

  // Komisi per PJ
  const commissionByStaff = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      r.steps?.forEach((step) => {
        if (step.pic && step.status === 'completed') {
          map[step.pic] = (map[step.pic] || 0) + 1;
        }
      });
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered]);

  // Paket popularity
  const packagePopularity = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      map[r.packageType] = (map[r.packageType] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, value }));
  }, [filtered]);

  const handleExportXLSX = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const rows = filtered.map((r) => ({
      ID: r.id,
      Tanggal: r.date,
      Sesi: r.timeSlot,
      Pemilik: r.ownerName,
      'No WA': r.ownerPhone,
      Hewan: r.petName,
      Jenis: r.petType,
      Breed: r.petBreed,
      Paket: r.packageType,
      'Harga Dasar': r.basePrice ?? 0,
      'Add-Ons': (r.addOns || []).reduce((s, a) => s + a.price * a.quantity, 0),
      Diskon: r.discountApplied || 0,
      'Harga Final': r.price,
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi Grooming');
    const wsPos = XLSX.utils.json_to_sheet(
      posTransactions.map((t) => ({
        ID: t.id,
        Waktu: t.timestamp,
        Pelanggan: t.ownerName,
        'Total Jasa': t.totalJasa,
        'Total Pembelian': t.totalPembelian,
        'Total Alat': t.totalAlat,
        'Grand Total': t.totalTransaction,
        Metode: t.paymentMethod,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsPos, 'Transaksi POS');
    XLSX.writeFile(wb, `laporan_keuangan_${period}_${todayISO()}.xlsx`);
  };

  // Owner gate
  if (!isOwnerAuthenticated) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50">
            <Lock size={22} />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Akses Khusus Pemilik Usaha</h3>
          <p className="mt-1 text-xs text-slate-500">
            Laporan keuangan & komisi bersifat rahasia. Masuk dengan akun owner (sesi otomatis berakhir setelah 10 menit
            inaktivitas).
          </p>
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <Field label="Username Owner" required>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="cth. aksesownerjeje" autoFocus />
            </Field>
            <Field label="Kode Akses" required error={loginError}>
              <Input type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Kode akses rahasia" invalid={!!loginError} />
            </Field>
            <Button type="submit" className="w-full">
              <Lock size={14} /> Buka Akses Keuangan
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <BarChart3 size={15} className="text-brand-600" />
            Laporan Keuangan & Komisi
          </h3>
          <p className="text-[11px] text-slate-500">Data rahasia pemilik usaha — sesi aktif (timeout 10 menit)</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={period}
            onChange={setPeriod}
            options={[
              { id: 'daily', label: 'Harian' },
              { id: 'weekly', label: 'Mingguan' },
              { id: 'monthly', label: 'Bulanan' },
              { id: 'yearly', label: 'Tahunan' },
              { id: 'all', label: 'Semua' },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={handleExportXLSX}>
            <Download size={13} /> XLSX
          </Button>
          <Button variant="outline-danger" size="sm" onClick={logoutOwner}>
            <LogOut size={13} /> Keluar
          </Button>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sesi Grooming Selesai" value={completed.length} tone="brand" hint={`${filtered.length} reservasi periode ini`} />
        <StatCard label="Omzet Grooming" value={formatRupiah(revenue)} tone="emerald" />
        <StatCard label="Omzet POS Kasir" value={formatRupiah(posRevenue)} tone="sky" icon={<Wallet size={18} />} />
        <StatCard label="Total Omzet Kotor" value={formatRupiah(grossRevenue)} tone="amber" hint={`Diskon loyalitas: ${formatRupiah(discounts)}`} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Popularitas Paket (Jumlah Sesi)</SectionTitle>
          {packagePopularity.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Belum ada data pada periode ini.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={packagePopularity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <SectionTitle>Distribusi Paket</SectionTitle>
          {packagePopularity.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Belum ada data pada periode ini.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={packagePopularity} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {packagePopularity.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Komisi per PJ */}
      <Card>
        <SectionTitle>Analisis Komisi / PJ per Step (Step Completed)</SectionTitle>
        {commissionByStaff.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">Belum ada step yang diselesaikan staf pada periode ini.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {commissionByStaff.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{s.name}</span>
                <Badge tone="brand">{s.count} step</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tabel transaksi */}
      <Card>
        <SectionTitle>Detail Transaksi Grooming ({completed.length})</SectionTitle>
        <div className="custom-scrollbar max-h-96 overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
              <tr className="border-b border-slate-200 text-[10px] tracking-wide text-slate-400 uppercase dark:border-slate-800">
                <th className="px-3 py-2 font-bold">Tanggal</th>
                <th className="px-3 py-2 font-bold">Hewan</th>
                <th className="px-3 py-2 font-bold">Pemilik</th>
                <th className="px-3 py-2 font-bold">Paket</th>
                <th className="px-3 py-2 text-right font-bold">Harga</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-950/50">
                  <td className="px-3 py-2 font-mono text-[10.5px] whitespace-nowrap text-slate-500">{r.date}</td>
                  <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{r.petName}</td>
                  <td className="px-3 py-2 text-slate-500">{r.ownerName}</td>
                  <td className="px-3 py-2 text-slate-500">{r.packageType}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">{formatRupiah(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-right text-[10px] text-slate-400">
          Max: {formatRupiah(maxSpend)} • Min: {formatRupiah(minSpend)} • Periode: {formatDayDateID(todayISO())}
        </p>
      </Card>
    </div>
  );
}

function pushToastSafe(title: string, message: string) {
  // dipanggil setelah login sukses
  import('../../components/ui/toastStore').then(({ pushToast }) => pushToast({ tone: 'success', title, message }));
}