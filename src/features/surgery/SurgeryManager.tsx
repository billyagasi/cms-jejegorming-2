import { useMemo, useState } from 'react';
import { BedDouble, FileDown, HeartPulse, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { InventoryItem, Surgery, SurgeryResourceItem, SurgeryStatus } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/Section';
import {
  useAddActivityLog,
  useAppointments,
  useDeleteSurgery,
  useInpatients,
  useInventory,
  useReservations,
  useSaveInpatient,
  useSaveInventoryItem,
  useSaveSurgery,
  useSurgeries,
  useAppConfig,
} from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { buildClinicalPatients, clinicalPatientKey } from '../clinical/clinicalPatients';
import { formatDayDateID, formatRupiah, generateId, todayISO } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

const STATUSES: SurgeryStatus[] = ['Direncanakan', 'Berlangsung', 'Selesai', 'Masa Pemulihan', 'Dibatalkan'];

export default function SurgeryManager() {
  const { data: surgeries = [] } = useSurgeries();
  const { data: appointments = [] } = useAppointments();
  const { data: reservations = [] } = useReservations();
  const { data: inpatients = [] } = useInpatients();
  const { data: inventory = [] } = useInventory();
  const { data: config } = useAppConfig();
  const saveSurgery = useSaveSurgery();
  const deleteSurgery = useDeleteSurgery();
  const saveInventory = useSaveInventoryItem();
  const saveInpatient = useSaveInpatient();
  const addLog = useAddActivityLog();
  const session = useAppStore((state) => state.session);
  const patients = useMemo(() => buildClinicalPatients(appointments, reservations, inpatients), [appointments, reservations, inpatients]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'Semua' | SurgeryStatus>('Semua');
  const [editing, setEditing] = useState<Surgery | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Surgery | null>(null);

  const filtered = surgeries.filter((item) => {
    const q = search.toLowerCase();
    return (status === 'Semua' || item.status === status) &&
      (!q || [item.patient.petName, item.patient.ownerName, item.procedureName, item.surgeonName].some((value) => value.toLowerCase().includes(q)));
  });

  const persist = async (next: Surgery) => {
    const previous = surgeries.find((item) => item.id === next.id);
    let value = next;
    const isCommitting = ['Selesai', 'Masa Pemulihan'].includes(next.status) && !previous?.inventoryCommittedAt && !next.inventoryCommittedAt;
    if (isCommitting) {
      for (const resource of next.resourceItems.filter((item) => item.itemId)) {
        const stock = inventory.find((item) => item.id === resource.itemId);
        if (!stock || stock.stock < resource.quantity) throw new Error(`Stok ${resource.name} tidak mencukupi.`);
      }
      for (const resource of next.resourceItems.filter((item) => item.itemId)) {
        const stock = inventory.find((item) => item.id === resource.itemId)!;
        await saveInventory.mutateAsync({ ...stock, stock: stock.stock - resource.quantity, lastUpdated: new Date().toISOString() });
      }
      value = { ...next, inventoryCommittedAt: new Date().toISOString() };
    }
    await saveSurgery.mutateAsync(value);
    await addLog.mutateAsync({
      id: generateId('log'), staffName: session?.username || 'Staf', role: session?.role || 'Staf',
      action: previous ? 'Ubah Operasi' : 'Tambah Operasi', timestamp: new Date().toISOString(), targetId: value.id,
      targetName: `${value.procedureName} — ${value.patient.petName}`, details: `Status ${value.status}; dokter ${value.surgeonName}`,
    });
    setEditing(undefined);
    pushToast({ tone: 'success', title: 'Agenda operasi tersimpan', message: `${value.patient.petName} • ${value.status}` });
  };

  const sendToRecovery = async (surgery: Surgery) => {
    if (surgery.inpatientId) return;
    const inpatientId = generateId('RI');
    await saveInpatient.mutateAsync({
      id: inpatientId,
      appointmentId: surgery.patient.appointmentId,
      appointmentPetIndex: surgery.patient.appointmentPetIndex,
      petName: surgery.patient.petName,
      petType: surgery.patient.petType,
      petBreed: surgery.patient.petBreed || '-',
      ownerName: surgery.patient.ownerName,
      ownerPhone: surgery.patient.ownerPhone,
      cageNumber: 'Recovery', admissionDate: todayISO(), status: 'Observasi',
      diagnosis: `Pemulihan pasca ${surgery.procedureName}`,
      doctorName: surgery.surgeonName, emergencyContact: surgery.patient.ownerPhone,
      dailyNotes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    await saveSurgery.mutateAsync({ ...surgery, status: 'Masa Pemulihan', inpatientId, updatedAt: new Date().toISOString() });
    pushToast({ tone: 'success', title: 'Masuk ruang pemulihan', message: 'Data pasien diteruskan ke Rawat Inap.' });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-linear-to-r from-slate-950 via-rose-950 to-slate-900 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-[10px] font-bold tracking-[.18em] text-rose-300 uppercase">Clinical Operations</p><h2 className="font-display mt-1 text-xl font-bold">Operasi & Tindakan Bedah</h2><p className="mt-1 text-xs text-white/60">Agenda, tim bedah, anestesi, BMHP, inventaris, dan pemulihan dalam satu alur.</p></div>
          <Button size="sm" onClick={() => setEditing(null)}><Plus size={14} /> Jadwalkan Operasi</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Terjadwal" value={surgeries.filter((item) => item.status === 'Direncanakan').length} tone="sky" />
        <StatCard label="Berlangsung" value={surgeries.filter((item) => item.status === 'Berlangsung').length} tone="amber" />
        <StatCard label="Pemulihan" value={surgeries.filter((item) => item.status === 'Masa Pemulihan').length} tone="brand" />
        <StatCard label="Selesai" value={surgeries.filter((item) => item.status === 'Selesai').length} tone="emerald" />
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <div className="relative"><Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari pasien, pemilik, prosedur, dokter…" /></div>
          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option>Semua</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</Select>
          <Badge tone="brand" className="self-center justify-center">{filtered.length} agenda</Badge>
        </div>
      </Card>
      {filtered.length === 0 ? <Card><EmptyState icon={<HeartPulse size={22} />} title="Belum ada agenda operasi" description="Jadwalkan tindakan bedah pertama dari tombol di atas." /></Card> : (
        <div className="grid gap-4 xl:grid-cols-2">{filtered.map((item) => <SurgeryCard key={item.id} surgery={item} onEdit={() => setEditing(item)} onDelete={() => setDeleteTarget(item)} onRecovery={() => void sendToRecovery(item)} />)}</div>
      )}
      <SurgeryForm key={editing?.id ?? (editing === null ? 'new' : 'closed')} open={editing !== undefined} surgery={editing || null} patients={patients} doctors={config?.doctors ?? []} inventory={inventory} onClose={() => setEditing(undefined)} onSave={(value) => void persist(value).catch((error) => pushToast({ tone: 'error', title: 'Gagal menyimpan', message: String(error.message || error) }))} />
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus agenda operasi?" subtitle={deleteTarget ? `${deleteTarget.patient.petName} • ${deleteTarget.procedureName}` : ''} size="sm" footer={<><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button><Button variant="danger" onClick={() => { if (!deleteTarget) return; void deleteSurgery.mutateAsync(deleteTarget.id).then(() => setDeleteTarget(null)); }}>Hapus</Button></>}><p className="text-sm text-slate-600 dark:text-slate-300">Agenda dihapus permanen. Pemakaian stok yang sudah dikomit tidak dikembalikan otomatis demi menjaga audit inventaris.</p></Modal>
    </div>
  );
}

function SurgeryCard({ surgery, onEdit, onDelete, onRecovery }: { surgery: Surgery; onEdit: () => void; onDelete: () => void; onRecovery: () => void }) {
  const total = surgery.resourceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return <Card className="overflow-hidden p-0"><div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display font-bold text-slate-900 dark:text-white">{surgery.procedureName}</h3><Badge tone={statusTone(surgery.status)}>{surgery.status}</Badge><Badge tone={surgery.urgency === 'Darurat' ? 'rose' : surgery.urgency === 'Mendesak' ? 'amber' : 'slate'}>{surgery.urgency}</Badge></div><p className="mt-1 text-xs text-slate-500">{formatDayDateID(surgery.date)} • {surgery.time} WIB</p></div><div className="flex"><Button size="icon" variant="ghost" onClick={onEdit}><Pencil size={14} /></Button><Button size="icon" variant="ghost" onClick={() => printSurgery(surgery)}><FileDown size={14} /></Button><Button size="icon" variant="ghost" onClick={onDelete}><Trash2 size={14} /></Button></div></div></div><div className="space-y-3 p-4"><div className="grid grid-cols-2 gap-3 text-xs"><Info label="Pasien" value={`${surgery.patient.petName} • ${surgery.patient.petType}`} /><Info label="Pemilik" value={surgery.patient.ownerName} /><Info label="Dokter Bedah" value={surgery.surgeonName} /><Info label="Asisten" value={surgery.assistantDoctorName || surgery.nonDoctorAssistant || '-'} /></div>{surgery.preOpDiagnosis && <Info label="Diagnosis Praoperasi" value={surgery.preOpDiagnosis} />}{surgery.resourceItems.length > 0 && <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="mb-2 text-[10px] font-bold text-slate-400 uppercase">Tindakan, anestesi & BMHP</p>{surgery.resourceItems.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between text-xs"><span>{item.category} • {item.name} ×{item.quantity}</span><span className="font-mono">{formatRupiah(item.price * item.quantity)}</span></div>)}<div className="mt-2 border-t pt-2 text-right text-xs font-bold dark:border-slate-700">Total {formatRupiah(total)}</div></div>}{surgery.status === 'Selesai' && !surgery.inpatientId && <Button size="sm" variant="secondary" onClick={onRecovery}><BedDouble size={13} /> Lanjut Ruang Pemulihan</Button>}{surgery.inpatientId && <Badge tone="brand"><BedDouble size={11} /> Terhubung Rawat Inap</Badge>}</div></Card>;
}

function SurgeryForm({ open, surgery, patients, doctors, inventory, onClose, onSave }: { open: boolean; surgery: Surgery | null; patients: ReturnType<typeof buildClinicalPatients>; doctors: string[]; inventory: InventoryItem[]; onClose: () => void; onSave: (value: Surgery) => void }) {
  const initialPatient = surgery ? clinicalPatientKey(surgery.patient) : patients[0]?.key || '';
  const [patientKey, setPatientKey] = useState(initialPatient);
  const [procedureName, setProcedureName] = useState(surgery?.procedureName || '');
  const [date, setDate] = useState(surgery?.date || todayISO());
  const [time, setTime] = useState(surgery?.time || '09:00');
  const [surgeonName, setSurgeonName] = useState(surgery?.surgeonName || doctors[0] || '');
  const [assistantDoctorName, setAssistantDoctorName] = useState(surgery?.assistantDoctorName || '');
  const [urgency, setUrgency] = useState<Surgery['urgency']>(surgery?.urgency || 'Rutin');
  const [status, setStatus] = useState<SurgeryStatus>(surgery?.status || 'Direncanakan');
  const [preOpDiagnosis, setPreOpDiagnosis] = useState(surgery?.preOpDiagnosis || '');
  const [anesthesiaNotes, setAnesthesiaNotes] = useState(surgery?.anesthesiaNotes || '');
  const [procedureNotes, setProcedureNotes] = useState(surgery?.procedureNotes || '');
  const [resources, setResources] = useState<SurgeryResourceItem[]>(surgery?.resourceItems || []);
  const [error, setError] = useState('');
  if (!open) return null;
  const toggleResource = (id: string) => { const stock = inventory?.find((item) => item.id === id); if (!stock) return; const exists = resources.some((item) => item.itemId === id); setResources(exists ? resources.filter((item) => item.itemId !== id) : [...resources, { itemId: stock.id, name: stock.name, category: /anest/i.test(stock.category) ? 'Anestesi' : 'BMHP', quantity: 1, unit: stock.unit, price: stock.sellingPrice || stock.purchasePrice || 0 }]); };
  const submit = () => { const patient = patients.find((item) => item.key === patientKey) || (surgery ? { ...surgery.patient, key: patientKey, label: '' } : undefined); if (!patient || !procedureName.trim() || !surgeonName || !date || !time) { setError('Pasien, prosedur, dokter, tanggal, dan waktu wajib diisi.'); return; } const now = new Date().toISOString(); onSave({ id: surgery?.id || generateId('OP'), patient: { petName: patient.petName, petType: patient.petType, petBreed: patient.petBreed, ownerName: patient.ownerName, ownerPhone: patient.ownerPhone, appointmentId: patient.appointmentId, appointmentPetIndex: patient.appointmentPetIndex }, procedureName: procedureName.trim(), date, time, surgeonName, assistantDoctorName: assistantDoctorName || undefined, urgency, status, preOpDiagnosis, anesthesiaNotes, procedureNotes, recoveryNotes: surgery?.recoveryNotes, resourceItems: resources, photos: surgery?.photos, inventoryCommittedAt: surgery?.inventoryCommittedAt, inpatientId: surgery?.inpatientId, createdAt: surgery?.createdAt || now, updatedAt: now }); };
  return <Modal isOpen={open} onClose={onClose} title={surgery ? 'Edit Agenda Operasi' : 'Jadwalkan Operasi'} subtitle="Data klinis terhubung ke profil pasien dan inventaris" icon={<HeartPulse size={18} />} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Simpan Agenda</Button></>}><div className="space-y-5"><div className="grid gap-3 md:grid-cols-2"><Field label="Pasien" required><Select value={patientKey} onChange={(event) => setPatientKey(event.target.value)} disabled={!!surgery}><option value="">Pilih pasien</option>{patients.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></Field><Field label="Prosedur" required><Input value={procedureName} onChange={(event) => setProcedureName(event.target.value)} placeholder="Contoh: Ovariohisterektomi" /></Field><Field label="Tanggal" required><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label="Waktu" required><Input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></Field><Field label="Dokter Bedah" required><Select value={surgeonName} onChange={(event) => setSurgeonName(event.target.value)}><option value="">Pilih dokter</option>{doctors.map((doctor) => <option key={doctor}>{doctor}</option>)}</Select></Field><Field label="Dokter Asisten"><Select value={assistantDoctorName} onChange={(event) => setAssistantDoctorName(event.target.value)}><option value="">Tanpa dokter asisten</option>{doctors.filter((doctor) => doctor !== surgeonName).map((doctor) => <option key={doctor}>{doctor}</option>)}</Select></Field><Field label="Urgensi"><Select value={urgency} onChange={(event) => setUrgency(event.target.value as Surgery['urgency'])}>{['Rutin', 'Mendesak', 'Darurat'].map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Status"><Select value={status} onChange={(event) => setStatus(event.target.value as SurgeryStatus)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</Select></Field></div><Field label="Diagnosis praoperasi"><Textarea value={preOpDiagnosis} onChange={(event) => setPreOpDiagnosis(event.target.value)} /></Field><div className="grid gap-3 md:grid-cols-2"><Field label="Catatan anestesi"><Textarea value={anesthesiaNotes} onChange={(event) => setAnesthesiaNotes(event.target.value)} /></Field><Field label="Catatan tindakan"><Textarea value={procedureNotes} onChange={(event) => setProcedureNotes(event.target.value)} /></Field></div><div><p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">Anestesi & BMHP dari Inventaris</p><div className="grid max-h-52 gap-2 overflow-y-auto md:grid-cols-2">{inventory?.map((item) => { const selected = resources.find((resource) => resource.itemId === item.id); return <div key={item.id} className={`rounded-xl border p-2 ${selected ? 'border-brand-400 bg-brand-50/50 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-800'}`}><div className="flex items-center gap-2"><input type="checkbox" checked={!!selected} onChange={() => toggleResource(item.id)} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.name}</p><p className="text-[10px] text-slate-400">Stok {item.stock} {item.unit}</p></div>{selected && <Input type="number" min={1} max={item.stock} value={selected.quantity} onChange={(event) => setResources(resources.map((resource) => resource.itemId === item.id ? { ...resource, quantity: Math.max(1, Number(event.target.value) || 1) } : resource))} className="w-16" />}</div></div>; })}</div></div>{error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}</div></Modal>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">{label}</p><p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">{value || '-'}</p></div>; }
function statusTone(status: SurgeryStatus): BadgeTone { return status === 'Selesai' ? 'emerald' : status === 'Berlangsung' ? 'amber' : status === 'Dibatalkan' ? 'rose' : status === 'Masa Pemulihan' ? 'brand' : 'sky'; }
function printSurgery(surgery: Surgery) { const popup = window.open('', '_blank'); if (!popup) return; popup.document.write(`<!doctype html><html><head><title>Laporan Operasi ${surgery.id}</title><style>body{font-family:Arial;padding:36px;color:#1e293b}h1{color:#9f1239}.box{border:1px solid #ddd;padding:14px;margin:12px 0}table{width:100%;border-collapse:collapse}td{padding:6px;border-bottom:1px solid #eee}</style></head><body><h1>JEJE PET CARE</h1><h2>Laporan Operasi & Bedah</h2><div class="box"><b>${surgery.procedureName}</b><p>${surgery.patient.petName} — ${surgery.patient.ownerName}</p><p>${formatDayDateID(surgery.date)} ${surgery.time} WIB • ${surgery.status}</p><p>Dokter: ${surgery.surgeonName}</p></div><h3>Diagnosis Praoperasi</h3><p>${surgery.preOpDiagnosis || '-'}</p><h3>Anestesi</h3><p>${surgery.anesthesiaNotes || '-'}</p><h3>Catatan Operasi</h3><p>${surgery.procedureNotes || '-'}</p><table>${surgery.resourceItems.map((item) => `<tr><td>${item.category} • ${item.name}</td><td>${item.quantity}</td><td>${formatRupiah(item.price * item.quantity)}</td></tr>`).join('')}</table><script>window.onload=()=>window.print()</script></body></html>`); popup.document.close(); }
