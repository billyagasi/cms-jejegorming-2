import { useMemo, useState } from 'react';
import { History, Search, Download, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Tabs from '../../components/ui/Tabs';
import { Input } from '../../components/ui/Input';
import { useActivityLogs, useClearActivityLogs } from '../../data-layer/hooks';
import { downloadCSV, formatDateTimeID } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

type OperatorFilter = 'all' | 'admin' | 'customer';

function actionTone(action: string): 'emerald' | 'rose' | 'sky' | 'brand' | 'slate' {
  const a = action.toLowerCase();
  if (a.includes('baru') || a.includes('tambah') || a.includes('registrasi')) return 'emerald';
  if (a.includes('batal') || a.includes('hapus')) return 'rose';
  if (a.includes('mulai') || a.includes('update') || a.includes('ubah') || a.includes('tindakan')) return 'sky';
  if (a.includes('simpan') || a.includes('resume') || a.includes('edit')) return 'brand';
  return 'slate';
}

export default function ActivityLogDashboard() {
  const { data: logs = [] } = useActivityLogs();
  const clearLogs = useClearActivityLogs();
  const [search, setSearch] = useState('');
  const [operator, setOperator] = useState<OperatorFilter>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((l) => {
      const matchesOp =
        operator === 'all' ||
        (operator === 'admin' && l.role !== 'Reservasi Mandiri' && l.staffName !== 'Pelanggan / Mandiri') ||
        (operator === 'customer' && (l.role === 'Reservasi Mandiri' || l.staffName === 'Pelanggan / Mandiri'));
      const matchesSearch =
        !q ||
        l.staffName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.targetName.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q);
      return matchesOp && matchesSearch;
    });
  }, [logs, search, operator]);

  const adminCount = logs.filter((l) => l.staffName !== 'Pelanggan / Mandiri' && l.role !== 'Reservasi Mandiri').length;

  return (
    <div className="space-y-5">
      <Card className="bg-slate-900 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display flex items-center gap-2 text-sm font-bold text-white">
              <History size={15} className="text-brand-300" />
              Log Aktivitas Staf
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">Audit trail seluruh aksi yang dilakukan staf dan pelanggan</p>
          </div>
          <div className="flex gap-2">
            <Badge tone="slate">{logs.length} Total</Badge>
            <Badge tone="emerald">{adminCount} Staf</Badge>
            <Badge tone="sky">{logs.length - adminCount} Pelanggan</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Cari staf / aksi / target…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Tabs
              value={operator}
              onChange={setOperator}
              options={[
                { id: 'all', label: 'Semua' },
                { id: 'admin', label: 'Staf' },
                { id: 'customer', label: 'Pelanggan' },
              ]}
            />
            <Button
              variant="success"
              size="sm"
              onClick={() =>
                downloadCSV(
                  `log_aktivitas_${new Date().toISOString().split('T')[0]}.csv`,
                  [
                    ['Waktu', 'Staf', 'Role', 'Aksi', 'Target', 'Detail'],
                    ...logs.map((l) => [l.timestamp, l.staffName, l.role, l.action, l.targetName, l.details]),
                  ]
                )
              }
            >
              <Download size={13} /> Ekspor CSV
            </Button>
            <Button variant="outline-danger" size="sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 size={13} /> Reset Log
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<History size={22} />} title="Belum ada aktivitas tercatat" description="Setiap aksi staf (tambah, edit, hapus, grooming) otomatis tercatat di sini." />
        ) : (
          <div className="custom-scrollbar max-h-[560px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                <tr className="border-b border-slate-200 text-[10px] tracking-wide text-slate-400 uppercase dark:border-slate-800">
                  <th className="px-3 py-2.5 font-bold">Waktu</th>
                  <th className="px-3 py-2.5 font-bold">Staf / Role</th>
                  <th className="px-3 py-2.5 font-bold">Aksi</th>
                  <th className="px-3 py-2.5 font-bold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-950/50">
                    <td className="px-3 py-2 font-mono text-[10.5px] whitespace-nowrap text-slate-500">{formatDateTimeID(l.timestamp)}</td>
                    <td className="px-3 py-2">
                      <p className="font-bold text-slate-700 dark:text-slate-200">{l.staffName}</p>
                      <p className="text-[10px] text-slate-400">{l.role}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={actionTone(l.action)}>{l.action}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{l.targetName}</p>
                      <p className="line-clamp-1 text-[10.5px] text-slate-400">{l.details}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          clearLogs.mutate(undefined, {
            onSuccess: () => pushToast({ tone: 'success', title: 'Log aktivitas dikosongkan' }),
          });
          setConfirmOpen(false);
        }}
        title="Reset seluruh log aktivitas?"
        message="Seluruh jejak audit aktivitas akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Reset"
        confirmWord="RESET"
      />
    </div>
  );
}