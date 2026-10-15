import { useMemo, useState } from 'react';
import { MessageSquare, Search, Copy, Trash2, CheckCheck, Plus, Send } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { useAddNotificationLog, useAppointments, useClearNotificationLogs, useInpatients, useNotificationLogs, useReservations } from '../../data-layer/hooks';
import { copyToClipboard, formatDateTimeID, generateId, waLink } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';
import { buildClinicalPatients } from '../clinical/clinicalPatients';
import type { NotificationLog } from '../../types';

export default function NotificationLogDashboard() {
  const { data: logs = [] } = useNotificationLogs();
  const clearLogs = useClearNotificationLogs();
  const addLog = useAddNotificationLog();
  const { data: appointments = [] } = useAppointments();
  const { data: reservations = [] } = useReservations();
  const { data: inpatients = [] } = useInpatients();
  const patients = useMemo(() => buildClinicalPatients(appointments, reservations, inpatients), [appointments, reservations, inpatients]);
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

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
              Notification Center
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">Pesan otomatis dan manual melalui WhatsApp, SMS, atau email</p>
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
          <Button size="sm" onClick={() => setComposeOpen(true)}><Plus size={13} /> Pesan Manual</Button>
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
                    <Badge tone={log.status === 'Failed' ? 'rose' : log.status === 'Pending' ? 'amber' : 'emerald'}>
                      <CheckCheck size={10} /> {log.channel} • {log.status}
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

      <ComposeNotificationModal open={composeOpen} patients={patients} onClose={() => setComposeOpen(false)} onSend={(log) => addLog.mutate(log, { onSuccess: () => { setComposeOpen(false); pushToast({ tone: 'success', title: 'Notifikasi dicatat', message: `${log.channel} untuk ${log.ownerName}` }); } })} />

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

function ComposeNotificationModal({ open, patients, onClose, onSend }: { open: boolean; patients: ReturnType<typeof buildClinicalPatients>; onClose: () => void; onSend: (log: NotificationLog) => void }) {
  const [patientKey, setPatientKey] = useState(patients[0]?.key || '');
  const [channel, setChannel] = useState<NotificationLog['channel']>('WhatsApp');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (!open) return null;
  const submit = () => { const patient = patients.find((item) => item.key === patientKey); if (!patient || !message.trim()) { setError('Pilih pasien dan isi pesan.'); return; } if (channel === 'WhatsApp') window.open(waLink(patient.ownerPhone, message), '_blank'); else if (channel === 'SMS') window.open(`sms:${patient.ownerPhone}?body=${encodeURIComponent(message)}`, '_blank'); else window.open(`mailto:?subject=${encodeURIComponent(`Informasi ${patient.petName} — Jeje Pet Care`)}&body=${encodeURIComponent(message)}`, '_blank'); onSend({ id: generateId('notif'), reservationId: patient.appointmentId || patient.key, petName: patient.petName, ownerName: patient.ownerName, ownerPhone: patient.ownerPhone, type: 'Manual', message: message.trim(), timestamp: new Date().toISOString(), channel, status: 'Sent' }); };
  return <Modal isOpen={open} onClose={onClose} title="Kirim Notifikasi Manual" subtitle="Pengiriman membuka aplikasi channel terkait; log tetap tersimpan di CMS" icon={<Send size={18} />} size="md" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}><Send size={13} /> Kirim</Button></>}><div className="space-y-4"><Field label="Pasien / Pemilik" required><Select value={patientKey} onChange={(event) => setPatientKey(event.target.value)}><option value="">Pilih pasien</option>{patients.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></Field><Field label="Channel"><Select value={channel} onChange={(event) => setChannel(event.target.value as NotificationLog['channel'])}><option>WhatsApp</option><option>SMS</option><option>Email</option></Select></Field><Field label="Pesan" required><Textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tulis pesan untuk pemilik…" /></Field>{error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}</div></Modal>;
}
