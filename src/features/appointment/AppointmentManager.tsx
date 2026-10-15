import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { ArrowLeft, ArrowRight, BedDouble, CalendarRange, CheckCircle2, CircleCheckBig, ClipboardCheck, Clock, FileHeart, FileUp, ListChecks, Megaphone, MessageCircle, Pencil, Pill, Printer, Search, Stethoscope, Trash2, UserCheck, UserPlus, Wallet, XCircle } from 'lucide-react';
import { Appointment, AppointmentPet, AppointmentTreatmentItem, ClinicalService, PetType, ReservationStatus } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/Section';
import { useAppointments, useSaveAppointment, useDeleteAppointment, useAddActivityLog, useAddNotificationLog, useAppConfig, useInventory, useSaveInventoryItem } from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { formatRupiah, formatDateTimeID, formatDayDateID, generateId, todayISO } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

type AppointmentStage = 'Pending' | 'Confirmed' | 'In_Progress' | 'Completed' | 'Cancelled';
type StatusFilter = 'All' | 'Active' | AppointmentStage;
type PeriodMode = 'day' | 'week' | 'all';

let billItemSeq = 1;

export default function AppointmentManager() {
  const { data: appointments = [] } = useAppointments();
  const saveAppointment = useSaveAppointment();
  const deleteAppointment = useDeleteAppointment();
  const addActivityLog = useAddActivityLog();
  const addNotificationLog = useAddNotificationLog();
  const { data: config } = useAppConfig();
  const { data: inventory = [] } = useInventory();
  const saveInventory = useSaveInventoryItem();
  const session = useAppStore((s) => s.session);
  const setTab = useAppStore((s) => s.setTab);
  const setInpatientPrefill = useAppStore((s) => s.setInpatientPrefill);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('week');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [serviceFilter, setServiceFilter] = useState('All');
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [invoiceAppt, setInvoiceAppt] = useState<Appointment | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const periodAppointments = useMemo(() => appointments.filter((appointment) => isInPeriod(appointment.date, selectedDate, periodMode)), [appointments, periodMode, selectedDate]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return periodAppointments
      .filter((a) => {
        const stage = appointmentStage(a);
        const matchesStatus =
          statusFilter === 'All'
            ? true
            : statusFilter === 'Active'
              ? stage !== 'Completed' && stage !== 'Cancelled'
              : stage === statusFilter;
        const matchesService = serviceFilter === 'All' || a.service?.name === serviceFilter;
        const matchesSearch =
          !q ||
          a.ownerName.toLowerCase().includes(q) ||
          a.ownerPhone.includes(search) ||
          a.pets.some((p) => p.petName.toLowerCase().includes(q)) ||
          (a.service?.name || '').toLowerCase().includes(q) ||
          (a.doctorName || '').toLowerCase().includes(q);
        return matchesStatus && matchesService && matchesSearch;
      })
      .sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [periodAppointments, search, serviceFilter, statusFilter]);

  const today = todayISO();
  const apptToday = appointments.filter((a) => a.date === today && a.status !== 'Cancelled').length;
  const waiting = periodAppointments.filter((a) => appointmentStage(a) === 'Pending').length;
  const confirmed = periodAppointments.filter((a) => appointmentStage(a) === 'Confirmed').length;
  const inProgress = periodAppointments.filter((a) => appointmentStage(a) === 'In_Progress').length;
  const nextCallable = appointments
    .filter((item) => item.date === today && !!item.checkedInAt && !item.calledAt && item.status === 'In_Progress')
    .sort((a, b) => (a.queueNumber || '').localeCompare(b.queueNumber || ''))[0];

  const log = (action: string, targetId: string, targetName: string, details: string) => {
    addActivityLog.mutate({
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      staffName: session?.username || 'Staf',
      role: session?.role || 'Appointment',
      action,
      timestamp: new Date().toISOString(),
      targetId,
      targetName,
      details,
    });
  };

  const setStatus = (appt: Appointment, status: ReservationStatus) => {
    const updated = {
      ...appt,
      status,
      completedAt: status === 'Completed' ? new Date().toISOString() : appt.completedAt,
    };
    saveAppointment.mutate(
      updated,
      {
        onSuccess: () => {
          log('Status Appointment', appt.id, appt.ownerName, `Status appointment diubah menjadi ${status}`);
          pushToast({ tone: 'success', title: 'Status Diperbarui', message: `${appt.ownerName} → ${status.replace('_', ' ')}` });
          setDetail((d) => (d ? { ...d, ...updated } : d));
        },
      }
    );
  };

  const notifyOwner = (appt: Appointment, type: 'Appointment_Confirmed' | 'Appointment_Checked_In', message: string) => {
    addNotificationLog.mutate({
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reservationId: appt.id,
      petName: appt.pets.map((pet) => pet.petName).join(', '),
      ownerName: appt.ownerName,
      ownerPhone: appt.ownerPhone,
      type,
      message,
      timestamp: new Date().toISOString(),
      channel: 'WhatsApp',
      status: 'Delivered',
    });
  };

  const confirmAppointment = (appt: Appointment) => {
    const updated = { ...appt, confirmedAt: new Date().toISOString() };
    saveAppointment.mutate(updated, {
      onSuccess: () => {
        log('Konfirmasi Appointment', appt.id, appt.ownerName, `${appt.service?.name || 'Pemeriksaan klinik'} • ${appt.date} ${appt.timeSlot}`);
        notifyOwner(updated, 'Appointment_Confirmed', `[WA] Halo ${appt.ownerName}, appointment ${appt.service?.name || 'klinik'} untuk ${appt.pets.map((pet) => pet.petName).join(', ')} telah dikonfirmasi pada ${formatDayDateID(appt.date)} pukul ${appt.timeSlot}.`);
        setDetail((current) => current?.id === appt.id ? updated : current);
        pushToast({ tone: 'success', title: 'Appointment dikonfirmasi', message: 'Notifikasi WhatsApp simulasi telah dicatat.' });
      },
    });
  };

  const checkInAppointment = (appt: Appointment) => {
    if (appt.date !== todayISO()) {
      pushToast({ tone: 'error', title: 'Check-in belum tersedia', message: `Check-in hanya dapat dilakukan pada tanggal kunjungan: ${formatDayDateID(appt.date)}.` });
      return;
    }
    const queueNumber = appt.queueNumber || nextQueueNumber(appointments, appt.date);
    const now = new Date().toISOString();
    const updated: Appointment = { ...appt, confirmedAt: appt.confirmedAt || now, checkedInAt: now, queueNumber, status: 'In_Progress' };
    saveAppointment.mutate(updated, {
      onSuccess: () => {
        log('Check-in Appointment', appt.id, appt.ownerName, `Nomor antrean ${queueNumber}`);
        notifyOwner(updated, 'Appointment_Checked_In', `[WA] ${appt.ownerName}, check-in berhasil. Nomor antrean klinik ${queueNumber} untuk ${appt.pets.map((pet) => pet.petName).join(', ')}.`);
        setDetail((current) => current?.id === appt.id ? updated : current);
        pushToast({ tone: 'success', title: `Check-in ${queueNumber}`, message: 'Pasien masuk antrean pemeriksaan.' });
      },
    });
  };

  const callNextQueue = () => {
    if (!nextCallable) {
      pushToast({ tone: 'info', title: 'Antrean check-in kosong', message: 'Belum ada pasien yang menunggu untuk dipanggil.' });
      return;
    }
    const updated = { ...nextCallable, calledAt: new Date().toISOString() };
    saveAppointment.mutate(updated, { onSuccess: () => {
      log('Panggil Antrean', updated.id, updated.ownerName, `Nomor ${updated.queueNumber} dipanggil ke ruang pemeriksaan`);
      notifyOwner(updated, 'Appointment_Checked_In', `[WA] Nomor antrean ${updated.queueNumber} untuk ${updated.pets.map((pet) => pet.petName).join(', ')} sedang dipanggil. Silakan menuju ruang pemeriksaan.`);
      pushToast({ tone: 'success', title: `Memanggil ${updated.queueNumber}`, message: `${updated.pets.map((pet) => pet.petName).join(', ')} • ${updated.ownerName}` });
    }});
  };

  const referToInpatient = (appt: Appointment, petIndex: number) => {
    saveAppointment.mutate(appt, {
      onSuccess: () => {
        log('Rujuk Rawat Inap', appt.id, appt.pets[petIndex]?.petName || appt.ownerName, 'Data appointment diteruskan ke registrasi rawat inap');
        setInpatientPrefill({ appointmentId: appt.id, petIndex });
        setDetail(null);
        setTab('inpatients');
      },
    });
  };

  const handleDelete = (appt: Appointment) => {
    deleteAppointment.mutate(appt.id, {
      onSuccess: () => {
        log('Hapus Appointment', appt.id, appt.ownerName, `Menghapus appointment ${appt.date} ${appt.timeSlot}`);
        pushToast({ tone: 'success', title: 'Appointment Dihapus' });
        setDetail(null);
        setDeleteTarget(null);
      },
    });
  };

  /** Tutup bill: simpan payment, tandai closed, status Completed, potong stok inventaris. */
  const closeBill = (appt: Appointment, payment: NonNullable<Appointment['payment']>) => {
    if (appt.billClosed) return;

    // Deduksi stok untuk item ber-link inventaris
    appt.pets.forEach((pet) =>
      pet.treatments.forEach((t) => {
        if (!t.itemId) return;
        const inv = inventory.find((i) => i.id === t.itemId);
        if (inv) {
          saveInventory.mutate({ ...inv, stock: Math.max(0, inv.stock - t.quantity), lastUpdated: todayISO() });
        }
      })
    );

    const closed: Appointment = { ...appt, billClosed: true, payment, status: 'Completed', completedAt: new Date().toISOString() };
    saveAppointment.mutate(closed, {
      onSuccess: () => {
        log('Tutup Bill', appt.id, appt.ownerName, `Bill appointment ditutup — ${formatRupiah(billTotal(closed))} (${payment.method})`);
        pushToast({ tone: 'success', title: 'Bill Ditutup', message: `Invoice ${formatRupiah(billTotal(closed))} lunas. Stok obat/produk terpotong.` });
        setDetail(closed);
        setInvoiceAppt(closed);
      },
    });
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-gradient-to-br from-slate-950 via-brand-950 to-brand-900 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/30"><ClipboardCheck size={20} /></div>
            <div><h2 className="font-display text-base font-bold">Command Center Layanan Klinik</h2><p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/65">Verifikasi booking, check-in antrean, pemeriksaan, rekam medis, billing, dan handoff Rawat Inap dalam satu alur.</p></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => setWalkInOpen(true)}><UserPlus size={13} /> Walk-in</Button><Button size="sm" onClick={callNextQueue}><Megaphone size={13} /> {nextCallable ? `Panggil ${nextCallable.queueNumber}` : 'Panggil Berikutnya'}</Button><Badge tone="amber"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> {waiting} perlu verifikasi</Badge></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Kunjungan Hari Ini" value={apptToday} tone="brand" icon={<CalendarRange size={18} />} hint="Seluruh status aktif" />
        <StatCard label="Perlu Verifikasi" value={waiting} tone="amber" icon={<Clock size={18} />} hint="Booking baru" />
        <StatCard label="Terkonfirmasi" value={confirmed} tone="sky" icon={<UserCheck size={18} />} hint="Menunggu check-in" />
        <StatCard label="Sedang Diperiksa" value={inProgress} tone="emerald" icon={<Stethoscope size={18} />} hint="Antrean aktif" />
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {([['day', 'Harian'], ['week', 'Mingguan'], ['all', 'Semua']] as [PeriodMode, string][]).map(([mode, label]) => <button type="button" key={mode} onClick={() => setPeriodMode(mode)} className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${periodMode === mode ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500'}`}>{label}</button>)}
            </div>
            {periodMode !== 'all' && <div className="flex items-center justify-between gap-2 sm:justify-end"><button type="button" onClick={() => setSelectedDate(shiftISODate(selectedDate, periodMode === 'week' ? -7 : -1))} className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Periode sebelumnya"><ArrowLeft size={14} /></button><button type="button" onClick={() => setSelectedDate(todayISO())} className="min-w-52 cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{periodLabel(selectedDate, periodMode)}</button><button type="button" onClick={() => setSelectedDate(shiftISODate(selectedDate, periodMode === 'week' ? 7 : 1))} className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Periode berikutnya"><ArrowRight size={14} /></button></div>}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Cari pemilik, WhatsApp, hewan, layanan, atau dokter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className="lg:max-w-64"><option value="All">Semua layanan</option>{(config?.clinicalServices ?? []).map((service) => <option key={service.name} value={service.name}>{service.name}</option>)}</Select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Active', 'Pending', 'Confirmed', 'In_Progress', 'Completed', 'Cancelled'] as StatusFilter[]).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                  statusFilter === s
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                {filterLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Stethoscope size={22} />} title="Belum ada appointment" description="Appointment dari portal mandiri akan muncul di sini." />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const total = billTotal(appt);
            const stage = appointmentStage(appt);
            return (
              <Card key={appt.id} hover className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">{appt.ownerName}</h4>
                      <StageBadge stage={stage} />
                      {appt.queueNumber && <Badge tone="sky"><ListChecks size={10} /> Antrean {appt.queueNumber}</Badge>}
                      {appt.calledAt && <Badge tone="emerald"><Megaphone size={10} /> Dipanggil {formatDateTimeID(appt.calledAt).split(', ')[1]}</Badge>}
                      {appt.status !== 'Cancelled' && (
                        appt.billClosed
                          ? <Badge tone="emerald">🟢 Lunas {formatRupiah(billTotal(appt))}</Badge>
                          : <Badge tone="slate">Estimasi bill {formatRupiah(total)}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      📅 {formatDayDateID(appt.date)} • 🕒 {appt.timeSlot} • 🩺 {appt.doctorName || '—'}
                    </p>
                    {appt.service && <p className="mt-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300">🏥 {appt.service.name}</p>}
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {appt.pets.map((p) => `🐾 ${p.petName} (${p.reasons.join('/')})`).join('  •  ')}
                    </p>
                    <StageRail appointment={appt} />
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {stage === 'Pending' && <Button size="sm" variant="success" onClick={() => confirmAppointment(appt)}><CheckCircle2 size={12} /> Konfirmasi</Button>}
                    {stage === 'Confirmed' && <Button size="sm" onClick={() => checkInAppointment(appt)}><ListChecks size={12} /> Check-in</Button>}
                    <Button size="sm" variant="secondary" onClick={() => setDetail(appt)}>
                      <Pencil size={12} /> Kelola
                    </Button>
                    <a href={`https://wa.me/${waNumber(appt.ownerPhone)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" title="Hubungi WhatsApp"><MessageCircle size={13} /></a>
                    {appt.status !== 'Completed' && <button
                      onClick={() => setDeleteTarget(appt)}
                      className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title={appt.status === 'Cancelled' ? 'Hapus permanen' : 'Batalkan appointment'}
                    >
                      <Trash2 size={14} />
                    </button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <AppointmentDetailModal
        appointment={detail}
        inventory={inventory}
        onClose={() => setDetail(null)}
        onStatus={(appt, status) => setStatus(appt, status)}
        onConfirm={confirmAppointment}
        onCheckIn={checkInAppointment}
        onReferInpatient={referToInpatient}
        onSave={(appt) =>
          saveAppointment.mutate(appt, {
            onSuccess: () => {
              log('Update Anamnesa', appt.id, appt.ownerName, 'Diagnosis/tindakan/pertanyaan pre-visit diperbarui admin');
              pushToast({ tone: 'success', title: 'Perubahan tersimpan' });
              setDetail(appt);
            },
          })
        }
        onPreviewInvoice={(appt) => setInvoiceAppt(appt)}
        onCloseBill={closeBill}
      />

      {/* Invoice print */}
      <InvoiceModal appointment={invoiceAppt} onClose={() => setInvoiceAppt(null)} />
      <WalkInModal open={walkInOpen} appointments={appointments} doctors={config?.doctors ?? []} services={config?.clinicalServices ?? []} onClose={() => setWalkInOpen(false)} onSave={(appointment) => saveAppointment.mutate(appointment, { onSuccess: () => { log('Tambah Walk-in', appointment.id, appointment.ownerName, `Nomor antrean ${appointment.queueNumber}`); setWalkInOpen(false); pushToast({ tone: 'success', title: `Walk-in ${appointment.queueNumber}`, message: 'Pasien langsung masuk antrean pemeriksaan.' }); } })} />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.status === 'Cancelled') handleDelete(deleteTarget);
          else {
            setStatus({ ...deleteTarget, cancelReason: 'Dibatalkan oleh staf klinik' }, 'Cancelled');
            setDeleteTarget(null);
          }
        }}
        title={deleteTarget?.status === 'Cancelled' ? 'Hapus appointment permanen?' : 'Batalkan appointment?'}
        message={deleteTarget?.status === 'Cancelled' ? `Riwayat ${deleteTarget.ownerName} akan dihapus permanen.` : `Appointment ${deleteTarget?.ownerName} akan disimpan sebagai Dibatalkan agar audit trail tetap tersedia.`}
        confirmLabel={deleteTarget?.status === 'Cancelled' ? 'Hapus Permanen' : 'Batalkan'}
      />
    </div>
  );
}

function billTotal(appt: Appointment): number {
  return (appt.service?.price ?? 0) + appt.pets.reduce(
    (sum, pet) => sum + pet.treatments.reduce((s, t) => s + t.subtotal, 0),
    0
  );
}

function WalkInModal({ open, appointments, doctors, services, onClose, onSave }: { open: boolean; appointments: Appointment[]; doctors: string[]; services: ClinicalService[]; onClose: () => void; onSave: (appointment: Appointment) => void }) {
  const [ownerName, setOwnerName] = useState(''); const [ownerPhone, setOwnerPhone] = useState(''); const [petName, setPetName] = useState(''); const [petType, setPetType] = useState<PetType>('Kucing'); const [petBreed, setPetBreed] = useState(''); const [doctorName, setDoctorName] = useState(doctors[0] || ''); const [serviceName, setServiceName] = useState(services[0]?.name || ''); const [complaint, setComplaint] = useState(''); const [error, setError] = useState('');
  if (!open) return null;
  const submit = () => { if (!ownerName.trim() || !ownerPhone.trim() || !petName.trim() || !doctorName || !complaint.trim()) { setError('Pemilik, WhatsApp, pasien, dokter, dan keluhan wajib diisi.'); return; } const now = new Date().toISOString(); const service = services.find((item) => item.name === serviceName); onSave({ id: generateId('APT-WI'), ownerName: ownerName.trim(), ownerPhone: ownerPhone.trim(), date: todayISO(), timeSlot: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), doctorName, service, accommodation: 'Walk-in', pets: [{ petName: petName.trim(), petType, petBreed: petBreed.trim() || '-', reasons: ['Walk-in'], conditionStory: complaint.trim(), complaints: [], preVisitAnswers: [], treatments: [] }], status: 'In_Progress', confirmedAt: now, checkedInAt: now, queueNumber: nextQueueNumber(appointments, todayISO()), notes: 'Registrasi walk-in oleh staf.', createdAt: now }); };
  return <Modal isOpen={open} onClose={onClose} title="Registrasi Walk-in" subtitle="Pasien langsung check-in dan memperoleh nomor antrean" icon={<UserPlus size={18} />} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={submit}>Masukkan Antrean</Button></>}><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Nama Pemilik" required><Input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} /></Field><Field label="Nomor WhatsApp" required><Input value={ownerPhone} onChange={(event) => setOwnerPhone(event.target.value)} /></Field><Field label="Nama Pasien" required><Input value={petName} onChange={(event) => setPetName(event.target.value)} /></Field><Field label="Jenis Hewan"><Select value={petType} onChange={(event) => setPetType(event.target.value as PetType)}>{['Kucing', 'Anjing', 'Kelinci', 'Lainnya'].map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Ras"><Input value={petBreed} onChange={(event) => setPetBreed(event.target.value)} /></Field><Field label="Dokter" required><Select value={doctorName} onChange={(event) => setDoctorName(event.target.value)}><option value="">Pilih dokter</option>{doctors.map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Layanan"><Select value={serviceName} onChange={(event) => setServiceName(event.target.value)}><option value="">Pemeriksaan umum</option>{services.map((item) => <option key={item.name}>{item.name}</option>)}</Select></Field></div><Field label="Keluhan Utama" required><Textarea value={complaint} onChange={(event) => setComplaint(event.target.value)} placeholder="Ceritakan kondisi pasien secara singkat…" /></Field>{error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}</div></Modal>;
}

// ================== DETAIL MODAL ==================

function AppointmentDetailModal({
  appointment,
  inventory,
  onClose,
  onStatus,
  onConfirm,
  onCheckIn,
  onReferInpatient,
  onSave,
  onPreviewInvoice,
  onCloseBill,
}: {
  appointment: Appointment | null;
  inventory: { id: string; name: string; stock: number; sellingPrice?: number }[];
  onClose: () => void;
  onStatus: (appt: Appointment, status: ReservationStatus) => void;
  onConfirm: (appt: Appointment) => void;
  onCheckIn: (appt: Appointment) => void;
  onReferInpatient: (appt: Appointment, petIndex: number) => void;
  onSave: (appt: Appointment) => void;
  onPreviewInvoice: (appt: Appointment) => void;
  onCloseBill: (appt: Appointment, payment: NonNullable<Appointment['payment']>) => void;
}) {
  const { data: config } = useAppConfig();
  const clinicItems = config?.clinicItems ?? [];
  const [draft, setDraft] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(0);

  useEffect(() => {
    setDraft(appointment);
    if (appointment?.payment) {
      setPaymentMethod(appointment.payment.method);
      setAmountPaid(appointment.payment.amountPaid || 0);
    } else {
      const total = appointment ? billTotal(appointment) : 0;
      setPaymentMethod('Cash');
      setAmountPaid(total);
    }
  }, [appointment]);

  if (!draft) return null;

  const updatePet = (index: number, field: keyof AppointmentPet, value: unknown) => {
    setDraft({ ...draft, pets: draft.pets.map((p, i) => (i === index ? { ...p, [field]: value } : p)) });
  };

  const addTreatment = (petIndex: number, item: { name: string; type: AppointmentTreatmentItem['type']; price: number; itemId?: string }) => {
    const t: AppointmentTreatmentItem = {
      id: `t-${Date.now()}-${billItemSeq++}`,
      name: item.name,
      type: item.type,
      price: item.price,
      quantity: 1,
      subtotal: item.price,
      itemId: item.itemId,
    };
    updatePet(petIndex, 'treatments', [...draft.pets[petIndex].treatments, t]);
  };

  const setTreatmentQty = (petIndex: number, treatmentId: string, delta: number) => {
    setDraft({
      ...draft,
      pets: draft.pets.map((p, i) =>
        i !== petIndex
          ? p
          : {
              ...p,
              treatments: p.treatments
                .map((t) => (t.id === treatmentId ? { ...t, quantity: Math.max(0, t.quantity + delta), subtotal: Math.max(0, t.quantity + delta) * t.price } : t))
                .filter((t) => t.quantity > 0),
            }
      ),
    });
  };

  const updateTreatment = (petIndex: number, treatmentId: string, patch: Partial<AppointmentTreatmentItem>) => {
    updatePet(petIndex, 'treatments', draft.pets[petIndex].treatments.map((item) => item.id === treatmentId ? { ...item, ...patch } : item));
  };

  const addDocument = async (petIndex: number, file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      pushToast({ tone: 'error', title: 'Lampiran terlalu besar', message: 'Maksimal 3 MB per berkas untuk penyimpanan frontend.' });
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const documents = draft.pets[petIndex].documents ?? [];
    updatePet(petIndex, 'documents', [...documents, { id: generateId('DOC'), name: file.name, kind: file.type === 'application/pdf' ? 'Laboratorium' : 'Pemeriksaan', mimeType: file.type, dataUrl, uploadedAt: new Date().toISOString() }]);
  };

  const total = billTotal(draft);
  const change = Math.max(0, amountPaid - total);
  const canClose = total > 0 && amountPaid >= total;

  return (
    <Modal
      isOpen={!!appointment}
      onClose={onClose}
      title={`Appointment — ${draft.ownerName}`}
      subtitle={`${formatDayDateID(draft.date)} • ${draft.timeSlot} • 🩺 ${draft.doctorName || '—'}`}
      icon={<Clock size={18} />}
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {appointmentStage(draft) === 'Pending' && <Button size="sm" variant="success" onClick={() => onConfirm(draft)}><CheckCircle2 size={12} /> Konfirmasi</Button>}
            {appointmentStage(draft) === 'Confirmed' && <Button size="sm" onClick={() => onCheckIn(draft)}><ListChecks size={12} /> Check-in Pasien</Button>}
            {draft.status === 'In_Progress' && !draft.billClosed && (
              <Button size="sm" variant="outline-danger" onClick={() => onStatus(draft, 'Cancelled')}>
                <XCircle size={12} /> Batalkan
              </Button>
            )}
            {draft.billClosed && (
              <Button size="sm" variant="secondary" onClick={() => onPreviewInvoice(draft)}>
                <Printer size={12} /> Cetak Invoice
              </Button>
            )}
          </div>
          <Button size="sm" onClick={() => onSave(draft)}>
            <Pencil size={13} /> Simpan Perubahan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40"><StageRail appointment={draft} expanded /></div>
        <div className="flex flex-wrap gap-2">
          <StageBadge stage={appointmentStage(draft)} />
          {draft.queueNumber && <Badge tone="sky"><ListChecks size={10} /> Antrean {draft.queueNumber}</Badge>}
          {draft.service && <Badge tone="brand">🏥 {draft.service.name}</Badge>}
          <Badge tone="brand">🚙 {draft.accommodation}</Badge>
          <Badge tone="sky">{draft.ownerPhone}</Badge>
          {draft.ownerCallPreference && <Badge tone="slate">Panggil: {draft.ownerCallPreference}</Badge>}
          {draft.billClosed && <Badge tone="emerald">Bill Lunas — {draft.payment?.method}</Badge>}
        </div>

        {draft.pets.map((pet, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h4 className="font-display mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              🐾 {pet.petName} ({pet.petType} — {pet.petBreed})
            </h4>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="secondary" onClick={() => printMedicalResume(draft, idx)}><FileHeart size={12} /> Resume Medis</Button>
              <Button type="button" size="sm" variant="secondary" disabled={draft.status === 'Waiting' || draft.status === 'Cancelled'} onClick={() => onReferInpatient(draft, idx)} title={draft.status === 'Waiting' ? 'Check-in pasien terlebih dahulu' : 'Teruskan data ke Rawat Inap'}><BedDouble size={12} /> Lanjut Rawat Inap</Button>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {pet.reasons.map((r) => (
                <Badge key={r} tone="brand">{r}</Badge>
              ))}
            </div>
            <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
              📝 {pet.conditionStory}
            </p>
            {pet.complaints.length > 0 && (
              <div className="mt-2 space-y-1">
                {pet.complaints.map((c) => (
                  <p key={c.name} className="text-[11px] text-slate-500">
                    ✅ {c.name}: {c.detail || '—'}
                  </p>
                ))}
              </div>
            )}

            {pet.preVisitAnswers.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                <p className="mb-2 text-[10px] font-bold tracking-wide text-slate-400 uppercase">Pertanyaan pra-kunjungan</p>
                <div className="space-y-2">{pet.preVisitAnswers.map((item, answerIndex) => <label key={`${item.question}-${answerIndex}`} className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600 dark:text-slate-300">{item.question}</span><Input value={item.answer} placeholder="Lengkapi saat pasien datang" onChange={(event) => updatePet(idx, 'preVisitAnswers', pet.preVisitAnswers.map((answer, index) => index === answerIndex ? { ...answer, answer: event.target.value } : answer))} className="text-xs" /></label>)}</div>
              </div>
            )}

            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/40 p-3 dark:border-sky-900 dark:bg-sky-950/20">
              <p className="mb-3 text-[10px] font-bold tracking-wide text-sky-700 uppercase dark:text-sky-300">Pemeriksaan Fisik & Vital</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Berat (kg)"><Input type="number" step="0.1" min="0" value={pet.examination?.weight ?? ''} onChange={(event) => updatePet(idx, 'examination', { ...pet.examination, weight: Number(event.target.value) || undefined })} /></Field>
                <Field label="Suhu (°C)"><Input type="number" step="0.1" min="30" max="45" value={pet.examination?.temperature ?? ''} onChange={(event) => updatePet(idx, 'examination', { ...pet.examination, temperature: Number(event.target.value) || undefined })} /></Field>
                <Field label="Turgor / Hidrasi"><Input value={pet.examination?.turgor || ''} onChange={(event) => updatePet(idx, 'examination', { ...pet.examination, turgor: event.target.value })} placeholder="Normal / dehidrasi ringan…" /></Field>
              </div>
              <Field label="Temuan Pemeriksaan Fisik" className="mt-3"><Textarea value={pet.examination?.physicalExam || ''} onChange={(event) => updatePet(idx, 'examination', { ...pet.examination, physicalExam: event.target.value })} placeholder="Mukosa, auskultasi, palpasi, kondisi kulit, dan temuan klinis lain…" /></Field>
            </div>

            {/* Diagnosis */}
            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold text-brand-700 dark:text-brand-300">
                Diagnosis {pet.diagnosis && <Badge tone="emerald" className="ml-1">terisi</Badge>}
              </label>
              <Input
                value={pet.diagnosis || ''}
                onChange={(e) => updatePet(idx, 'diagnosis', e.target.value)}
                placeholder="cth. Infeksi jamur ringan + kurang nutrisi"
                className="text-xs"
              />
            </div>

            {/* Tindakan & Obat */}
            <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-800 dark:bg-brand-950/20">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-brand-700 uppercase dark:text-brand-300">
                <Pill size={12} /> Tindakan & Obat ({formatRupiah(pet.treatments.reduce((s, t) => s + t.subtotal, 0))})
              </p>
              {pet.treatments.length > 0 && (
                <div className="mb-2 space-y-1">
                  {pet.treatments.map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                      <Badge tone={t.type === 'obat' ? 'emerald' : t.type === 'tindakan' ? 'brand' : 'sky'}>{t.type}</Badge>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {t.name} <span className="font-normal text-slate-400">({formatRupiah(t.price)})</span>
                        {t.itemId && <span className="ml-1 text-[9px] text-slate-400">· stok auto</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setTreatmentQty(idx, t.id, -1)} className="cursor-pointer rounded border border-slate-200 p-0.5 text-slate-500 dark:border-slate-600">−</button>
                        <span className="w-5 text-center font-mono text-xs font-bold">{t.quantity}</span>
                        <button onClick={() => setTreatmentQty(idx, t.id, 1)} className="cursor-pointer rounded border border-slate-200 p-0.5 text-slate-500 dark:border-slate-600">+</button>
                      </div>
                      <span className="w-20 text-right font-mono text-xs font-bold">{formatRupiah(t.subtotal)}</span>
                      <button
                        onClick={() => updatePet(idx, 'treatments', pet.treatments.filter((x) => x.id !== t.id))}
                        className="cursor-pointer rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      >
                        🗑
                      </button>
                      </div>
                      {t.type === 'obat' && <div className="mt-2 grid gap-2 sm:grid-cols-2"><Input value={t.dosage || ''} onChange={(event) => updateTreatment(idx, t.id, { dosage: event.target.value })} placeholder="Dosis: 2x sehari" className="text-[11px]" /><Input value={t.notes || ''} onChange={(event) => updateTreatment(idx, t.id, { notes: event.target.value })} placeholder="Sesudah makan / instruksi lain" className="text-[11px]" /></div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick-pick master klinik */}
              <p className="mb-1 text-[10px] font-bold text-slate-400 uppercase">Tambah dari master:</p>
              <div className="flex flex-wrap gap-1">
                {(config?.clinicItems ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => addTreatment(idx, { name: c.name, type: c.type, price: c.price })}
                    className="cursor-pointer rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[10px] font-bold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-800 dark:text-brand-300"
                  >
                    + {c.name}
                  </button>
                ))}
              </div>
              {/* Quick-pick inventaris (obat/produk) */}
              <p className="mt-2 mb-1 text-[10px] font-bold text-slate-400 uppercase">Dari Inventaris (stok auto):</p>
              <div className="flex flex-wrap gap-1">
                {inventory
                  .filter((i) => i.sellingPrice && i.sellingPrice > 0)
                  .map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => addTreatment(idx, { name: i.name, type: 'produk', price: i.sellingPrice ?? 0, itemId: i.id })}
                      className="cursor-pointer rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      + {i.name} ({formatRupiah(i.sellingPrice || 0)})
                    </button>
                  ))}
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">Dokumentasi Medis</p><p className="text-[10px] text-slate-400">Foto pemeriksaan, hasil lab, radiologi, atau PDF.</p></div><label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><FileUp size={13} /> Unggah<input type="file" accept="image/*,application/pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addDocument(idx, file); event.target.value = ''; }} /></label></div>
              {(pet.documents?.length ?? 0) > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{pet.documents!.map((document) => <div key={document.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><a href={document.dataUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-semibold text-brand-700 dark:text-brand-300">{document.name}</a><Select value={document.kind} onChange={(event) => updatePet(idx, 'documents', pet.documents!.map((item) => item.id === document.id ? { ...item, kind: event.target.value as typeof item.kind } : item))} className="max-w-32 text-[10px]"><option>Pemeriksaan</option><option>Laboratorium</option><option>Radiologi</option><option>Lainnya</option></Select><button type="button" onClick={() => updatePet(idx, 'documents', pet.documents!.filter((item) => item.id !== document.id))} className="text-rose-500"><Trash2 size={13} /></button></div>)}</div>}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">Catatan kunjungan internal</label><Textarea rows={3} value={draft.notes || ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Catatan dokter atau staf yang perlu diteruskan ke proses berikutnya…" /></div>

        {/* Bill & Pembayaran */}
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="font-display mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-300">
            <Wallet size={15} /> Bill & Pembayaran
          </p>
          {draft.service && <div className="mb-2 flex items-center justify-between rounded-lg border border-amber-200 bg-white/70 px-3 py-2 text-xs dark:border-amber-900 dark:bg-slate-900/70"><span className="font-semibold text-slate-600 dark:text-slate-300">Biaya layanan dasar • {draft.service.name}</span><span className="font-mono font-bold text-slate-800 dark:text-slate-100">{formatRupiah(draft.service.price)}</span></div>}
          <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white dark:bg-slate-950">
            <span className="text-xs font-bold tracking-wide uppercase">Total Tagihan</span>
            <span className="font-mono text-xl font-bold text-amber-300">{formatRupiah(total)}</span>
          </div>

          {draft.billClosed ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              🟢 Bill LUNAS — {draft.payment?.method} • Dibayar {formatRupiah(draft.payment?.amountPaid || 0)}
              {(draft.payment?.changeAmount || 0) > 0 && ` • Kembali ${formatRupiah(draft.payment?.changeAmount || 0)}`}
              {draft.payment?.paidAt && ` • ${formatDateTimeStr(draft.payment.paidAt)}`}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Metode</span>
                  <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="text-xs">
                    {['Cash', 'Transfer', 'QRIS', 'Debit'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Jumlah Bayar</span>
                  <Input
                    type="number"
                    value={amountPaid || ''}
                    onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                    className="text-xs"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Kembalian</span>
                  <Input value={formatRupiah(Math.max(0, amountPaid - total))} disabled className="text-xs" />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onPreviewInvoice(draft)}
                  disabled={total <= 0}
                >
                  <Printer size={13} /> Preview Invoice
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  disabled={!canClose}
                  onClick={() =>
                    onCloseBill(draft, {
                      method: paymentMethod,
                      amountPaid,
                      changeAmount: Math.max(0, amountPaid - total),
                      paidAt: new Date().toISOString(),
                    })
                  }
                >
                  <Wallet size={13} /> Tutup Bill & Selesaikan
                </Button>
              </div>
              {!canClose && total > 0 && (
                <p className="mt-2 text-right text-[10px] font-semibold text-rose-500">
                  Jumlah bayar harus ≥ total tagihan.
                </p>
              )}
            </>
          )}
        </div>

        {/* Signature */}
        {draft.signatureData && (
          <div className="text-center">
            <img src={draft.signatureData} alt="Tanda tangan" className="mx-auto h-14" />
            <p className="border-t border-slate-300 pt-1 text-[10px] text-slate-500">Tanda Tangan Pemilik (consent)</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Invoice struk printable — gaya POS */
function InvoiceModal({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  if (!appointment) return null;
  const total = billTotal(appointment);

  return (
    <Modal
      isOpen={!!appointment}
      onClose={onClose}
      title="Invoice Appointment"
      subtitle={`${appointment.ownerName} • ${formatDateTimeStr(appointment.billClosed ? appointment.payment?.paidAt || appointment.createdAt : appointment.createdAt)}`}
      icon={<Printer size={18} />}
      size="sm"
      footer={
        <Button size="sm" onClick={() => window.print()}>
          <Printer size={13} /> Cetak Invoice
        </Button>
      }
    >
      <div id="printable-receipt-area" className="mx-auto max-w-xs text-slate-800">
        <div className="text-center">
          <p className="font-display text-sm font-bold">JEJE PET CARE — KLINIK</p>
          <p className="text-[10px] text-slate-500">Invoice Appointment Dokter</p>
        </div>
        <div className="my-3 border-t border-dashed border-slate-300" />
        <div className="space-y-0.5 font-mono text-[11px]">
          <Row l="Pemilik" r={appointment.ownerName} />
          <Row l="No. WA" r={appointment.ownerPhone} />
          <Row l="Dokter" r={appointment.doctorName || '-'} />
          <Row l="Layanan" r={appointment.service?.name || '-'} />
          <Row l="Jadwal" r={`${appointment.date.split('-').reverse().join('/')} ${appointment.timeSlot}`} />
          <Row l="Status" r={appointment.billClosed ? 'LUNAS' : 'BELUM DIBAYAR'} />
        </div>
        <div className="my-3 border-t border-dashed border-slate-300" />
        {appointment.service && (
          <div className="mb-2 flex justify-between gap-3 font-mono text-[11px]">
            <span className="truncate pr-2">Biaya layanan — {appointment.service.name}</span>
            <span>{appointment.service.price.toLocaleString('id-ID')}</span>
          </div>
        )}
        {appointment.pets.map((pet) => (
          <div key={pet.petName} className="mb-2">
            <p className="text-[10px] font-bold">{pet.petName}{pet.diagnosis ? ` — ${pet.diagnosis}` : ''}</p>
            {pet.treatments.length === 0 ? (
              <p className="text-[10px] text-slate-400">Tidak ada tindakan/obat.</p>
            ) : (
              <div className="space-y-0.5 font-mono text-[11px]">
                {pet.treatments.map((t) => (
                  <div key={t.id} className="flex justify-between">
                    <span className="truncate pr-2">{t.name} x{t.quantity}</span>
                    <span>{t.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="my-3 border-t border-dashed border-slate-300" />
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span className="font-mono">{formatRupiah(total)}</span>
        </div>
        {appointment.payment && (
          <div className="space-y-0.5 font-mono text-[11px]">
            <Row l="Metode" r={appointment.payment.method} />
            <Row l="Dibayar" r={formatRupiah(appointment.payment.amountPaid || 0)} />
            {(appointment.payment.changeAmount || 0) > 0 && (
              <Row l="Kembali" r={formatRupiah(appointment.payment.changeAmount || 0)} />
            )}
          </div>
        )}
        <div className="mt-3 border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500">
          Terima kasih! Semoga lekas sehat 🐾
        </div>
      </div>
    </Modal>
  );
}

function Row({ l, r }: { l: string; r: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{l}</span>
      <span className="font-bold">{r}</span>
    </div>
  );
}

function formatDateTimeStr(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function appointmentStage(appointment: Appointment): AppointmentStage {
  if (appointment.status === 'Cancelled') return 'Cancelled';
  if (appointment.status === 'Completed') return 'Completed';
  if (appointment.status === 'In_Progress') return 'In_Progress';
  return appointment.confirmedAt ? 'Confirmed' : 'Pending';
}

function StageBadge({ stage }: { stage: AppointmentStage }) {
  const config: Record<AppointmentStage, { label: string; tone: 'amber' | 'sky' | 'brand' | 'emerald' | 'slate' }> = {
    Pending: { label: 'Menunggu Verifikasi', tone: 'amber' },
    Confirmed: { label: 'Terkonfirmasi', tone: 'sky' },
    In_Progress: { label: 'Sedang Diperiksa', tone: 'brand' },
    Completed: { label: 'Selesai', tone: 'emerald' },
    Cancelled: { label: 'Dibatalkan', tone: 'slate' },
  };
  return <Badge tone={config[stage].tone}>{config[stage].label}</Badge>;
}

function StageRail({ appointment, expanded = false }: { appointment: Appointment; expanded?: boolean }) {
  const stage = appointmentStage(appointment);
  const activeIndex = stage === 'Pending' ? 0 : stage === 'Confirmed' ? 1 : stage === 'In_Progress' ? 2 : stage === 'Completed' ? 3 : -1;
  const steps = [
    { label: 'Booking', time: appointment.createdAt },
    { label: 'Konfirmasi', time: appointment.confirmedAt },
    { label: 'Check-in', time: appointment.checkedInAt },
    { label: 'Selesai', time: appointment.completedAt || (appointment.status === 'Completed' ? appointment.payment?.paidAt : undefined) },
  ];
  if (stage === 'Cancelled') return <p className="mt-3 text-[10px] font-semibold text-slate-400">Alur dihentikan karena appointment dibatalkan.</p>;
  return (
    <div className={`${expanded ? '' : 'mt-3'} grid grid-cols-4 gap-1`}>
      {steps.map((step, index) => {
        const done = index <= activeIndex;
        const current = index === activeIndex;
        return <div key={step.label} className="relative text-center"><div className={`absolute top-2 left-0 h-0.5 w-full ${index === 0 ? 'left-1/2 w-1/2' : index === steps.length - 1 ? 'w-1/2' : ''} ${index <= activeIndex ? 'bg-brand-400' : 'bg-slate-200 dark:bg-slate-700'}`} /><span className={`relative mx-auto flex h-4 w-4 items-center justify-center rounded-full border-2 ${done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'}`}>{done && <CircleCheckBig size={9} />}</span><p className={`mt-1 text-[9px] font-bold ${current ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400'}`}>{step.label}</p>{expanded && <p className="mt-0.5 text-[8px] text-slate-400">{step.time ? formatDateTimeStr(step.time) : '—'}</p>}</div>;
      })}
    </div>
  );
}

function filterLabel(filter: StatusFilter): string {
  return ({ All: 'Semua', Active: 'Aktif', Pending: 'Perlu Verifikasi', Confirmed: 'Terkonfirmasi', In_Progress: 'Pemeriksaan', Completed: 'Selesai', Cancelled: 'Dibatalkan' } as Record<StatusFilter, string>)[filter];
}

function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isoFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftISODate(value: string, days: number): string {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return isoFromDate(date);
}

function weekRange(value: string): { start: string; end: string } {
  const date = parseISODate(value);
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + offset);
  const start = isoFromDate(date);
  date.setDate(date.getDate() + 6);
  return { start, end: isoFromDate(date) };
}

function isInPeriod(date: string, selectedDate: string, mode: PeriodMode): boolean {
  if (mode === 'all') return true;
  if (mode === 'day') return date === selectedDate;
  const { start, end } = weekRange(selectedDate);
  return date >= start && date <= end;
}

function periodLabel(selectedDate: string, mode: PeriodMode): string {
  if (mode === 'day') return formatDayDateID(selectedDate);
  const { start, end } = weekRange(selectedDate);
  return `${formatDayDateID(start)} — ${formatDayDateID(end)}`;
}

function nextQueueNumber(appointments: Appointment[], date: string): string {
  const max = appointments.filter((item) => item.date === date).reduce((highest, item) => {
    const value = Number(item.queueNumber?.replace(/\D/g, '') || 0);
    return Math.max(highest, value);
  }, 0);
  return `A-${String(max + 1).padStart(3, '0')}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca berkas.'));
    reader.readAsDataURL(file);
  });
}

function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

function printMedicalResume(appointment: Appointment, petIndex: number) {
  const pet = appointment.pets[petIndex];
  if (!pet) return;
  const doc = new jsPDF();
  const left = 18;
  let y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('JEJE PET CARE', left, y);
  y += 7;
  doc.setFontSize(11);
  doc.text('Resume Rekam Medis Pasien', left, y);
  y += 9;
  doc.setDrawColor(210);
  doc.line(left, y, 192, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const rows = [
    ['ID Kunjungan', appointment.id],
    ['Tanggal', `${formatDayDateID(appointment.date)} • ${appointment.timeSlot}`],
    ['Pemilik', `${appointment.ownerName} • ${appointment.ownerPhone}`],
    ['Pasien', `${pet.petName} • ${pet.petType} • ${pet.petBreed}`],
    ['Layanan', appointment.service?.name || 'Pemeriksaan klinik'],
    ['Dokter PJ', appointment.doctorName || '-'],
  ];
  rows.forEach(([label, value]) => { doc.setFont('helvetica', 'bold'); doc.text(label, left, y); doc.setFont('helvetica', 'normal'); doc.text(String(value), 55, y); y += 6; });
  y += 3;
  const sections = [
    ['Keluhan / Anamnesa', pet.conditionStory || '-'],
    ['Vital', `Berat ${pet.examination?.weight ?? '-'} kg • Suhu ${pet.examination?.temperature ?? '-'}°C • Turgor ${pet.examination?.turgor || '-'}`],
    ['Pemeriksaan Fisik', pet.examination?.physicalExam || '-'],
    ['Diagnosis', pet.diagnosis || 'Belum diisi'],
    ['Tindakan & Obat', pet.treatments.length ? pet.treatments.map((item) => `${item.name} x${item.quantity}${item.dosage ? ` — ${item.dosage}` : ''}${item.notes ? ` (${item.notes})` : ''}`).join(', ') : 'Belum ada tindakan atau obat'],
    ['Lampiran', pet.documents?.length ? pet.documents.map((item) => `${item.kind}: ${item.name}`).join(', ') : 'Tidak ada lampiran'],
    ['Catatan', appointment.notes || '-'],
  ];
  sections.forEach(([label, value]) => { doc.setFont('helvetica', 'bold'); doc.text(label, left, y); y += 5; doc.setFont('helvetica', 'normal'); const lines = doc.splitTextToSize(String(value), 174); doc.text(lines, left, y); y += lines.length * 5 + 5; });
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(`Dicetak ${formatDateTimeStr(new Date().toISOString())}`, left, 285);
  doc.save(`resume-medis-${pet.petName.toLowerCase().replace(/\s+/g, '-')}-${appointment.date}.pdf`);
}
