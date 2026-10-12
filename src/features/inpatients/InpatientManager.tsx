import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import {
  Activity,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  Clock3,
  FileText,
  HeartPulse,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Settings2,
  Stethoscope,
  Thermometer,
  Trash2,
  UserRound,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/Section';
import {
  useAddActivityLog,
  useAppConfig,
  useAppointments,
  useDeleteInpatient,
  useInpatients,
  useInventory,
  useSaveInpatient,
  useSaveInventoryItem,
} from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import type {
  Appointment,
  Inpatient,
  InpatientInventoryUsage,
  InpatientNote,
  InpatientStatus,
  InventoryItem,
  PetType,
} from '../../types';
import { formatDateID, formatDayDateID, generateId, todayISO } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

type ListFilter = 'active' | 'all' | 'discharged';
type DeleteTarget = { kind: 'patient'; patient: Inpatient } | { kind: 'note'; patient: Inpatient; note: InpatientNote };

const CAPACITY_KEY = 'jpc_inpatient_capacity';

function readCapacity(): number {
  try {
    return Math.max(1, Math.min(200, Number(localStorage.getItem(CAPACITY_KEY)) || 12));
  } catch {
    return 12;
  }
}

export default function InpatientManager() {
  const { data: inpatients = [] } = useInpatients();
  const { data: appointments = [] } = useAppointments();
  const { data: inventory = [] } = useInventory();
  const { data: config } = useAppConfig();
  const saveInpatient = useSaveInpatient();
  const deleteInpatient = useDeleteInpatient();
  const saveInventory = useSaveInventoryItem();
  const addActivityLog = useAddActivityLog();
  const session = useAppStore((s) => s.session);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ListFilter>('active');
  const [capacity, setCapacity] = useState(readCapacity);
  const [showCapacity, setShowCapacity] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Inpatient | null>(null);
  const [noteFor, setNoteFor] = useState<Inpatient | null>(null);
  const [editingNote, setEditingNote] = useState<InpatientNote | null>(null);
  const [previewNote, setPreviewNote] = useState<InpatientNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const active = inpatients.filter((item) => item.status !== 'Sudah Pulang');
  const standardActive = active.filter((item) => item.cageNumber.startsWith('Kandang Rawat Inap'));
  const critical = inpatients.filter((item) => item.status === 'Kritis').length;
  const occupancy = Math.min(100, Math.round((standardActive.length / capacity) * 100));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inpatients.filter((item) => {
      const statusMatch = filter === 'all' || (filter === 'active' ? item.status !== 'Sudah Pulang' : item.status === 'Sudah Pulang');
      const searchMatch = !q || [item.petName, item.ownerName, item.ownerPhone, item.cageNumber, item.diagnosis, item.doctorName]
        .some((value) => value.toLowerCase().includes(q));
      return statusMatch && searchMatch;
    });
  }, [filter, inpatients, search]);

  useEffect(() => {
    if (selectedId && filtered.some((item) => item.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = inpatients.find((item) => item.id === selectedId) ?? null;

  const log = (action: string, patient: Inpatient, details: string) => {
    addActivityLog.mutate({
      id: generateId('act-inp'),
      staffName: session?.username || 'Staf',
      role: session?.role || 'Klinik',
      action,
      timestamp: new Date().toISOString(),
      targetId: patient.id,
      targetName: patient.petName,
      details,
    });
  };

  const savePatient = (patient: Inpatient, isNew: boolean) => {
    saveInpatient.mutate(patient, {
      onSuccess: () => {
        setSelectedId(patient.id);
        setShowPatientForm(false);
        setEditingPatient(null);
        log(isNew ? 'Pasien Rawat Inap Masuk' : 'Update Rawat Inap', patient, `${patient.cageNumber} • ${patient.status}`);
        pushToast({ tone: 'success', title: isNew ? 'Pasien berhasil diterima' : 'Data pasien diperbarui', message: `${patient.petName} • ${patient.cageNumber}` });
      },
    });
  };

  const saveNote = (patient: Inpatient, note: InpatientNote, previous?: InpatientNote) => {
    const oldUsage = previous?.inventoryItems ?? [];
    const inventoryUpdates = inventory.map((item) => {
      const oldQty = oldUsage.find((usage) => usage.itemId === item.id)?.quantity ?? 0;
      const newQty = note.inventoryItems.find((usage) => usage.itemId === item.id)?.quantity ?? 0;
      return oldQty === newQty ? null : { ...item, stock: item.stock + oldQty - newQty, lastUpdated: todayISO() };
    }).filter((item): item is InventoryItem => !!item);

    inventoryUpdates.forEach((item) => saveInventory.mutate(item));
    const dailyNotes = previous
      ? patient.dailyNotes.map((item) => (item.id === previous.id ? note : item))
      : [...patient.dailyNotes, note];
    const updated = { ...patient, dailyNotes, updatedAt: new Date().toISOString() };
    saveInpatient.mutate(updated, {
      onSuccess: () => {
        setNoteFor(null);
        setEditingNote(null);
        log(previous ? 'Edit Observasi Rawat Inap' : 'Tambah Observasi Rawat Inap', updated, `${note.date} ${note.time} • ${note.checkedBy}`);
        pushToast({ tone: 'success', title: previous ? 'Observasi diperbarui' : 'Observasi tersimpan', message: note.inventoryItems.length ? 'Stok inventaris telah disesuaikan.' : undefined });
      },
    });
  };

  const discharge = (patient: Inpatient) => {
    const updated: Inpatient = { ...patient, status: 'Sudah Pulang', dischargeDate: todayISO(), updatedAt: new Date().toISOString() };
    saveInpatient.mutate(updated, {
      onSuccess: () => {
        log('Pasien Rawat Inap Pulang', updated, `Dipulangkan pada ${formatDateID(todayISO())}`);
        pushToast({ tone: 'success', title: 'Pasien dipulangkan', message: `${patient.petName} keluar dari ${patient.cageNumber}.` });
      },
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'patient') {
      deleteInpatient.mutate(deleteTarget.patient.id, {
        onSuccess: () => {
          log('Hapus Data Rawat Inap', deleteTarget.patient, 'Riwayat rawat inap dihapus');
          setDeleteTarget(null);
          pushToast({ tone: 'success', title: 'Data rawat inap dihapus' });
        },
      });
      return;
    }
    const { patient, note } = deleteTarget;
    note.inventoryItems.forEach((usage) => {
      const item = inventory.find((inv) => inv.id === usage.itemId);
      if (item) saveInventory.mutate({ ...item, stock: item.stock + usage.quantity, lastUpdated: todayISO() });
    });
    const updated = { ...patient, dailyNotes: patient.dailyNotes.filter((item) => item.id !== note.id), updatedAt: new Date().toISOString() };
    saveInpatient.mutate(updated, {
      onSuccess: () => {
        log('Hapus Observasi Rawat Inap', updated, `${note.date} ${note.time}; stok dikembalikan`);
        setDeleteTarget(null);
        pushToast({ tone: 'success', title: 'Observasi dihapus', message: 'Pemakaian stok pada observasi ini telah dikembalikan.' });
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pasien Aktif" value={active.length} tone="brand" icon={<BedDouble size={18} />} hint={`${Math.max(0, capacity - standardActive.length)} kandang standar tersedia`} />
        <StatCard label="Kritis" value={critical} tone={critical ? 'rose' : 'slate'} icon={<HeartPulse size={18} />} hint="Perlu perhatian" />
        <StatCard label="Observasi Hari Ini" value={inpatients.reduce((sum, item) => sum + item.dailyNotes.filter((note) => note.date === todayISO()).length, 0)} tone="emerald" icon={<Activity size={18} />} />
        <StatCard label="Okupansi" value={`${occupancy}%`} tone={occupancy >= 90 ? 'rose' : occupancy >= 70 ? 'amber' : 'sky'} icon={<BedDouble size={18} />} hint={`${standardActive.length} dari ${capacity} kandang standar`} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Cari pasien, pemilik, kandang, diagnosis…" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([['active', 'Aktif'], ['all', 'Semua'], ['discharged', 'Sudah Pulang']] as [ListFilter, string][]).map(([value, label]) => (
              <button key={value} onClick={() => setFilter(value)} className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${filter === value ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/50 dark:text-brand-300' : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700'}`}>{label}</button>
            ))}
            <Button size="sm" variant="secondary" onClick={() => setShowCapacity(true)}><Settings2 size={13} /> Kapasitas</Button>
            <Button size="sm" onClick={() => { setEditingPatient(null); setShowPatientForm(true); }}><Plus size={13} /> Terima Pasien</Button>
          </div>
        </div>
      </Card>

      <div className="grid min-h-[560px] gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-fit !p-0 xl:max-h-[calc(100vh-265px)] xl:overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="font-display text-xs font-bold text-slate-800 dark:text-white">Daftar Pasien <span className="ml-1 text-slate-400">({filtered.length})</span></p>
          </div>
          <div className="custom-scrollbar max-h-[460px] space-y-1 overflow-y-auto p-2 xl:max-h-[calc(100vh-315px)]">
            {filtered.length === 0 ? <EmptyState icon={<BedDouble size={20} />} title="Pasien tidak ditemukan" description="Ubah filter atau terima pasien baru." /> : filtered.map((patient) => {
              const lastNote = latestNote(patient);
              return (
                <button key={patient.id} onClick={() => setSelectedId(patient.id)} className={`w-full cursor-pointer rounded-xl border p-3 text-left transition-all ${selectedId === patient.id ? 'border-brand-300 bg-brand-50 shadow-sm dark:border-brand-800 dark:bg-brand-950/30' : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{patient.petName}</p><p className="truncate text-[10px] text-slate-500">{patient.petType} • {patient.petBreed}</p></div>
                    <StatusBadge status={patient.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500"><span className="truncate font-semibold">{patient.cageNumber}</span><span>{daysAdmitted(patient)} hari</span></div>
                  {lastNote && <p className="mt-1.5 truncate text-[10px] text-slate-400">Terakhir: {lastNote.temperature}°C • {lastNote.condition}</p>}
                </button>
              );
            })}
          </div>
        </Card>

        {selected ? (
          <PatientDetail
            patient={selected}
            onEdit={() => { setEditingPatient(selected); setShowPatientForm(true); }}
            onDelete={() => setDeleteTarget({ kind: 'patient', patient: selected })}
            onDischarge={() => discharge(selected)}
            onAddNote={() => { setEditingNote(null); setNoteFor(selected); }}
            onEditNote={(note) => { setEditingNote(note); setNoteFor(selected); }}
            onPreviewNote={setPreviewNote}
            onDeleteNote={(note) => setDeleteTarget({ kind: 'note', patient: selected, note })}
            onPrint={() => printResume(selected)}
          />
        ) : (
          <Card className="flex min-h-96 items-center justify-center"><EmptyState icon={<BedDouble size={24} />} title="Pilih pasien" description="Detail monitoring pasien akan tampil di sini." /></Card>
        )}
      </div>

      <PatientFormModal
        open={showPatientForm}
        editing={editingPatient}
        appointments={appointments}
        existing={inpatients}
        doctors={config?.doctors ?? []}
        capacity={capacity}
        onClose={() => { setShowPatientForm(false); setEditingPatient(null); }}
        onSave={savePatient}
      />
      <NoteFormModal patient={noteFor} editing={editingNote} inventory={inventory} doctors={config?.doctors ?? []} sessionName={session?.username || ''} onClose={() => { setNoteFor(null); setEditingNote(null); }} onSave={saveNote} />
      <NotePreview note={previewNote} onClose={() => setPreviewNote(null)} />
      <CapacityModal open={showCapacity} capacity={capacity} activeCount={standardActive.length} onClose={() => setShowCapacity(false)} onSave={(value) => { setCapacity(value); localStorage.setItem(CAPACITY_KEY, String(value)); setShowCapacity(false); pushToast({ tone: 'success', title: 'Kapasitas diperbarui', message: `${value} kandang rawat inap.` }); }} />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title={deleteTarget?.kind === 'note' ? 'Hapus catatan observasi?' : 'Hapus data rawat inap?'} message={deleteTarget?.kind === 'note' ? 'Catatan akan dihapus dan stok yang terpakai akan dikembalikan.' : 'Seluruh riwayat monitoring pasien ini akan dihapus permanen. Stok historis tidak berubah.'} confirmLabel="Hapus" />
    </div>
  );
}

function PatientDetail({ patient, onEdit, onDelete, onDischarge, onAddNote, onEditNote, onPreviewNote, onDeleteNote, onPrint }: {
  patient: Inpatient;
  onEdit: () => void;
  onDelete: () => void;
  onDischarge: () => void;
  onAddNote: () => void;
  onEditNote: (note: InpatientNote) => void;
  onPreviewNote: (note: InpatientNote) => void;
  onDeleteNote: (note: InpatientNote) => void;
  onPrint: () => void;
}) {
  const notes = [...patient.dailyNotes].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  const latest = notes[0];
  const temps = patient.dailyNotes.map((note) => note.temperature).filter(Number.isFinite);
  const tempRange = temps.length ? `${Math.min(...temps).toFixed(1)}–${Math.max(...temps).toFixed(1)}°C` : '—';

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"><HeartPulse size={23} /></div>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{patient.petName}</h2><StatusBadge status={patient.status} /></div><p className="mt-0.5 text-xs text-slate-500">{patient.petType} • {patient.petBreed}{patient.petAge ? ` • ${patient.petAge}` : ''}</p><p className="mt-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300">{patient.cageNumber} • masuk {formatDateID(patient.admissionDate)}</p></div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={onPrint}><Printer size={13} /> Resume</Button>
            <Button size="sm" variant="secondary" onClick={onEdit}><Pencil size={13} /> Edit</Button>
            {patient.status !== 'Sudah Pulang' && <Button size="sm" variant="success" onClick={onDischarge}><CheckCircle2 size={13} /> Pulangkan</Button>}
            <Button size="icon" variant="ghost" onClick={onDelete} title="Hapus data"><Trash2 size={14} className="text-rose-500" /></Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800">
          <Info icon={<UserRound size={14} />} label="Pemilik" value={patient.ownerName} />
          <Info icon={<Phone size={14} />} label="Kontak darurat" value={patient.emergencyContact || patient.ownerPhone} />
          <Info icon={<Stethoscope size={14} />} label="Dokter PJ" value={patient.doctorName || 'Belum ditentukan'} />
          <Info icon={<CalendarDays size={14} />} label="Durasi" value={`${daysAdmitted(patient)} hari${patient.dischargeDate ? ` • pulang ${formatDateID(patient.dischargeDate)}` : ''}`} />
        </div>
        <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3 dark:border-brand-900 dark:bg-brand-950/20"><p className="text-[10px] font-bold tracking-wide text-brand-600 uppercase">Diagnosis masuk</p><p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{patient.diagnosis}</p></div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <MiniMetric label="Lama dirawat" value={`${daysAdmitted(patient)} hari`} icon={<Clock3 size={14} />} />
        <MiniMetric label="Rentang suhu" value={tempRange} icon={<Thermometer size={14} />} />
        <MiniMetric label="Observasi" value={`${patient.dailyNotes.length} catatan`} icon={<FileText size={14} />} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Perkembangan & Terapi Harian</h3><p className="mt-0.5 text-[11px] text-slate-500">Timeline monitoring kondisi pasien selama dirawat.</p></div>{patient.status !== 'Sudah Pulang' && <Button size="sm" onClick={onAddNote}><ClipboardPlus size={13} /> Tambah Observasi</Button>}</div>
        {latest && (latest.temperature < 37.5 || latest.temperature > 39.2) && <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><Thermometer size={16} /> Suhu terakhir {latest.temperature}°C berada di luar rentang normal 37,5–39,2°C.</div>}
        {notes.length === 0 ? <EmptyState icon={<ClipboardPlus size={22} />} title="Belum ada observasi" description="Tambahkan suhu, perkembangan kondisi, terapi, dan pemakaian inventaris pasien." /> : (
          <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-px before:bg-slate-200 dark:before:bg-slate-700">
            {notes.map((note) => (
              <div key={note.id} className="relative flex gap-3">
                <div className={`relative z-10 mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${note.temperature < 37.5 || note.temperature > 39.2 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}><Thermometer size={14} /></div>
                <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold text-slate-800 dark:text-slate-100">{formatDayDateID(note.date)} • {note.time} WIB</p><p className="mt-0.5 text-[10px] text-slate-500">Diperiksa oleh {note.checkedBy}</p></div><div className="flex items-center gap-1"><Badge tone={note.temperature < 37.5 || note.temperature > 39.2 ? 'rose' : 'emerald'}>{note.temperature}°C</Badge><button onClick={() => onPreviewNote(note)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800" title="Lihat detail"><FileText size={13} /></button>{patient.status !== 'Sudah Pulang' && <button onClick={() => onEditNote(note)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800" title="Edit"><Pencil size={13} /></button>}<button onClick={() => onDeleteNote(note)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" title="Hapus"><Trash2 size={13} /></button></div></div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2"><NoteSnippet label="Kondisi" value={note.condition} /><NoteSnippet label="Terapi" value={note.treatment} /></div>
                  {note.inventoryItems.length > 0 && <p className="mt-2 truncate text-[10px] text-slate-500">Inventaris: {note.inventoryItems.map((item) => `${item.name} ×${item.quantity}`).join(', ')}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PatientFormModal({ open, editing, appointments, existing, doctors, capacity, onClose, onSave }: {
  open: boolean; editing: Inpatient | null; appointments: Appointment[]; existing: Inpatient[]; doctors: string[]; capacity: number; onClose: () => void; onSave: (patient: Inpatient, isNew: boolean) => void;
}) {
  const empty = { source: '', petName: '', petType: 'Kucing' as PetType, petBreed: '', petAge: '', petGender: '', ownerName: '', ownerPhone: '', cageMode: 'standard', cageNumber: '', diagnosis: '', doctorName: '', emergencyContact: '', admissionDate: todayISO(), status: 'Perawatan Aktif' as InpatientStatus };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const active = existing.filter((item) => item.status !== 'Sudah Pulang' && item.id !== editing?.id);
  const cages = Array.from({ length: capacity }, (_, index) => `Kandang Rawat Inap ${String(index + 1).padStart(2, '0')}`);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editing) {
      setForm({ source: editing.appointmentId != null ? `${editing.appointmentId}::${editing.appointmentPetIndex ?? 0}` : '', petName: editing.petName, petType: editing.petType, petBreed: editing.petBreed, petAge: editing.petAge || '', petGender: editing.petGender || '', ownerName: editing.ownerName, ownerPhone: editing.ownerPhone, cageMode: editing.cageNumber.startsWith('Kandang Rawat Inap') ? 'standard' : 'custom', cageNumber: editing.cageNumber, diagnosis: editing.diagnosis, doctorName: editing.doctorName, emergencyContact: editing.emergencyContact, admissionDate: editing.admissionDate, status: editing.status });
    } else {
      const firstAvailable = cages.find((cage) => !active.some((item) => item.cageNumber === cage)) || '';
      setForm({ ...empty, cageNumber: firstAvailable, doctorName: doctors[0] || '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const candidates = appointments.flatMap((appointment) => appointment.pets.map((pet, petIndex) => ({ appointment, pet, petIndex, key: `${appointment.id}::${petIndex}` })))
    .filter(({ appointment, petIndex }) => !existing.some((item) => item.status !== 'Sudah Pulang' && item.appointmentId === appointment.id && item.appointmentPetIndex === petIndex && item.id !== editing?.id));

  const selectSource = (value: string) => {
    const match = candidates.find((candidate) => candidate.key === value);
    if (!match) { setForm((current) => ({ ...current, source: value })); return; }
    setForm((current) => ({ ...current, source: value, petName: match.pet.petName, petType: match.pet.petType, petBreed: match.pet.petBreed, petAge: match.pet.petAge || '', petGender: match.pet.petGender || '', ownerName: match.appointment.ownerName, ownerPhone: match.appointment.ownerPhone, emergencyContact: match.appointment.ownerPhone, diagnosis: match.pet.diagnosis || match.pet.conditionStory || match.pet.reasons.join(', '), doctorName: match.appointment.doctorName || current.doctorName }));
  };

  const submit = () => {
    if (!form.petName.trim() || !form.ownerName.trim() || !form.ownerPhone.trim() || !form.cageNumber.trim() || !form.diagnosis.trim() || !form.admissionDate) { setError('Lengkapi data pasien, pemilik, kandang, tanggal masuk, dan diagnosis.'); return; }
    if (active.some((item) => item.cageNumber.toLowerCase() === form.cageNumber.trim().toLowerCase())) { setError('Kandang tersebut sedang ditempati pasien aktif.'); return; }
    const [appointmentId, petIndex] = form.source.split('::');
    const now = new Date().toISOString();
    onSave({ id: editing?.id || generateId('inp'), appointmentId: appointmentId || undefined, appointmentPetIndex: appointmentId ? Number(petIndex) : undefined, petName: form.petName.trim(), petType: form.petType, petBreed: form.petBreed.trim() || 'Tidak diketahui', petAge: form.petAge.trim() || undefined, petGender: form.petGender.trim() || undefined, ownerName: form.ownerName.trim(), ownerPhone: form.ownerPhone.trim(), cageNumber: form.cageNumber.trim(), admissionDate: form.admissionDate, dischargeDate: form.status === 'Sudah Pulang' ? editing?.dischargeDate || todayISO() : undefined, status: form.status, diagnosis: form.diagnosis.trim(), doctorName: form.doctorName, emergencyContact: form.emergencyContact.trim() || form.ownerPhone.trim(), dailyNotes: editing?.dailyNotes || [], createdAt: editing?.createdAt || now, updatedAt: now }, !editing);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? `Edit Rawat Inap — ${editing.petName}` : 'Registrasi Pasien Rawat Inap'} subtitle="Hubungkan appointment klinik atau masukkan pasien secara manual." icon={<BedDouble size={18} />} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>{editing ? 'Simpan Perubahan' : 'Terima Pasien'}</Button></>}>
      <div className="space-y-5">
        {!editing && <Field label="Ambil dari Appointment Klinik" hint="Opsional. Data pasien dan pemilik akan terisi otomatis."><Select value={form.source} onChange={(event) => selectSource(event.target.value)}><option value="">Input pasien secara manual</option>{candidates.map(({ key, appointment, pet }) => <option key={key} value={key}>{pet.petName} — {appointment.ownerName} ({formatDateID(appointment.date)})</option>)}</Select></Field>}
        <div><p className="mb-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Identitas pasien</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Nama hewan" required><Input value={form.petName} onChange={(event) => setForm({ ...form, petName: event.target.value })} /></Field><Field label="Jenis" required><Select value={form.petType} onChange={(event) => setForm({ ...form, petType: event.target.value as PetType })}>{['Kucing', 'Anjing', 'Kelinci', 'Lainnya'].map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Ras"><Input value={form.petBreed} onChange={(event) => setForm({ ...form, petBreed: event.target.value })} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Usia"><Input value={form.petAge} onChange={(event) => setForm({ ...form, petAge: event.target.value })} /></Field><Field label="Kelamin"><Input value={form.petGender} onChange={(event) => setForm({ ...form, petGender: event.target.value })} /></Field></div></div></div>
        <div><p className="mb-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Pemilik & penempatan</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Nama pemilik" required><Input value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} /></Field><Field label="Nomor WhatsApp" required><Input value={form.ownerPhone} onChange={(event) => setForm({ ...form, ownerPhone: event.target.value })} /></Field><Field label="Jenis kandang"><Select value={form.cageMode} onChange={(event) => { const mode = event.target.value; const firstAvailable = cages.find((cage) => !active.some((item) => item.cageNumber === cage)) || ''; setForm({ ...form, cageMode: mode, cageNumber: mode === 'standard' ? firstAvailable : '' }); }}><option value="standard">Kandang standar</option><option value="custom">Area/kandang khusus</option></Select></Field><Field label="Nomor kandang" required>{form.cageMode === 'standard' ? <Select value={form.cageNumber} onChange={(event) => setForm({ ...form, cageNumber: event.target.value })}><option value="">Pilih kandang tersedia</option>{cages.map((cage) => { const occupied = active.find((item) => item.cageNumber === cage); return <option key={cage} value={cage} disabled={!!occupied}>{cage}{occupied ? ` — ${occupied.petName}` : ''}</option>; })}</Select> : <Input placeholder="Contoh: ICU 01" value={form.cageNumber} onChange={(event) => setForm({ ...form, cageNumber: event.target.value })} />}</Field><Field label="Tanggal masuk" required><Input type="date" value={form.admissionDate} onChange={(event) => setForm({ ...form, admissionDate: event.target.value })} /></Field><Field label="Kontak darurat"><Input value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} /></Field><Field label="Dokter penanggung jawab"><Select value={form.doctorName} onChange={(event) => setForm({ ...form, doctorName: event.target.value })}><option value="">Belum ditentukan</option>{doctors.map((doctor) => <option key={doctor}>{doctor}</option>)}</Select></Field>{editing && <Field label="Status"><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as InpatientStatus })}>{['Perawatan Aktif', 'Observasi', 'Kritis', 'Sudah Pulang'].map((status) => <option key={status}>{status}</option>)}</Select></Field>}</div></div>
        <Field label="Diagnosis masuk" required><Textarea rows={3} value={form.diagnosis} onChange={(event) => setForm({ ...form, diagnosis: event.target.value })} /></Field>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      </div>
    </Modal>
  );
}

function NoteFormModal({ patient, editing, inventory, doctors, sessionName, onClose, onSave }: { patient: Inpatient | null; editing: InpatientNote | null; inventory: InventoryItem[]; doctors: string[]; sessionName: string; onClose: () => void; onSave: (patient: Inpatient, note: InpatientNote, previous?: InpatientNote) => void }) {
  const currentTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const [form, setForm] = useState({ date: todayISO(), time: currentTime(), temperature: '38.5', condition: '', treatment: '', checkedBy: '', medicalTreatment: '', notes: '' });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [inventorySearch, setInventorySearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patient) return;
    setError('');
    setInventorySearch('');
    setForm(editing ? { date: editing.date, time: editing.time, temperature: String(editing.temperature), condition: editing.condition, treatment: editing.treatment, checkedBy: editing.checkedBy, medicalTreatment: editing.medicalTreatment || '', notes: editing.notes || '' } : { date: todayISO(), time: currentTime(), temperature: '38.5', condition: '', treatment: '', checkedBy: doctors[0] || sessionName, medicalTreatment: '', notes: '' });
    setQuantities(Object.fromEntries((editing?.inventoryItems ?? []).map((item) => [item.itemId, item.quantity])));
  }, [patient, editing, doctors, sessionName]);

  if (!patient) return null;
  const available = inventory.filter((item) => !inventorySearch || `${item.name} ${item.category}`.toLowerCase().includes(inventorySearch.toLowerCase()));
  const oldQty = (itemId: string) => editing?.inventoryItems.find((item) => item.itemId === itemId)?.quantity ?? 0;
  const changeQty = (item: InventoryItem, delta: number) => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, Math.min(item.stock + oldQty(item.id), (current[item.id] || 0) + delta)) }));

  const submit = () => {
    const temperature = Number(form.temperature);
    if (!form.date || !form.time || !Number.isFinite(temperature) || temperature < 30 || temperature > 45 || !form.condition.trim() || !form.treatment.trim() || !form.checkedBy.trim()) { setError('Lengkapi tanggal, waktu, suhu 30–45°C, kondisi, terapi, dan pemeriksa.'); return; }
    const usages: InpatientInventoryUsage[] = inventory.filter((item) => (quantities[item.id] || 0) > 0).map((item) => ({ itemId: item.id, name: item.name, category: item.category, unit: item.unit, quantity: quantities[item.id], price: item.sellingPrice || item.purchasePrice || 0 }));
    const now = new Date().toISOString();
    onSave(patient, { id: editing?.id || generateId('inp-note'), date: form.date, time: form.time, temperature, condition: form.condition.trim(), treatment: form.treatment.trim(), checkedBy: form.checkedBy.trim(), medicalTreatment: form.medicalTreatment.trim() || undefined, notes: form.notes.trim() || undefined, inventoryItems: usages, createdAt: editing?.createdAt || now }, editing || undefined);
  };

  return (
    <Modal isOpen={!!patient} onClose={onClose} title={editing ? 'Edit Catatan Observasi' : 'Tambah Catatan Observasi'} subtitle={`${patient.petName} • ${patient.cageNumber}`} icon={<ClipboardPlus size={18} />} size="xl" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Simpan Observasi</Button></>}>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Field label="Tanggal" required><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field><Field label="Waktu" required><Input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></Field><Field label="Suhu (°C)" required><Input type="number" step="0.1" min="30" max="45" value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value })} /></Field><Field label="Pemeriksa" required><Select value={form.checkedBy} onChange={(event) => setForm({ ...form, checkedBy: event.target.value })}><option value={sessionName}>{sessionName || 'Staf bertugas'}</option>{doctors.filter((doctor) => doctor !== sessionName).map((doctor) => <option key={doctor}>{doctor}</option>)}</Select></Field></div><Field label="Kondisi & perkembangan klinis" required><Textarea rows={3} placeholder="Nafsu makan, respons, eliminasi, perubahan kondisi…" value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} /></Field><Field label="Terapi / tindakan hari ini" required><Textarea rows={3} placeholder="Infus, pemberian obat, wound care, diet…" value={form.treatment} onChange={(event) => setForm({ ...form, treatment: event.target.value })} /></Field><Field label="Detail tindakan medis"><Textarea rows={2} value={form.medicalTreatment} onChange={(event) => setForm({ ...form, medicalTreatment: event.target.value })} /></Field><Field label="Catatan tambahan"><Textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>{error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}</div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/30"><p className="text-xs font-bold text-slate-800 dark:text-slate-100">Pemakaian Inventaris</p><p className="mb-3 mt-0.5 text-[10px] text-slate-500">Stok dipotong saat observasi disimpan.</p><Input placeholder="Cari obat atau barang…" value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} className="mb-2 text-xs" /><div className="custom-scrollbar max-h-80 space-y-1.5 overflow-y-auto pr-1">{available.map((item) => { const qty = quantities[item.id] || 0; const max = item.stock + oldQty(item.id); return <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{item.name}</p><p className={`text-[9px] ${max <= item.minStock ? 'font-bold text-rose-500' : 'text-slate-400'}`}>{item.category} • tersedia {max} {item.unit}</p></div><button type="button" onClick={() => changeQty(item, -1)} disabled={!qty} className="h-6 w-6 rounded border border-slate-200 text-xs disabled:opacity-30 dark:border-slate-700">−</button><span className="w-5 text-center font-mono text-xs font-bold">{qty}</span><button type="button" onClick={() => changeQty(item, 1)} disabled={qty >= max} className="h-6 w-6 rounded border border-slate-200 text-xs disabled:opacity-30 dark:border-slate-700">+</button></div>; })}{available.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Inventaris tidak ditemukan.</p>}</div></div>
      </div>
    </Modal>
  );
}

function NotePreview({ note, onClose }: { note: InpatientNote | null; onClose: () => void }) {
  if (!note) return null;
  return <Modal isOpen={!!note} onClose={onClose} title="Detail Observasi & Terapi" subtitle={`${formatDayDateID(note.date)} • ${note.time} WIB • ${note.checkedBy}`} icon={<FileText size={18} />} size="lg" footer={<Button variant="secondary" onClick={onClose}>Tutup</Button>}><div className="space-y-4"><div className={`rounded-xl border p-4 ${note.temperature < 37.5 || note.temperature > 39.2 ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'}`}><p className="text-[10px] font-bold uppercase text-slate-500">Suhu tubuh</p><p className="font-display mt-1 text-2xl font-bold">{note.temperature}°C</p><p className="text-[10px] text-slate-500">{note.temperature >= 37.5 && note.temperature <= 39.2 ? 'Dalam rentang normal' : 'Di luar rentang normal'}</p></div><PreviewBlock title="Kondisi & perkembangan" value={note.condition} /><PreviewBlock title="Terapi / tindakan" value={note.treatment} />{note.medicalTreatment && <PreviewBlock title="Detail tindakan medis" value={note.medicalTreatment} />}{note.notes && <PreviewBlock title="Catatan tambahan" value={note.notes} />}{note.inventoryItems.length > 0 && <div><p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Inventaris terpakai</p><div className="space-y-1">{note.inventoryItems.map((item) => <div key={item.itemId} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800"><span className="font-semibold">{item.name}</span><span className="font-mono">{item.quantity} {item.unit}</span></div>)}</div></div>}</div></Modal>;
}

function CapacityModal({ open, capacity, activeCount, onClose, onSave }: { open: boolean; capacity: number; activeCount: number; onClose: () => void; onSave: (value: number) => void }) {
  const [value, setValue] = useState(capacity);
  useEffect(() => { if (open) setValue(capacity); }, [open, capacity]);
  return <Modal isOpen={open} onClose={onClose} title="Kapasitas Rawat Inap" subtitle="Atur jumlah kandang standar yang tersedia." icon={<Settings2 size={18} />} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => onSave(Math.max(activeCount, Math.min(200, value)))}>Simpan</Button></>}><Field label="Jumlah kandang" hint={`Minimal ${activeCount} karena sedang ada ${activeCount} pasien aktif.`}><Input type="number" min={Math.max(1, activeCount)} max={200} value={value} onChange={(event) => setValue(Number(event.target.value) || 1)} /></Field></Modal>;
}

function StatusBadge({ status }: { status: InpatientStatus }) {
  const tone: BadgeTone = status === 'Kritis' ? 'rose' : status === 'Observasi' ? 'sky' : status === 'Sudah Pulang' ? 'slate' : 'amber';
  return <Badge tone={tone}>{status}</Badge>;
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex min-w-0 gap-2 text-slate-500"><span className="mt-0.5 text-brand-600">{icon}</span><div className="min-w-0"><p className="text-[9px] font-bold tracking-wide uppercase">{label}</p><p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{value}</p></div></div>; }
function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <Card className="!p-3"><div className="flex items-center gap-2 text-brand-600">{icon}<p className="truncate text-[9px] font-bold tracking-wide text-slate-400 uppercase">{label}</p></div><p className="font-display mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{value}</p></Card>; }
function NoteSnippet({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60"><p className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">{label}</p><p className="mt-0.5 line-clamp-2 text-[11px] text-slate-700 dark:text-slate-200">{value}</p></div>; }
function PreviewBlock({ title, value }: { title: string; value: string }) { return <div><p className="mb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">{title}</p><p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">{value}</p></div>; }
function latestNote(patient: Inpatient): InpatientNote | undefined { return [...patient.dailyNotes].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0]; }
function daysAdmitted(patient: Inpatient): number { const start = new Date(`${patient.admissionDate}T00:00:00`); const end = new Date(`${patient.dischargeDate || todayISO()}T00:00:00`); return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1); }
function escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char); }
function printResume(patient: Inpatient) {
  const popup = window.open('', '_blank');
  if (!popup) { pushToast({ tone: 'error', title: 'Popup diblokir', message: 'Izinkan popup browser untuk mencetak resume.' }); return; }
  const notes = [...patient.dailyNotes].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  popup.document.write(`<!doctype html><html><head><title>Resume Rawat Inap - ${escapeHtml(patient.petName)}</title><style>body{font-family:Arial,sans-serif;color:#1e293b;padding:36px;line-height:1.45}.head{text-align:center;border-bottom:3px double #0f766e;padding-bottom:16px}.head h1{color:#0f766e;margin:0;font-size:22px}.title{text-align:center;background:#f0fdfa;color:#0f766e;padding:10px;margin:24px 0;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;background:#f8fafc;padding:16px;border-radius:10px;font-size:12px}.grid b{display:block;color:#64748b;font-size:10px;text-transform:uppercase}.timeline{border-left:2px solid #cbd5e1;margin:24px 0 0 8px;padding-left:22px}.note{position:relative;margin-bottom:22px;page-break-inside:avoid}.note:before{content:'';position:absolute;left:-29px;top:4px;width:10px;height:10px;background:#0f766e;border:3px solid white;border-radius:50%;box-shadow:0 0 0 1px #0f766e}.date{font-size:11px;font-weight:700;color:#0f766e}.box{border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-top:6px;font-size:12px}.label{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700;margin-top:7px}@media print{body{padding:8px}}</style></head><body><div class="head"><h1>JEJE PET CARE</h1><div>Resume Medis Rawat Inap</div></div><div class="title">INFORMASI PASIEN & PEMILIK</div><div class="grid"><div><b>Pasien</b>${escapeHtml(patient.petName)} (${escapeHtml(patient.petType)} • ${escapeHtml(patient.petBreed)})</div><div><b>Pemilik</b>${escapeHtml(patient.ownerName)} • ${escapeHtml(patient.ownerPhone)}</div><div><b>Kandang</b>${escapeHtml(patient.cageNumber)}</div><div><b>Dokter PJ</b>${escapeHtml(patient.doctorName || '-')}</div><div><b>Tanggal masuk / keluar</b>${escapeHtml(formatDateID(patient.admissionDate))} / ${patient.dischargeDate ? escapeHtml(formatDateID(patient.dischargeDate)) : '-'}</div><div><b>Status</b>${escapeHtml(patient.status)}</div><div style="grid-column:1/-1"><b>Diagnosis masuk</b>${escapeHtml(patient.diagnosis)}</div></div><div class="title">PERKEMBANGAN & TERAPI HARIAN</div><div class="timeline">${notes.length ? notes.map((note) => `<div class="note"><div class="date">${escapeHtml(formatDayDateID(note.date))} • ${escapeHtml(note.time)} WIB • ${escapeHtml(note.checkedBy)}</div><div class="box"><strong>Suhu: ${note.temperature}°C</strong><div class="label">Kondisi</div>${escapeHtml(note.condition)}<div class="label">Terapi</div>${escapeHtml(note.treatment)}${note.medicalTreatment ? `<div class="label">Detail medis</div>${escapeHtml(note.medicalTreatment)}` : ''}${note.inventoryItems.length ? `<div class="label">Inventaris</div>${escapeHtml(note.inventoryItems.map((item) => `${item.name} ×${item.quantity} ${item.unit}`).join(', '))}` : ''}</div></div>`).join('') : '<p>Belum ada catatan observasi.</p>'}</div><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}
