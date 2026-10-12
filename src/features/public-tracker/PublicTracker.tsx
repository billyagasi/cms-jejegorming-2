import { useMemo, useState } from 'react';
import {
  Activity,
  BedDouble,
  BookOpen,
  CalendarDays,
  FileHeart,
  LockKeyhole,
  PawPrint,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Field, Input } from '../../components/ui/Input';
import { useAppointments, useInpatients, useReservations } from '../../data-layer/hooks';
import type { Appointment, Inpatient, Reservation, ReservationStatus } from '../../types';
import { formatDateID, formatDayDateID, formatRupiah, toWAPhone } from '../../lib/format';

type BookingResult =
  | { kind: 'grooming'; date: string; item: Reservation }
  | { kind: 'appointment'; date: string; item: Appointment }
  | { kind: 'inpatient'; date: string; item: Inpatient };

type MedicalResult =
  | { kind: 'grooming'; date: string; item: Reservation }
  | { kind: 'appointment'; date: string; item: Appointment; petIndex: number }
  | { kind: 'inpatient'; date: string; item: Inpatient };

export default function PublicTracker() {
  const { data: reservations = [] } = useReservations();
  const { data: appointments = [] } = useAppointments();
  const { data: inpatients = [] } = useInpatients();
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [query, setQuery] = useState<{ phone: string; reference: string } | null>(null);
  const [error, setError] = useState('');

  const result = useMemo(() => {
    if (!query) return null;
    const phoneKey = normalizePhone(query.phone);
    const ref = query.reference.trim().toLowerCase();
    const refMatch = (id: string, petNames: string[]) => !ref || id.toLowerCase() === ref || id.toLowerCase().includes(ref) || petNames.some((name) => name.toLowerCase().includes(ref));

    const grooming = reservations.filter((item) => normalizePhone(item.ownerPhone) === phoneKey && refMatch(item.id, [item.petName]));
    const clinic = appointments.filter((item) => normalizePhone(item.ownerPhone) === phoneKey && refMatch(item.id, item.pets.map((pet) => pet.petName)));
    const stays = inpatients.filter((item) => normalizePhone(item.ownerPhone) === phoneKey && refMatch(item.id, [item.petName]));

    const bookings: BookingResult[] = [
      ...grooming.map((item) => ({ kind: 'grooming' as const, date: item.date, item })),
      ...clinic.map((item) => ({ kind: 'appointment' as const, date: item.date, item })),
      ...stays.map((item) => ({ kind: 'inpatient' as const, date: item.admissionDate, item })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const medical: MedicalResult[] = [
      ...grooming.filter((item) => !!item.resume).map((item) => ({ kind: 'grooming' as const, date: item.date, item })),
      ...clinic.flatMap((item) => item.pets.map((pet, petIndex) => ({ item, pet, petIndex })).filter(({ pet }) => !!pet.diagnosis || pet.treatments.length > 0).map(({ item, petIndex }) => ({ kind: 'appointment' as const, date: item.date, item, petIndex }))),
      ...stays.filter((item) => item.dailyNotes.length > 0).map((item) => ({ kind: 'inpatient' as const, date: item.admissionDate, item })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const ownerName = grooming[0]?.ownerName || clinic[0]?.ownerName || stays[0]?.ownerName || '';
    return { bookings, medical, ownerName };
  }, [appointments, inpatients, query, reservations]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const digits = normalizePhone(phone);
    if (digits.length < 10) {
      setError('Masukkan nomor WhatsApp yang sama dengan saat melakukan booking.');
      setQuery(null);
      return;
    }
    setError('');
    setQuery({ phone, reference });
  };

  const found = !!result && result.bookings.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="overflow-hidden bg-gradient-to-br from-indigo-950 via-brand-950 to-brand-900 text-white">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><FileHeart size={23} /></div>
            <div><h2 className="font-display text-lg font-bold">Cek Status & Rekam Medis</h2><p className="mt-1 max-w-xl text-xs leading-relaxed text-white/70">Pantau status booking, perkembangan rawat inap, diagnosis, dan riwayat tindakan hewan Anda tanpa perlu membuat akun.</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[10px] font-semibold text-white/80 ring-1 ring-white/15"><ShieldCheck size={15} /> Akses dengan nomor booking</div>
        </div>
      </Card>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"><Search size={16} /></div><div><h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Cari data hewan Anda</h3><p className="mt-0.5 text-[11px] text-slate-500">Nomor WhatsApp wajib. ID tiket atau nama hewan dapat digunakan untuk mempersempit hasil.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Nomor WhatsApp" required><Input type="tel" inputMode="numeric" autoComplete="tel" placeholder="Contoh: 081234567890" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
            <Field label="ID tiket / nama hewan" hint="Opsional"><Input placeholder="Contoh: appt-... atau Milo" value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
            <Button type="submit" className="sm:mb-[22px]"><Search size={14} /> Cek Status</Button>
          </div>
          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-950/40"><LockKeyhole size={13} className="mt-0.5 shrink-0" /> Informasi hanya ditampilkan jika nomor WhatsApp cocok dengan data booking. Jangan bagikan ID tiket dan nomor WhatsApp kepada pihak lain.</div>
        </form>
      </Card>

      {query && !found && <Card><EmptyState icon={<Search size={22} />} title="Data tidak ditemukan" description="Periksa kembali nomor WhatsApp, ID tiket, atau nama hewan yang dimasukkan." /></Card>}

      {found && result && (
        <div className="animate-slide-up space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Data ditemukan untuk</p><h3 className="font-display mt-0.5 text-base font-bold text-slate-900 dark:text-white">{result.ownerName}</h3></div><div className="flex gap-2"><Badge tone="brand">{result.bookings.length} booking</Badge><Badge tone="emerald">{result.medical.length} rekam medis</Badge></div></div>
          </Card>

          <section className="space-y-3">
            <div><h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Activity size={15} className="text-brand-600" /> Status Booking & Perawatan</h3><p className="mt-0.5 text-[11px] text-slate-500">Urutan terbaru berdasarkan tanggal layanan.</p></div>
            {result.bookings.map((entry) => <BookingCard key={`${entry.kind}-${entry.item.id}`} entry={entry} />)}
          </section>

          <section className="space-y-3">
            <div><h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><BookOpen size={15} className="text-emerald-600" /> Riwayat Diagnosis & Rekam Medis</h3><p className="mt-0.5 text-[11px] text-slate-500">Catatan klinis, tindakan, dan resume yang sudah diisi oleh staf.</p></div>
            {result.medical.length === 0 ? <Card><EmptyState icon={<BookOpen size={21} />} title="Belum ada rekam medis" description="Diagnosis dan catatan tindakan akan muncul setelah diisi oleh staf klinik." /></Card> : result.medical.map((entry, index) => <MedicalCard key={`${entry.kind}-${entry.item.id}-${index}`} entry={entry} />)}
          </section>
        </div>
      )}
    </div>
  );
}

function BookingCard({ entry }: { entry: BookingResult }) {
  if (entry.kind === 'grooming') {
    const item = entry.item;
    const completed = item.steps.filter((step) => step.status === 'completed').length;
    return <Card><CardHeader icon={<PawPrint size={16} />} title={`Grooming — ${item.petName}`} subtitle={`${formatDayDateID(item.date)} • ${item.timeSlot}`} status={item.status} /><p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-200">{item.packageType}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.round((completed / Math.max(1, item.steps.length)) * 100)}%` }} /></div><p className="mt-1 text-[10px] text-slate-500">{completed} dari {item.steps.length} tahap selesai • ID {item.id}</p></Card>;
  }
  if (entry.kind === 'appointment') {
    const item = entry.item;
    return <Card><CardHeader icon={<Stethoscope size={16} />} title={`Appointment — ${item.pets.map((pet) => pet.petName).join(', ')}`} subtitle={`${formatDayDateID(item.date)} • ${item.timeSlot}`} status={item.status} /><div className="mt-3 grid gap-2 sm:grid-cols-2"><Meta label="Layanan" value={item.service?.name || 'Pemeriksaan klinik'} /><Meta label="Dokter" value={item.doctorName || 'Menunggu penentuan'} /><Meta label="Akomodasi" value={item.accommodation} /><Meta label="Estimasi layanan" value={item.service ? `Mulai ${formatRupiah(item.service.price)}` : '-'} /></div><p className="mt-2 text-[10px] text-slate-500">ID tiket: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{item.id}</span></p></Card>;
  }
  const item = entry.item;
  const latest = [...item.dailyNotes].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0];
  return <Card><CardHeader icon={<BedDouble size={16} />} title={`Rawat Inap — ${item.petName}`} subtitle={`${item.cageNumber} • masuk ${formatDateID(item.admissionDate)}`} inpatientStatus={item.status} /><div className="mt-3 grid gap-2 sm:grid-cols-2"><Meta label="Dokter PJ" value={item.doctorName || 'Belum ditentukan'} /><Meta label="Diagnosis masuk" value={item.diagnosis} /></div>{latest && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40"><p className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">Update terakhir • {formatDateID(latest.date)} {latest.time}</p><p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">Suhu {latest.temperature}°C • {latest.condition}</p></div>}</Card>;
}

function MedicalCard({ entry }: { entry: MedicalResult }) {
  if (entry.kind === 'appointment') {
    const item = entry.item;
    const pet = item.pets[entry.petIndex];
    const total = pet.treatments.reduce((sum, treatment) => sum + treatment.subtotal, 0);
    return <Card><MedicalHeader label="Klinik" title={pet.petName} date={item.date} icon={<Stethoscope size={15} />} /><div className="mt-3 space-y-3"><Meta label="Diagnosis" value={pet.diagnosis || 'Belum ada diagnosis tertulis'} />{pet.treatments.length > 0 && <div><p className="mb-1.5 text-[9px] font-bold tracking-wide text-slate-400 uppercase">Tindakan & obat</p><div className="space-y-1">{pet.treatments.map((treatment) => <div key={treatment.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] dark:bg-slate-800/60"><span className="font-semibold text-slate-700 dark:text-slate-200">{treatment.name} ×{treatment.quantity}</span><span className="font-mono text-slate-500">{formatRupiah(treatment.subtotal)}</span></div>)}</div><p className="mt-2 text-right text-xs font-bold text-slate-800 dark:text-slate-100">Total {formatRupiah(total)} • {item.billClosed ? 'Lunas' : 'Belum ditutup'}</p></div>}</div></Card>;
  }
  if (entry.kind === 'grooming') {
    const item = entry.item;
    return <Card><MedicalHeader label="Resume Grooming" title={item.petName} date={item.date} icon={<PawPrint size={15} />} /><div className="mt-3 grid gap-2 sm:grid-cols-2"><Meta label="Kondisi kulit" value={item.resume?.skinCondition || '-'} /><Meta label="Kondisi bulu" value={item.resume?.hairCondition || '-'} /><Meta label="Catatan perawatan" value={item.resume?.groomingNotes || '-'} /><Meta label="Rekomendasi" value={item.resume?.recommendations || '-'} /></div></Card>;
  }
  const item = entry.item;
  const notes = [...item.dailyNotes].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  return <Card><MedicalHeader label="Rawat Inap" title={item.petName} date={item.admissionDate} icon={<BedDouble size={15} />} /><div className="mt-3 space-y-2">{notes.map((note) => <div key={note.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{formatDateID(note.date)} • {note.time} WIB</p><Badge tone={note.temperature >= 37.5 && note.temperature <= 39.2 ? 'emerald' : 'rose'}>{note.temperature}°C</Badge></div><p className="mt-2 text-xs text-slate-700 dark:text-slate-200"><strong>Kondisi:</strong> {note.condition}</p><p className="mt-1 text-xs text-slate-700 dark:text-slate-200"><strong>Terapi:</strong> {note.treatment}</p><p className="mt-1 text-[10px] text-slate-400">Pemeriksa: {note.checkedBy}</p></div>)}</div></Card>;
}

function CardHeader({ icon, title, subtitle, status, inpatientStatus }: { icon: React.ReactNode; title: string; subtitle: string; status?: ReservationStatus; inpatientStatus?: Inpatient['status'] }) {
  const label = inpatientStatus || status || 'Waiting';
  const tone: BadgeTone = label === 'Completed' || label === 'Sudah Pulang' ? 'emerald' : label === 'Cancelled' ? 'slate' : label === 'Kritis' ? 'rose' : label === 'In_Progress' || label === 'Perawatan Aktif' ? 'amber' : 'brand';
  return <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">{icon}</div><div><h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">{title}</h4><p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500"><CalendarDays size={11} /> {subtitle}</p></div></div><Badge tone={tone}>{publicStatus(label)}</Badge></div>;
}

function MedicalHeader({ label, title, date, icon }: { label: string; title: string; date: string; icon: React.ReactNode }) { return <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{icon}</div><div><p className="text-[9px] font-bold tracking-wide text-emerald-600 uppercase">{label}</p><h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4><p className="text-[10px] text-slate-500">{formatDayDateID(date)}</p></div></div>; }
function Meta({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"><p className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">{label}</p><p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-slate-700 dark:text-slate-200">{value}</p></div>; }
function normalizePhone(value: string): string { return toWAPhone(value).replace(/\D/g, ''); }
function publicStatus(status: string): string { return ({ Waiting: 'Menunggu Konfirmasi', In_Progress: 'Sedang Diproses', Completed: 'Selesai', Cancelled: 'Dibatalkan' } as Record<string, string>)[status] || status; }
