import { useMemo, useState } from 'react';
import { BellRing, Pencil, Plus, Search, Send, ShieldCheck, Syringe, Trash2 } from 'lucide-react';
import type { InventoryItem, VaccinationRecord, VaccinationStatus } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/Section';
import {
  useAddActivityLog, useAddNotificationLog, useAppConfig, useAppointments, useClinicalFollowUps,
  useDeleteVaccination, useInpatients, useInventory, useReservations, useSaveClinicalFollowUp,
  useSaveInventoryItem, useSaveVaccination, useVaccinations,
} from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { buildClinicalPatients, clinicalPatientKey } from '../clinical/clinicalPatients';
import { formatDayDateID, generateId, todayISO, waLink } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

export default function VaccinationManager() {
  const { data: records = [] } = useVaccinations();
  const { data: followUps = [] } = useClinicalFollowUps();
  const { data: appointments = [] } = useAppointments();
  const { data: reservations = [] } = useReservations();
  const { data: inpatients = [] } = useInpatients();
  const { data: inventory = [] } = useInventory();
  const { data: config } = useAppConfig();
  const saveRecord = useSaveVaccination();
  const deleteRecord = useDeleteVaccination();
  const saveFollowUp = useSaveClinicalFollowUp();
  const saveInventory = useSaveInventoryItem();
  const addLog = useAddActivityLog();
  const addNotification = useAddNotificationLog();
  const session = useAppStore((state) => state.session);
  const patients = useMemo(() => buildClinicalPatients(appointments, reservations, inpatients), [appointments, reservations, inpatients]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'Semua' | VaccinationStatus>('Semua');
  const [editing, setEditing] = useState<VaccinationRecord | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<VaccinationRecord | null>(null);
  const effective = records.map((item) => effectiveRecord(item));
  const filtered = effective.filter((item) => {
    const q = search.toLowerCase();
    return (status === 'Semua' || item.status === status) && (!q || [item.patient.petName, item.patient.ownerName, item.vaccineName, item.batchNumber || ''].some((value) => value.toLowerCase().includes(q)));
  });

  const persist = async (record: VaccinationRecord) => {
    const previous = records.find((item) => item.id === record.id);
    let value = record;
    if (!previous?.inventoryCommittedAt && !record.inventoryCommittedAt && record.inventoryItemId && record.status !== 'Dibatalkan') {
      const item = inventory.find((stock) => stock.id === record.inventoryItemId);
      const qty = record.inventoryQuantity || 1;
      if (!item || item.stock < qty) throw new Error(`Stok ${item?.name || 'vaksin'} tidak mencukupi.`);
      await saveInventory.mutateAsync({ ...item, stock: item.stock - qty, lastUpdated: new Date().toISOString() });
      value = { ...record, inventoryCommittedAt: new Date().toISOString() };
    }
    await saveRecord.mutateAsync(value);
    if (value.nextDueDate) {
      const id = `FU-VAC-${value.id}`;
      const existing = followUps.find((item) => item.id === id);
      await saveFollowUp.mutateAsync({
        id, patient: value.patient, sourceType: 'Vaksinasi', sourceId: value.id,
        followUpDate: value.nextDueDate, status: existing?.status || 'Pending', staffInCharge: value.veterinarianName,
        lastCondition: `Vaksin ${value.vaccineName} diberikan ${formatDayDateID(value.givenDate)}.`,
        recommendedAction: `Booster/kontrol ${value.vaccineName}.`, contactChannel: 'WhatsApp',
        responseNotes: existing?.responseNotes, contactedAt: existing?.contactedAt,
        createdAt: existing?.createdAt || value.createdAt, updatedAt: new Date().toISOString(),
      });
    }
    await addLog.mutateAsync({ id: generateId('log'), staffName: session?.username || 'Staf', role: session?.role || 'Staf', action: previous ? 'Ubah Vaksinasi' : 'Catat Vaksinasi', timestamp: new Date().toISOString(), targetId: value.id, targetName: `${value.vaccineName} — ${value.patient.petName}`, details: `Batch ${value.batchNumber || '-'}; booster ${value.nextDueDate || '-'}` });
    setEditing(undefined);
    pushToast({ tone: 'success', title: 'Vaksinasi tersimpan', message: value.nextDueDate ? 'Reminder booster dibuat otomatis.' : undefined });
  };

  const remind = async (record: VaccinationRecord) => {
    const message = `Halo Kak ${record.patient.ownerName}, pengingat vaksin ${record.vaccineName} untuk ${record.patient.petName} dijadwalkan pada ${formatDayDateID(record.nextDueDate || record.givenDate)}. Silakan hubungi Jeje Pet Care untuk konfirmasi jadwal. 🐾💉`;
    window.open(waLink(record.patient.ownerPhone, message), '_blank');
    await addNotification.mutateAsync({ id: generateId('notif'), reservationId: record.patient.appointmentId || record.id, petName: record.patient.petName, ownerName: record.patient.ownerName, ownerPhone: record.patient.ownerPhone, type: 'Rescheduled', message, timestamp: new Date().toISOString(), channel: 'WhatsApp', status: 'Sent' });
  };

  return <div className="space-y-5">
    <div className="rounded-2xl bg-linear-to-r from-emerald-950 via-teal-900 to-slate-900 p-5 text-white shadow-lg"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.18em] text-emerald-300 uppercase">Preventive Care</p><h2 className="font-display mt-1 text-xl font-bold">Vaksinasi & Imunisasi</h2><p className="mt-1 text-xs text-white/60">Registrasi batch, pemakaian stok, proteksi aktif, dan reminder booster otomatis.</p></div><Button size="sm" onClick={() => setEditing(null)}><Plus size={14} /> Catat Vaksinasi</Button></div></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Total Catatan" value={records.length} tone="brand" icon={<Syringe size={18} />} /><StatCard label="Proteksi Aktif" value={effective.filter((item) => item.status === 'Aktif').length} tone="emerald" /><StatCard label="Perlu Booster" value={effective.filter((item) => item.status === 'Perlu Booster').length} tone="amber" /><StatCard label="Terlambat" value={effective.filter((item) => item.status === 'Terlambat').length} tone="rose" /></div>
    <Card><div className="grid gap-3 md:grid-cols-[1fr_220px_auto]"><div className="relative"><Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari pasien, pemilik, vaksin, batch…" /></div><Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{['Semua', 'Aktif', 'Perlu Booster', 'Terlambat', 'Selesai', 'Dibatalkan'].map((item) => <option key={item}>{item}</option>)}</Select><Badge tone="brand" className="self-center justify-center">{filtered.length} catatan</Badge></div></Card>
    {filtered.length === 0 ? <Card><EmptyState icon={<ShieldCheck size={22} />} title="Belum ada catatan vaksinasi" description="Catat imunisasi pasien untuk mengaktifkan reminder booster." /></Card> : <div className="grid gap-4 xl:grid-cols-2">{filtered.map((record) => <Card key={record.id}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><Syringe size={18} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{record.vaccineName}</h3><Badge tone={vaccineTone(record.status)}>{record.status}</Badge></div><p className="mt-0.5 text-xs text-slate-500">{record.patient.petName} — {record.patient.ownerName}</p></div></div><div className="flex"><Button variant="ghost" size="icon" onClick={() => setEditing(record)}><Pencil size={14} /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}><Trash2 size={14} /></Button></div></div><div className="mt-4 grid grid-cols-2 gap-3"><Info label="Diberikan" value={formatDayDateID(record.givenDate)} /><Info label="Booster Berikutnya" value={record.nextDueDate ? formatDayDateID(record.nextDueDate) : '-'} /><Info label="Dokter" value={record.veterinarianName} /><Info label="Batch" value={record.batchNumber || '-'} /></div>{record.notes && <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{record.notes}</p>}{record.nextDueDate && <Button className="mt-3" size="sm" variant="secondary" onClick={() => void remind(record)}><Send size={13} /> Reminder WhatsApp</Button>}</Card>)}</div>}
    <VaccinationForm key={editing?.id ?? (editing === null ? 'new' : 'closed')} open={editing !== undefined} record={editing || null} patients={patients} doctors={config?.doctors ?? []} inventory={inventory} onClose={() => setEditing(undefined)} onSave={(value) => void persist(value).catch((error) => pushToast({ tone: 'error', title: 'Gagal menyimpan', message: String(error.message || error) }))} />
    <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus catatan vaksinasi?" size="sm" footer={<><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button><Button variant="danger" onClick={() => { if (!deleteTarget) return; void deleteRecord.mutateAsync(deleteTarget.id).then(() => setDeleteTarget(null)); }}>Hapus</Button></>}><p className="text-sm text-slate-600 dark:text-slate-300">Catatan vaksin dihapus. Reminder terkait tetap tercatat untuk menjaga jejak audit dan dapat dibatalkan melalui menu Reminder.</p></Modal>
  </div>;
}

