import { useMemo, useState } from 'react';
import { MessageSquare, Search, Copy, Trash2, CheckCheck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { useNotificationLogs, useClearNotificationLogs } from '../../data-layer/hooks';
import { copyToClipboard, formatDateTimeID } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

export default function NotificationLogDashboard() {
  const { data: logs = [] } = useNotificationLogs();
  const clearLogs = useClearNotificationLogs();
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        !q ||
        l.petName.toLowerCase().includes(q) ||
        l.ownerName.toLowerCase().includes(q) ||
        l.ownerPhone.includes(search) ||
        l.message.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const waCount = logs.filter((l) => l.channel === 'WhatsApp').length;

  return (
    <div className="space-y-5">
      <Card className="bg-slate-900 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display flex items-center gap-2 text-sm font-bold text-white">
              <MessageSquare size={15} className="text-brand-300" />
              Log Notifikasi WhatsApp (Simulasi)
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">Riwayat pesan notifikasi yang dikirim sistem kepada pemilik hewan</p>
          </div>
          <div className="flex gap-2">
            <Badge tone="brand">{logs.length} Total</Badge>
            <Badge tone="emerald">{waCount} WhatsApp</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Cari pesan / hewan / pemilik / no WA…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline-danger" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={13} /> Reset Riwayat Log
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<MessageSquare size={22} />} title="Belum ada log notifikasi" description="Setiap reservasi baru dan penyelesaian grooming otomatis membuat log di sini." />
        ) : (
          <div className="custom-scrollbar max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {filtered.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {log.petName} <span className="font-normal text-slate-400">— {log.ownerName} ({log.ownerPhone})</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">{formatDateTimeID(log.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={log.type === 'Grooming_Completed' ? 'emerald' : log.type === 'Reservation_Created' ? 'brand' : 'sky'}>
                      {log.type.replaceAll('_', ' ')}
                    </Badge>
                    <Badge tone="emerald">
                      <CheckCheck size={10} /> Delivered
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-950/60">
                  <p className="font-mono line-clamp-4 text-[11px] leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                    {log.message}
                  </p>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (await copyToClipboard(log.message)) {
                        setCopiedId(log.id);
                        setTimeout(() => setCopiedId(''), 2000);
                      }
                    }}
                  >
                    <Copy size={12} /> {copiedId === log.id ? 'Tersalin!' : 'Salin Pesan'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          clearLogs.mutate(undefined, {
            onSuccess: () => pushToast({ tone: 'success', title: 'Riwayat log dikosongkan' }),
          });
          setConfirmOpen(false);
        }}
        title="Reset seluruh riwayat log?"
        message="Semua log notifikasi WhatsApp akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Reset"
        confirmWord="RESET"
      />
    </div>
  );
}