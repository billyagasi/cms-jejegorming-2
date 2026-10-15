import { useMemo, useState } from 'react';
import { BellRing, CheckCircle2, ChevronLeft, ChevronRight, Copy, Plus, Scissors, Send, RotateCcw, Save, Search, Stethoscope, Trash2 } from 'lucide-react';
import { ClinicalFollowUp, Reservation } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { useAppointments, useClinicalFollowUps, useDeleteClinicalFollowUp, useInpatients, useReservations, useSaveClinicalFollowUp } from '../../data-layer/hooks';
import { loadFromStorage, saveToStorage } from '../../data-layer/storage';
import { copyToClipboard, waLink, formatDayDateID, generateId, MONTHS_ID, DAYS_ID, todayISO } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';
import { buildClinicalPatients, clinicalPatientKey } from '../clinical/clinicalPatients';

type TemplateStyle = 'friendly' | 'professional' | 'promo';

interface ReminderTarget {
  id: string;
  petName: string;
  ownerName: string;
  ownerPhone: string;
  petType: string;
  petBreed: string;
  lastDate: string;
  nextDate: string;
  daysElapsed: number;
}

const DEFAULT_TEMPLATES: Record<TemplateStyle, string> = {
  friendly:
    'Halo Kak {ownerName}! 🐾 {petName} udah {days} hari nggak grooming nih sejak kunjungan terakhir ({lastDate}). Yuk dibooking lagi biar {petName} tetap wangi, sehat, dan bebas gimbal! Jadwal idealnya sekitar {nextGroomingDate}. Sampai jumpa di Jeje Pet Care! 🛁✨',
  professional:
    'Selamat {days} hari sejak sesi grooming terakhir {petName} pada {lastGroomingDate}, Kak {ownerName}. Kami merekomendasikan perawatan berkala berikutnya pada {nextGroomingDate} untuk menjaga kesehatan kulit dan bulu {petName}. Silakan hubungi kami untuk penjadwalan. Terima kasih. — Jeje Pet Care',
  promo:
    'SPECIAL DEAL, Kak {ownerName}! 🎉 {petName} sudah {days} hari sejak grooming terakhir ({lastGroomingDate}). Booking sekarang di {nextGroomingDate} dan dapatkan gratis pisau kikir kuku untuk pendaftaran minggu ini! Slot terbatas — awas kehabisan! 🐶🐱',
};

const TPL_KEY = (style: TemplateStyle) => `jeje_rem_tpl_${style}`;

function petEmoji(type: string): string {
  return type === 'Kucing' ? '🐱' : type === 'Anjing' ? '🐶' : '🐾';
}