function VaccinationForm({ open, record, patients, doctors, inventory, onClose, onSave }: { open: boolean; record: VaccinationRecord | null; patients: ReturnType<typeof buildClinicalPatients>; doctors: string[]; inventory: InventoryItem[]; onClose: () => void; onSave: (record: VaccinationRecord) => void }) {
  const [patientKey, setPatientKey] = useState(record ? clinicalPatientKey(record.patient) : patients[0]?.key || '');
  const [vaccineName, setVaccineName] = useState(record?.vaccineName || ''); const [vaccineType, setVaccineType] = useState<VaccinationRecord['vaccineType']>(record?.vaccineType || 'Inti');
  const [givenDate, setGivenDate] = useState(record?.givenDate || todayISO()); const [nextDueDate, setNextDueDate] = useState(record?.nextDueDate || '');
  const [veterinarianName, setVeterinarianName] = useState(record?.veterinarianName || doctors[0] || ''); const [batchNumber, setBatchNumber] = useState(record?.batchNumber || '');
  const [status, setStatus] = useState<VaccinationStatus>(record?.status || 'Aktif'); const [notes, setNotes] = useState(record?.notes || '');
  const [inventoryItemId, setInventoryItemId] = useState(record?.inventoryItemId || ''); const [inventoryQuantity, setInventoryQuantity] = useState(record?.inventoryQuantity || 1); const [error, setError] = useState('');
  if (!open) return null;
  const submit = () => { const patient = patients.find((item) => item.key === patientKey) || (record ? { ...record.patient, key: patientKey, label: '' } : undefined); if (!patient || !vaccineName.trim() || !givenDate || !veterinarianName) { setError('Pasien, nama vaksin, tanggal, dan dokter wajib diisi.'); return; } const now = new Date().toISOString(); onSave({ id: record?.id || generateId('VAC'), patient: { petName: patient.petName, petType: patient.petType, petBreed: patient.petBreed, ownerName: patient.ownerName, ownerPhone: patient.ownerPhone, appointmentId: patient.appointmentId, appointmentPetIndex: patient.appointmentPetIndex }, vaccineName: vaccineName.trim(), vaccineType, givenDate, nextDueDate: nextDueDate || undefined, veterinarianName, batchNumber: batchNumber || undefined, status, notes: notes || undefined, inventoryItemId: inventoryItemId || undefined, inventoryQuantity: inventoryItemId ? inventoryQuantity : undefined, inventoryCommittedAt: record?.inventoryCommittedAt, createdAt: record?.createdAt || now, updatedAt: now }); };
  return <Modal isOpen={open} onClose={onClose} title={record ? 'Edit Catatan Vaksinasi' : 'Catat Vaksinasi'} subtitle="Reminder booster dibuat otomatis dari tanggal berikutnya" icon={<Syringe size={18} />} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Simpan Vaksinasi</Button></>}><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Pasien" required><Select value={patientKey} onChange={(event) => setPatientKey(event.target.value)} disabled={!!record}><option value="">Pilih pasien</option>{patients.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></Field><Field label="Nama Vaksin" required><Input value={vaccineName} onChange={(event) => setVaccineName(event.target.value)} placeholder="Contoh: Nobivac DHPPi" /></Field><Field label="Jenis"><Select value={vaccineType} onChange={(event) => setVaccineType(event.target.value as VaccinationRecord['vaccineType'])}>{['Inti', 'Booster', 'Tahunan', 'Rabies', 'Lainnya'].map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Nomor Batch"><Input value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} /></Field><Field label="Tanggal Diberikan" required><Input type="date" value={givenDate} onChange={(event) => setGivenDate(event.target.value)} /></Field><Field label="Jadwal Booster"><Input type="date" min={givenDate} value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} /></Field><Field label="Dokter" required><Select value={veterinarianName} onChange={(event) => setVeterinarianName(event.target.value)}><option value="">Pilih dokter</option>{doctors.map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Status"><Select value={status} onChange={(event) => setStatus(event.target.value as VaccinationStatus)}>{['Aktif', 'Perlu Booster', 'Terlambat', 'Selesai', 'Dibatalkan'].map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Item Inventaris"><Select value={inventoryItemId} onChange={(event) => setInventoryItemId(event.target.value)} disabled={!!record?.inventoryCommittedAt}><option value="">Tidak potong stok</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} — stok {item.stock} {item.unit}</option>)}</Select></Field><Field label="Jumlah Pemakaian"><Input type="number" min={1} value={inventoryQuantity} onChange={(event) => setInventoryQuantity(Math.max(1, Number(event.target.value) || 1))} disabled={!inventoryItemId || !!record?.inventoryCommittedAt} /></Field></div><Field label="Catatan"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>{nextDueDate && <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"><BellRing size={15} /> Follow-up booster otomatis dijadwalkan {formatDayDateID(nextDueDate)}.</div>}{error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}</div></Modal>;
}

function effectiveRecord(record: VaccinationRecord): VaccinationRecord { if (!record.nextDueDate || ['Selesai', 'Dibatalkan'].includes(record.status)) return record; const today = todayISO(); if (record.nextDueDate < today) return { ...record, status: 'Terlambat' }; const soon = new Date(); soon.setDate(soon.getDate() + 30); const soonIso = soon.toISOString().slice(0, 10); return record.nextDueDate <= soonIso ? { ...record, status: 'Perlu Booster' } : record; }
function vaccineTone(status: VaccinationStatus): BadgeTone { return status === 'Aktif' ? 'emerald' : status === 'Perlu Booster' ? 'amber' : status === 'Terlambat' ? 'rose' : 'slate'; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">{label}</p><p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">{value}</p></div>; }