export default function KalenderReminder() {
  const [mode, setMode] = useState<'grooming' | 'clinical'>('grooming');
  return <div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Reminder & Follow-up</h2><p className="text-[11px] text-slate-500">Satu kalender tindak lanjut grooming dan klinis.</p></div>
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button type="button" onClick={() => setMode('grooming')} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold ${mode === 'grooming' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500'}`}><Scissors size={14} /> Grooming</button>
        <button type="button" onClick={() => setMode('clinical')} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold ${mode === 'clinical' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500'}`}><Stethoscope size={14} /> Klinis</button>
      </div>
    </div>
    {mode === 'grooming' ? <GroomingReminder /> : <ClinicalReminder />}
  </div>;
}

function GroomingReminder() {
  const { data: reservations = [] } = useReservations();

  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest'>('newest');
  const [selectedTarget, setSelectedTarget] = useState<ReminderTarget | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  const viewYear = now.getFullYear() + Math.floor((now.getMonth() + monthOffset) / 12);
  const viewMonth = ((now.getMonth() + monthOffset) % 12 + 12) % 12;

  // Hitung H+25 per pet (paritas KalenderReminder lama)
  const reminderList = useMemo(() => {
    const groups: Record<string, Reservation[]> = {};
    reservations.forEach((r) => {
      const key = `${r.ownerPhone.trim()}_${r.petName.trim()}`.toLowerCase();
      (groups[key] ||= []).push(r);
    });
    const list: ReminderTarget[] = [];
    Object.values(groups).forEach((history) => {
      const completed = history.filter((r) => r.status === 'Completed');
      if (completed.length === 0) return;
      const latest = completed.reduce((max, r) => (new Date(r.date) > new Date(max.date) ? r : max), completed[0]);
      const base = latest.resume?.nextGroomingDateIso || latest.date;
      const next = new Date(base);
      next.setDate(next.getDate() + 25);
      const days = Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24));
      list.push({
        id: latest.id,
        petName: latest.petName,
        ownerName: latest.ownerName,
        ownerPhone: latest.ownerPhone,
        petType: latest.petType,
        petBreed: latest.petBreed,
        lastDate: latest.date,
        nextDate: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`,
        daysElapsed: days,
      });
    });
    const q = search.toLowerCase();
    const filtered = list.filter(
      (t) => !q || t.petName.toLowerCase().includes(q) || t.ownerName.toLowerCase().includes(q) || t.ownerPhone.includes(q)
    );
    return filtered.sort((a, b) =>
      sortMode === 'newest' ? b.lastDate.localeCompare(a.lastDate) : a.lastDate.localeCompare(b.lastDate)
    );
  }, [reservations, search, sortMode]);

  const remindedKeys = useMemo(() => {
    const s = new Set<string>();
    reminderList.forEach((r) => {
      if (remindedIds.has(r.id)) s.add(r.id);
    });
    return s;
  }, [reminderList, remindedIds]);

  // Kalender grid bulan
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startPad = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: ({ date: string; day: number; targets: ReminderTarget[] } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        date: iso,
        day: d,
        targets: reminderList.filter((r) => r.nextDate === iso),
      });
    }
    return cells;
  }, [viewYear, viewMonth, reminderList]);

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Kalender */}
      <Card className="lg:col-span-3">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <BellRing size={15} className="text-brand-600" />
            Reminder H+25 — {MONTHS_ID[viewMonth]} {viewYear}
          </h3>
          <div className="flex gap-1.5">
            <Button variant="secondary" size="icon" onClick={() => setMonthOffset((m) => m - 1)} aria-label="Bulan sebelumnya">
              <ChevronLeft size={14} />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setMonthOffset((m) => m + 1)} aria-label="Bulan berikutnya">
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {DAYS_ID.map((d) => (
            <span key={d} className="pb-1 text-center text-[9px] font-bold text-slate-400 uppercase">
              {d.slice(0, 3)}
            </span>
          ))}
          {calendarCells.map((cell, i) => (
            <div
              key={i}
              className={`min-h-14 rounded-lg border p-1 text-center ${
                cell ? 'border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900' : 'border-transparent'
              }`}
            >
              {cell && (
                <>
                  <span className={`text-[10px] font-bold ${cell.date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` ? 'text-brand-600' : 'text-slate-500'}`}>
                    {cell.day}
                  </span>
                  <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                    {cell.targets.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        title={`${t.petName} — ${t.ownerName} (H+${t.daysElapsed})`}
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${
                          remindedKeys.has(t.id) ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950' : 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        }`}
                      >
                        {petEmoji(t.petType)}
                      </span>
                    ))}
                    {cell.targets.length > 4 && (
                      <span className="text-[8px] font-bold text-slate-400">+{cell.targets.length - 4}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Sidebar list */}
      <Card className="lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">Daftar Reminder</h3>
          <Badge tone="brand">{reminderList.length}</Badge>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Cari hewan / pemilik…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)} className="mb-3">
          <option value="newest">Terbaru dulu</option>
          <option value="oldest">Terlama dulu</option>
        </Select>
        <div className="custom-scrollbar max-h-96 space-y-2 overflow-y-auto">
          {reminderList.length === 0 ? (
            <EmptyState icon={<BellRing size={20} />} title="Belum ada reminder" description="Pet yang selesai grooming akan muncul di sini saat mendekati H+25." />
          ) : (
            reminderList.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTarget(t)}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors hover:border-brand-300 dark:hover:border-brand-800 ${
                  remindedKeys.has(t.id) ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {petEmoji(t.petType)} {t.petName} <span className="font-normal text-slate-400">— {t.ownerName}</span>
                  </p>
                  <p className="truncate text-[10px] text-slate-500">
                    Terakhir: {formatDayDateID(t.lastDate)} • H+{t.daysElapsed}
                  </p>
                </div>
                {remindedKeys.has(t.id) ? (
                  <Badge tone="emerald" className="shrink-0">Terkirim</Badge>
                ) : (
                  <Badge tone={t.daysElapsed >= 25 ? 'amber' : 'slate'} className="shrink-0">H+{t.daysElapsed}</Badge>
                )}
              </button>
            ))
          )}
        </div>
      </Card>

      <WhatsAppGeneratorModal
        target={selectedTarget}
        onClose={() => setSelectedTarget(null)}
        onMarkSent={() => {
          if (selectedTarget) setRemindedIds((prev) => new Set(prev).add(selectedTarget.id));
          setSelectedTarget(null);
        }}
      />
    </div>
  );
}

function ClinicalReminder() {
  const { data: followUps = [] } = useClinicalFollowUps();
  const { data: appointments = [] } = useAppointments();
  const { data: reservations = [] } = useReservations();
  const { data: inpatients = [] } = useInpatients();
  const saveFollowUp = useSaveClinicalFollowUp();
  const deleteFollowUp = useDeleteClinicalFollowUp();
  const patients = useMemo(() => buildClinicalPatients(appointments, reservations, inpatients), [appointments, reservations, inpatients]);
  const [filter, setFilter] = useState<'Pending' | 'Selesai' | 'Semua'>('Pending');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ClinicalFollowUp | null | undefined>(undefined);
  const visible = followUps.filter((item) => {
    const q = search.toLowerCase();
    return (filter === 'Semua' || item.status === filter) && (!q || item.patient.petName.toLowerCase().includes(q) || item.patient.ownerName.toLowerCase().includes(q));
  }).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
  const overdue = followUps.filter((item) => item.status === 'Pending' && item.followUpDate < todayISO()).length;

  const contact = async (item: ClinicalFollowUp) => {
    const message = `Halo Kak ${item.patient.ownerName}, kami dari Jeje Pet Care ingin menindaklanjuti kondisi ${item.patient.petName}. ${item.lastCondition} Rekomendasi kami: ${item.recommendedAction} Mohon informasikan perkembangan kondisinya ya. 🐾`;
    window.open(waLink(item.patient.ownerPhone, message), '_blank');
    await saveFollowUp.mutateAsync({ ...item, status: 'Selesai', contactedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    pushToast({ tone: 'wa', title: 'WhatsApp dibuka', message: 'Follow-up ditandai selesai dan tetap dapat diedit.' });
  };

  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="bento-card"><p className="text-[10px] font-bold text-slate-400 uppercase">Pending</p><p className="mt-1 text-xl font-bold text-amber-600">{followUps.filter((item) => item.status === 'Pending').length}</p></div><div className="bento-card"><p className="text-[10px] font-bold text-slate-400 uppercase">Terlambat</p><p className="mt-1 text-xl font-bold text-rose-600">{overdue}</p></div><div className="bento-card"><p className="text-[10px] font-bold text-slate-400 uppercase">Selesai</p><p className="mt-1 text-xl font-bold text-emerald-600">{followUps.filter((item) => item.status === 'Selesai').length}</p></div><div className="bento-card flex items-center justify-center"><Button size="sm" onClick={() => setEditing(null)}><Plus size={13} /> Follow-up Manual</Button></div></div>
    <Card><div className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><div className="relative"><Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari pasien atau pemilik…" /></div><Select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option>Pending</option><option>Selesai</option><option>Semua</option></Select><Badge tone="brand" className="self-center justify-center">{visible.length} follow-up</Badge></div></Card>
    {visible.length === 0 ? <Card><EmptyState icon={<Stethoscope size={22} />} title="Tidak ada follow-up klinis" description="Follow-up dapat dibuat manual atau otomatis dari jadwal booster vaksin." /></Card> : <div className="grid gap-3 xl:grid-cols-2">{visible.map((item) => { const isOverdue = item.status === 'Pending' && item.followUpDate < todayISO(); return <Card key={item.id}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.patient.petName} — {item.patient.ownerName}</h3><Badge tone={item.status === 'Selesai' ? 'emerald' : isOverdue ? 'rose' : 'amber'}>{isOverdue ? 'Terlambat' : item.status}</Badge><Badge tone="slate">{item.sourceType}</Badge></div><p className="mt-1 text-xs text-slate-500">{formatDayDateID(item.followUpDate)} • PIC {item.staffInCharge}</p></div><Button size="icon" variant="ghost" onClick={() => void deleteFollowUp.mutateAsync(item.id)}><Trash2 size={14} /></Button></div><div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60"><p><b>Kondisi terakhir:</b> {item.lastCondition}</p><p><b>Rekomendasi:</b> {item.recommendedAction}</p>{item.responseNotes && <p><b>Respons:</b> {item.responseNotes}</p>}</div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => setEditing(item)}>Edit</Button>{item.status === 'Pending' && <Button size="sm" variant="success" onClick={() => void contact(item)}><Send size={13} /> Hubungi & Selesaikan</Button>}{item.status === 'Selesai' && <Badge tone="emerald"><CheckCircle2 size={11} /> {item.contactedAt ? 'Sudah dihubungi' : 'Selesai'}</Badge>}</div></Card>; })}</div>}
    <ClinicalFollowUpForm key={editing?.id ?? (editing === null ? 'new' : 'closed')} open={editing !== undefined} value={editing || null} patients={patients} onClose={() => setEditing(undefined)} onSave={(item) => void saveFollowUp.mutateAsync(item).then(() => { setEditing(undefined); pushToast({ tone: 'success', title: 'Follow-up tersimpan' }); })} />
  </div>;
}

function ClinicalFollowUpForm({ open, value, patients, onClose, onSave }: { open: boolean; value: ClinicalFollowUp | null; patients: ReturnType<typeof buildClinicalPatients>; onClose: () => void; onSave: (item: ClinicalFollowUp) => void }) {
  const [patientKey, setPatientKey] = useState(value ? clinicalPatientKey(value.patient) : patients[0]?.key || ''); const [sourceType, setSourceType] = useState<ClinicalFollowUp['sourceType']>(value?.sourceType || 'Rawat Jalan'); const [followUpDate, setFollowUpDate] = useState(value?.followUpDate || todayISO()); const [staffInCharge, setStaffInCharge] = useState(value?.staffInCharge || 'Staf Klinik'); const [lastCondition, setLastCondition] = useState(value?.lastCondition || ''); const [recommendedAction, setRecommendedAction] = useState(value?.recommendedAction || ''); const [responseNotes, setResponseNotes] = useState(value?.responseNotes || ''); const [status, setStatus] = useState<ClinicalFollowUp['status']>(value?.status || 'Pending'); const [error, setError] = useState('');
  if (!open) return null;
  const submit = () => { const patient = patients.find((item) => item.key === patientKey) || (value ? { ...value.patient, key: patientKey, label: '' } : undefined); if (!patient || !followUpDate || !staffInCharge || !lastCondition || !recommendedAction) { setError('Pasien, jadwal, PIC, kondisi, dan rekomendasi wajib diisi.'); return; } const now = new Date().toISOString(); onSave({ id: value?.id || generateId('FU'), patient: { petName: patient.petName, petType: patient.petType, petBreed: patient.petBreed, ownerName: patient.ownerName, ownerPhone: patient.ownerPhone, appointmentId: patient.appointmentId, appointmentPetIndex: patient.appointmentPetIndex }, sourceType, sourceId: value?.sourceId, followUpDate, status, staffInCharge, lastCondition, recommendedAction, contactChannel: value?.contactChannel || 'WhatsApp', responseNotes: responseNotes || undefined, contactedAt: value?.contactedAt, createdAt: value?.createdAt || now, updatedAt: now }); };
  return <Modal isOpen={open} onClose={onClose} title={value ? 'Edit Follow-up Klinis' : 'Jadwalkan Follow-up Klinis'} icon={<Stethoscope size={18} />} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Simpan</Button></>}><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Pasien" required><Select value={patientKey} onChange={(event) => setPatientKey(event.target.value)} disabled={!!value}><option value="">Pilih pasien</option>{patients.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</Select></Field><Field label="Jenis Follow-up"><Select value={sourceType} onChange={(event) => setSourceType(event.target.value as ClinicalFollowUp['sourceType'])}>{['Rawat Jalan', 'Rawat Inap', 'Pasca Operasi', 'Vaksinasi'].map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Tanggal" required><Input type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} /></Field><Field label="PIC" required><Input value={staffInCharge} onChange={(event) => setStaffInCharge(event.target.value)} /></Field><Field label="Status"><Select value={status} onChange={(event) => setStatus(event.target.value as ClinicalFollowUp['status'])}>{['Pending', 'Selesai', 'Batal'].map((item) => <option key={item}>{item}</option>)}</Select></Field></div><Field label="Kondisi Terakhir" required><Textarea value={lastCondition} onChange={(event) => setLastCondition(event.target.value)} /></Field><Field label="Rekomendasi Tindakan" required><Textarea value={recommendedAction} onChange={(event) => setRecommendedAction(event.target.value)} /></Field><Field label="Respons Pemilik"><Textarea value={responseNotes} onChange={(event) => setResponseNotes(event.target.value)} /></Field>{error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}</div></Modal>;
}

function WhatsAppGeneratorModal({
  target,
  onClose,
  onMarkSent,
}: {
  target: ReminderTarget | null;
  onClose: () => void;
  onMarkSent: () => void;
}) {
  const [style, setStyle] = useState<TemplateStyle>('friendly');
  const [customText, setCustomText] = useState('');
  const [editingRaw, setEditingRaw] = useState(false);

  const defaultText = useMemo(() => {
    if (!target) return '';
    const t = loadFromStorage(TPL_KEY(style), DEFAULT_TEMPLATES[style]);
    return t
      .replaceAll('{ownerName}', target.ownerName)
      .replaceAll('{petName}', target.petName)
      .replaceAll('{petTypeWord}', target.petType)
      .replaceAll('{days}', String(target.daysElapsed))
      .replaceAll('{lastGroomingDate}', formatDayDateID(target.lastDate))
      .replaceAll('{nextGroomingDate}', formatDayDateID(target.nextDate))
      .replaceAll('{petEmoji}', petEmoji(target.petType));
  }, [target, style]);

  const finalText = editingRaw ? customText : defaultText;

  const handleSend = () => {
    if (!target) return;
    window.open(waLink(target.ownerPhone, finalText), '_blank');
    pushToast({ tone: 'wa', title: 'WhatsApp Dibuka', message: `Reminder untuk ${target.petName} disiapkan di WhatsApp.` });
    onMarkSent();
  };

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title={`Reminder WhatsApp — ${target?.petName ?? ''}`}
      subtitle={target ? `${target.ownerName} • ${target.ownerPhone}` : ''}
      icon={<BellRing size={18} />}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => setStyle('friendly')}>
            <RotateCcw size={13} /> Reset Template
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              if (await copyToClipboard(finalText)) pushToast({ tone: 'success', title: 'Pesan disalin ke clipboard' });
            }}
          >
            <Copy size={13} /> Salin
          </Button>
          <Button variant="success" size="sm" onClick={handleSend}>
            <Send size={13} /> Kirim ke WhatsApp
          </Button>
        </>
      }
    >
      {target && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Gaya Template">
              <Select value={style} onChange={(e) => { setStyle(e.target.value as TemplateStyle); setEditingRaw(false); }}>
                <option value="friendly">Santai / Friendly</option>
                <option value="professional">Profesional</option>
                <option value="promo">Promo / Penawaran</option>
              </Select>
            </Field>
            <div className="flex items-end gap-2 pb-0.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCustomText(finalText);
                  setEditingRaw(!editingRaw);
                }}
              >
                {editingRaw ? 'Gunakan Auto' : 'Edit Manual'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  saveToStorage(TPL_KEY(style), customText || DEFAULT_TEMPLATES[style]);
                  pushToast({ tone: 'success', title: 'Template disimpan', message: `Gaya "${style}" tersimpan untuk reminder berikutnya.` });
                }}
              >
                <Save size={13} /> Simpan Template
              </Button>
            </div>
          </div>

          <Field label="Preview Pesan">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">{finalText}</p>
            </div>
          </Field>

          {editingRaw && (
            <Field label="Edit Template Mentah" hint="Variabel: {ownerName}, {petName}, {petTypeWord}, {days}, {lastGroomingDate}, {nextGroomingDate}">
              <Textarea rows={5} value={customText} onChange={(e) => setCustomText(e.target.value)} className="font-mono text-xs" />
            </Field>
          )}

          <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-[11px] text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <strong>{target.petName}</strong> ({target.petBreed}) — terakhir grooming {formatDayDateID(target.lastDate)} (H+
            {target.daysElapsed}). Rekomendasi kembali: <strong>{formatDayDateID(target.nextDate)}</strong>.
          </div>
        </div>
      )}
    </Modal>
  );
}
