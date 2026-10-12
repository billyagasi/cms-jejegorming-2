import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, SearchCheck, Stethoscope, PartyPopper, Plus, UserRound } from 'lucide-react';
import { Appointment, AppointmentPet } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Stepper from '../../components/ui/Stepper';
import { Field, Input, Select } from '../../components/ui/Input';
import { SectionTitle } from '../../components/ui/Section';
import SignaturePad from '../../components/common/SignaturePad';
import { useAppConfig, useAppointments, useSaveAppointment, useAddActivityLog, useAddNotificationLog } from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { pushToast } from '../../components/ui/toastStore';
import { copyToClipboard, formatDayDateID, todayISO } from '../../lib/format';
import { DraftApptPet, MAX_PETS, ACCOMMODATIONS, createDraftApptPet, toApptPet } from './appointmentData';
import { PetIdentityCard } from './PetIdentityCard';
import AnamnesaCard from './AnamnesaCard';

const WIZARD_STEPS = [
  { id: 's1', label: 'Data Pemilik' },
  { id: 's2', label: 'Jadwal & Dokter' },
  { id: 's3', label: 'Hewan & Alasan' },
  { id: 's4', label: 'Anamnesa' },
  { id: 's5', label: 'Review & TTD' },
];

const CONSENT_CHECKBOX_TEXT =
  '"Saya telah membaca, memahami, dan menyetujui seluruh ketentuan di atas. Saya memberikan izin penuh kepada Jeje Pet Care untuk melakukan pemeriksaan/tindakan medis pada hewan peliharaan saya sesuai dengan layanan yang telah disepakati." *';

export default function AppointmentPortal() {
  const { data: config } = useAppConfig();
  const { data: appointments = [] } = useAppointments();
  const saveAppointment = useSaveAppointment();
  const addActivityLog = useAddActivityLog();
  const addNotificationLog = useAddNotificationLog();
  const session = useAppStore((s) => s.session);

  const apptSettings = config?.appointmentSettings ?? {
    sessionHours: ['09:00 - 10:00'],
    maxPetsPerHour: 2,
    allowDoctorSelection: true,
    consentText: '',
  };
  const doctors = config?.doctors?.length ? config.doctors : ['drh. Dokter Hewan'];
  const reasons = config?.appointmentReasons?.length ? config.appointmentReasons : ['Check-up'];
  const complaintsMaster = config?.appointmentComplaints ?? [];
  const questionsMaster = config?.appointmentPreVisitQuestions ?? [];
  const vaccines = config?.vaccinePresets?.length ? config.vaccinePresets : ['belum vaksin'];

  // --- Pemilik ---
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerCallPreference, setOwnerCallPreference] = useState('');
  const [ownerProfession, setOwnerProfession] = useState('');

  // --- Jadwal ---
  const [currentStep, setCurrentStep] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [timeSlot, setTimeSlot] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [accommodation, setAccommodation] = useState('Diantar Sendiri');

  // --- Hewan ---
  const [pets, setPets] = useState<DraftApptPet[]>([]);
  const [consentTextSnapshot, setConsentTextSnapshot] = useState('');
  const [isConsented, setIsConsented] = useState(false);
  const [signatureData, setSignatureData] = useState<string | undefined>(undefined);
  const [errorText, setErrorText] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (pets.length === 0) {
      setPets([createDraftApptPet(vaccines)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaccines.length]);

  useEffect(() => {
    if (!timeSlot && apptSettings.sessionHours.length > 0) {
      setTimeSlot(apptSettings.sessionHours[0]);
    }
    if (!doctorName && doctors.length > 0) {
      setDoctorName(doctors[0]);
    }
    if (consentTextSnapshot === '' && apptSettings.consentText) {
      setConsentTextSnapshot(apptSettings.consentText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptSettings.sessionHours.length, doctors.length]);

  const selectedHoliday = useMemo(() => {
    const d = new Date(date);
    if ((config?.weeklyHolidays ?? []).includes(d.getDay())) {
      return { name: 'Hari Libur Rutin Mingguan' };
    }
    const special = (config?.specialHolidays ?? []).find((h) => h.date === date);
    if (special) return { name: special.name };
    return null;
  }, [date, config]);

  const slotBookedPets = appointments
    .filter((a) => a.date === date && a.timeSlot === timeSlot && a.status !== 'Cancelled')
    .reduce((sum, a) => sum + a.pets.length, 0);
  const quota = apptSettings.maxPetsPerHour;
  const spaceLeft = Math.max(0, quota - slotBookedPets);

  const showError = (msg: string) => {
    setErrorText(msg);
    setTimeout(() => setErrorText(''), 6000);
  };

  // --- Phone lookup ---
  const handleOwnerPhoneChange = (val: string) => {
    setOwnerPhone(val);
    const digits = val.replace(/[^0-9]/g, '');
    if (digits.length >= 8) {
      const match = appointments.find((res) => {
        const resDigits = (res.ownerPhone || '').replace(/[^0-9]/g, '');
        return resDigits.startsWith(digits) || (resDigits.length >= 8 && digits.startsWith(resDigits.substring(0, 8)));
      });
      if (match) {
        setOwnerName(match.ownerName || '');
        setOwnerAddress(match.ownerAddress !== 'Belum diisi' ? match.ownerAddress || '' : '');
        setOwnerEmail(match.ownerEmail !== 'Belum diisi' ? match.ownerEmail || '' : '');
        setOwnerPhone(match.ownerPhone || '');
        setOwnerCallPreference(match.ownerCallPreference || '');
        setOwnerProfession(match.ownerProfession || '');
        if (match.signatureData) setSignatureData(match.signatureData);
      }
    }
  };

  const handleAddPet = () => {
    if (pets.length >= MAX_PETS) {
      showError(`Maksimal ${MAX_PETS} ekor hewan per booking appointment (kuota per jam).`);
      return;
    }
    setPets([...pets, createDraftApptPet(vaccines)]);
  };

  const handleRemovePet = (index: number) => {
    if (pets.length <= 1) {
      showError('Minimal mendaftarkan 1 ekor hewan.');
      return;
    }
    setPets(pets.filter((_, i) => i !== index));
  };

  const updatePet = (index: number, field: keyof DraftApptPet, value: unknown) => {
    setPets((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleNextStep = () => {
    setErrorText('');
    if (currentStep === 0) {
      if (!ownerName.trim()) return showError('Mohon isi nama lengkap Anda.');
      if (!ownerPhone.trim()) return showError('Mohon isi nomor WhatsApp Anda.');
      if (!ownerAddress.trim()) return showError('Mohon isi alamat lengkap Anda.');
      if (!ownerEmail.trim()) return showError('Mohon isi alamat email aktif Anda.');
    } else if (currentStep === 1) {
      if (!date) return showError('Mohon pilih tanggal appointment.');
      if (selectedHoliday) return showError(`Klinik libur pada tanggal tersebut (${selectedHoliday.name}). Silakan pilih tanggal lain.`);
      if (!timeSlot) return showError('Mohon pilih jam praktik.');
      if (apptSettings.sessionHours.find((s) => s === timeSlot && s) && apptSettings.maxPetsPerHour === 0) {
        return showError('Sesi praktik sedang ditutup.');
      }
      if (slotBookedPets >= quota) {
        return showError(`Sesi "${timeSlot}" pada ${date} sudah penuh (kuota ${quota} ekor/jam). Silakan pilih jam lain.`);
      }
      if (!doctorName) return showError('Mohon pilih dokter.');
    } else if (currentStep === 2) {
      for (let i = 0; i < pets.length; i++) {
        if (!pets[i].petName.trim()) return showError(`Mohon lengkapi nama hewan #${i + 1}.`);
        if (!pets[i].petBreed.trim()) return showError(`Mohon lengkapi ras hewan #${i + 1}.`);
        if (pets[i].reasons.length === 0) return showError(`Pilih minimal 1 alasan kunjungan untuk hewan #${i + 1}.`);
      }
      if (pets.length > spaceLeft) {
        return showError(
          `Sesi "${timeSlot}" hanya tersisa ${spaceLeft} ekor pada ${date}. Anda mendaftarkan ${pets.length} ekor. Kurangi jumlah hewan atau pilih sesi lain.`
        );
      }
    } else if (currentStep === 3) {
      for (let i = 0; i < pets.length; i++) {
        if (!pets[i].conditionStory.trim()) {
          return showError(`Mohon isi cerita kondisi untuk ${pets[i].petName || `hewan #${i + 1}`}.`);
        }
      }
    }
    setCurrentStep((prev) => Math.min(4, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackStep = () => {
    setErrorText('');
    setCurrentStep((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!ownerName.trim()) return showError('Mohon isi nama lengkap Anda.');
    if (!ownerPhone.trim()) return showError('Mohon isi nomor WhatsApp Anda.');
    if (selectedHoliday) return showError(`Klinik libur pada tanggal tersebut (${selectedHoliday.name}).`);
    if (!isConsented) return showError('Anda harus menyetujui "Format Persetujuan Tindakan" sebelum mengirim.');
    if (!signatureData) return showError('Mohon berikan tanda tangan digital Anda sebelum mengirim form.');

    const apptPets: AppointmentPet[] = pets.map(toApptPet);
    const appointment: Appointment = {
      id: `appt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerAddress: ownerAddress.trim() || '-',
      ownerEmail: ownerEmail.trim() || '-',
      ownerCallPreference: ownerCallPreference.trim(),
      ownerProfession: ownerProfession.trim(),
      date,
      timeSlot,
      doctorName: doctorName || undefined,
      accommodation,
      pets: apptPets,
      consentText: consentTextSnapshot,
      signatureData,
      status: 'Waiting',
      notes: '',
      createdAt: new Date().toISOString(),
    };

    saveAppointment.mutate(appointment, {
      onSuccess: () => {
        addActivityLog.mutate({
          id: `act-${Date.now()}`,
          staffName: session?.username || 'Pelanggan / Mandiri',
          role: session?.role || 'Appointment Mandiri',
          action: 'Appointment Klinik',
          timestamp: new Date().toISOString(),
          targetId: appointment.id,
          targetName: appointment.pets.map((p) => p.petName).join(', '),
          details: `Appointment ${appointment.doctorName} (${appointment.timeSlot}) oleh ${appointment.ownerName} — ${appointment.pets.map((p) => `${p.petName}: ${p.reasons.join('/')}`).join('; ')}`,
        });

        const petList = appointment.pets
          .map((p, i) => `   ${i + 1}. 🐾 *${p.petName}* (${p.petType} ${p.petBreed}) — Alasan: ${p.reasons.join(', ')}`)
          .join('\n');
        pushToast({
          tone: 'wa',
          title: 'Notifikasi WhatsApp (Simulasi)',
          message: `[WA] Halo Kak *${appointment.ownerName}!*\nAppointment dokter untuk hewan kesayangan Anda telah terdaftar:\n\n${petList}\n\n🗓 ${formatDayDateID(appointment.date)} • ${appointment.timeSlot}\n🩺 Dokter: ${appointment.doctorName}\n\nMohon datang 10 menit sebelum jadwal. Terima kasih! 🩺🐾`,
          duration: 6500,
        });
        addNotificationLog.mutate({
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reservationId: appointment.id,
          petName: appointment.pets.map((p) => p.petName).join(', '),
          ownerName: appointment.ownerName,
          ownerPhone: appointment.ownerPhone,
          type: 'Appointment_Created',
          message: `[WA] Halo Kak ${appointment.ownerName}! Appointment dokter (${appointment.doctorName}) untuk ${appointment.pets.map((p) => p.petName).join(', ')} telah terdaftar pada ${formatDayDateID(appointment.date)} jam ${appointment.timeSlot}. Mohon datang 10 menit lebih awal. Terima kasih! 🩺🐾`,
          timestamp: new Date().toISOString(),
          channel: 'WhatsApp',
          status: 'Delivered',
        });

        setSubmittedAppointment(appointment);
        setSubmitSuccess(true);
        // Reset wizard
        setCurrentStep(0);
        setOwnerName('');
        setOwnerPhone('');
        setOwnerAddress('');
        setOwnerEmail('');
        setOwnerCallPreference('');
        setOwnerProfession('');
        setAccommodation('Diantar Sendiri');
        setIsConsented(false);
        setSignatureData(undefined);
        setPets([createDraftApptPet(vaccines)]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onError: (err) => showError(`Gagal mengirim: ${String(err)}`),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-brand-900 to-brand-950 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Stethoscope size={22} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Appointment Dokter</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-white/70">
              Daftarkan kunjungan medis hewan Anda — pilih alasan kunjungan, isi anamnesa, dan tentukan jadwal dengan
              dokter. Kuota pemeriksaan {quota} ekor/jam.
            </p>
          </div>
        </div>
      </Card>

      {/* Stepper */}
      <Card>
        <Stepper steps={WIZARD_STEPS} current={WIZARD_STEPS[currentStep].id} onStepClick={(id) => {
          const idx = WIZARD_STEPS.findIndex((s) => s.id === id);
          if (idx <= currentStep) {
            setCurrentStep(idx);
            setErrorText('');
          }
        }} />
      </Card>

      {errorText && (
        <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300" id="appt-error">
          ⚠️ {errorText}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* STEP 1: PEMILIK */}
        {currentStep === 0 && (
          <Card className="animate-slide-up">
            <SectionTitle>Data Kontak Pemilik</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nama Lengkap" required>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Contoh: Kak Joni" />
              </Field>
              <Field label="Preferensi Panggilan">
                <Select value={ownerCallPreference} onChange={(e) => setOwnerCallPreference(e.target.value)}>
                  <option value="">Pilih (opsional)…</option>
                  {['Mbak', 'Mas', 'Kak', 'Pak', 'Bu'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Alamat Rumah" required className="md:col-span-2">
                <Input value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} placeholder="Contoh: Jl. Melati No. 42" />
              </Field>
              <Field label="Alamat Email" required>
                <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="email@contoh.com" />
              </Field>
              <Field label="No. WhatsApp" required hint="≥ 8 digit: data terisi otomatis jika pernah terdaftar">
                <Input type="tel" value={ownerPhone} onChange={(e) => handleOwnerPhoneChange(e.target.value)} placeholder="081234567890" />
              </Field>
              <Field label="Pekerjaan" className="md:col-span-2">
                <Input value={ownerProfession} onChange={(e) => setOwnerProfession(e.target.value)} placeholder="Pekerjaan Anda (opsional)" />
              </Field>
            </div>
          </Card>
        )}

        {/* STEP 2: JADWAL & DOKTER */}
        {currentStep === 1 && (
          <Card className="animate-slide-up">
            <SectionTitle>Jadwal Praktik, Dokter & Akomodasi</SectionTitle>

            {selectedHoliday && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                🚨 Klinik libur pada tanggal tersebut ({selectedHoliday.name}). Silakan pilih tanggal operasional lain.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tanggal Appointment" required>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Akomodasi Kedatangan">
                <Select value={accommodation} onChange={(e) => setAccommodation(e.target.value)}>
                  {ACCOMMODATIONS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Pilih Jam Praktik <span className="text-rose-500">*</span>{' '}
              <span className="font-normal text-slate-400">(kuota {quota} ekor/jam)</span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {apptSettings.sessionHours.map((slot) => {
                const booked = appointments
                  .filter((a) => a.date === date && a.timeSlot === slot && a.status !== 'Cancelled')
                  .reduce((sum, a) => sum + a.pets.length, 0);
                const full = booked >= quota;
                const selected = slot === timeSlot;
                return (
                  <button
                    type="button"
                    key={slot}
                    disabled={full}
                    onClick={() => setTimeSlot(slot)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                        : full
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'
                          : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <span className="block font-mono text-[11px] font-bold">{slot}</span>
                    <span className={`mt-0.5 block text-[10px] ${selected ? 'text-white/80' : 'text-slate-400'}`}>
                      {full ? 'Penuh' : `${booked}/${quota} terisi`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dokter */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Dokter yang tersedia <span className="text-rose-500">*</span>{' '}
                {!apptSettings.allowDoctorSelection && (
                  <Badge tone="slate">ditentukan otomatis</Badge>
                )}
              </p>
              {apptSettings.allowDoctorSelection ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {doctors.map((doc) => {
                    const selected = doc === doctorName;
                    return (
                      <button
                        type="button"
                        key={doc}
                        onClick={() => setDoctorName(doc)}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                          selected
                            ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${selected ? 'bg-white/20' : 'bg-brand-50 dark:bg-brand-950/50'}`}>
                          <UserRound size={15} />
                        </span>
                        <span className="text-sm font-bold">{doc}</span>
                        {selected && <span className="ml-auto text-[10px] font-bold uppercase">Dipilih</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  {doctorName} — dokter akan ditugaskan oleh klinik sesuai jadwal.
                </div>
              )}
            </div>
          </Card>
        )}

        {/* STEP 3: HEWAN + ALASAN */}
        {currentStep === 2 && (
          <div className="animate-slide-up space-y-4">
            {pets.map((pet, idx) => (
              <PetIdentityCard
                key={idx}
                pet={pet}
                index={idx}
                vaccines={vaccines}
                reasons={reasons}
                canRemove={pets.length > 1}
                onChange={updatePet}
                onRemove={handleRemovePet}
                onError={showError}
              />
            ))}
            {pets.length < MAX_PETS && (
              <button
                type="button"
                onClick={handleAddPet}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500 transition-colors hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
              >
                <Plus size={16} />
                Tambah Hewan (maks. {MAX_PETS} ekor per booking)
              </button>
            )}
          </div>
        )}

        {/* STEP 4: ANAMNESA */}
        {currentStep === 3 && (
          <div className="animate-slide-up space-y-4">
            {pets.map((pet, idx) => (
              <AnamnesaCard
                key={idx}
                pet={pet}
                index={idx}
                complaintsMaster={complaintsMaster}
                questionsMaster={questionsMaster}
                onChange={updatePet}
                onError={showError}
              />
            ))}
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
              💡 Bagian <strong>Pertanyaan Sebelum Datang</strong> boleh dikosongkan — admin akan melengkapinya saat
              Anda datang melalui modul Appointment Klinik.
            </p>
          </div>
        )}

        {/* STEP 5: REVIEW + CONSENT + TTD */}
        {currentStep === 4 && (
          <div className="animate-slide-up space-y-6">
            <Card>
              <SectionTitle>Review Appointment</SectionTitle>
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewItem label="Nama Lengkap" value={ownerName || '—'} required />
                    <ReviewItem label="No. WhatsApp" value={ownerPhone || '—'} required mono />
                    <ReviewItem label="Jadwal" value={`${formatDayDateID(date)} • ${timeSlot}`} mono />
                    <ReviewItem label="Dokter" value={doctorName || '—'} />
                    <ReviewItem label="Akomodasi" value={accommodation} />
                    <ReviewItem label="Jumlah Hewan" value={`${pets.length} ekor`} mono />
                  </div>
                </div>
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                  {pets.map((p, idx) => (
                    <div key={idx} className="border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                        {idx + 1}. {p.petName || '—'} ({p.petType} {p.petBreed})
                      </p>
                      <p className="text-[10px] text-slate-500">Alasan: {p.reasons.join(', ') || '—'}</p>
                      <p className="text-[10px] text-slate-500">Keluhan: {p.complaints.length ? p.complaints.map((c) => `${c.name} (${c.detail})`).join('; ') : '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Informed Consent */}
            <Card className="border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/15">
              <SectionTitle>
                <span className="text-amber-700 dark:text-amber-400">📋 Format Persetujuan Tindakan (Informed Consent)</span>
              </SectionTitle>
              <div className="custom-scrollbar max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-amber-200 bg-white/90 p-3.5 text-[11px] leading-relaxed text-slate-600 dark:border-amber-900 dark:bg-slate-900/90 dark:text-slate-300">
                {consentTextSnapshot || '(Teks persetujuan belum diatur di Database Master.)'}
              </div>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-300 bg-white/90 p-3 transition-colors hover:bg-amber-50/60 dark:border-amber-900 dark:bg-slate-900/90">
                <input
                  type="checkbox"
                  checked={isConsented}
                  onChange={(e) => setIsConsented(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
                />
                <span className="text-[11px] font-bold leading-normal text-slate-700 dark:text-slate-200">
                  {CONSENT_CHECKBOX_TEXT}
                </span>
              </label>
              <div className="mt-4 border-t border-amber-200 pt-4 dark:border-amber-900">
                <SignaturePad
                  value={signatureData}
                  onChange={setSignatureData}
                  label="TANDA TANGAN DIGITAL PEMILIK"
                  required
                  placeholderText="Goreskan tanda tangan Anda pada pad di atas. Gunakan 'Layar Penuh' agar lebih nyaman di ponsel."
                />
              </div>
            </Card>
          </div>
        )}

        {/* Navigasi */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={handleBackStep} disabled={currentStep === 0}>
            ← Kembali
          </Button>
          {currentStep < 4 ? (
            <Button type="button" onClick={handleNextStep}>
              Lanjut →
            </Button>
          ) : (
            <Button type="submit" variant="success" disabled={saveAppointment.isPending}>
              <CheckCircle2 size={15} />
              Kirim Appointment
            </Button>
          )}
        </div>
      </form>

      {/* Success overlay */}
      {submitSuccess && submittedAppointment && (
        <div className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border-2 border-emerald-500 bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60">
              <PartyPopper size={32} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-display text-base font-bold uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
              Appointment Terkirim
            </h3>
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs leading-relaxed font-bold text-slate-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-slate-200">
              Data appointment telah diterima! Notifikasi WhatsApp simulasi terkirim. Admin akan mengonfirmasi jadwal
              Anda melalui modul Appointment Klinik.
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">ID tiket Anda</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-xs font-bold text-slate-800 dark:text-slate-100">{submittedAppointment.id}</code>
                <button
                  type="button"
                  onClick={async () => {
                    const copied = await copyToClipboard(submittedAppointment.id);
                    pushToast({ tone: copied ? 'success' : 'error', title: copied ? 'ID tiket disalin' : 'Gagal menyalin ID tiket' });
                  }}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900"
                  aria-label="Salin ID tiket"
                >
                  <Copy size={13} />
                </button>
              </div>
              <p className="mt-1.5 text-[9px] leading-relaxed text-slate-400">Simpan ID ini untuk mengecek status bersama nomor WhatsApp Anda.</p>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Badge tone="brand">Status: Waiting</Badge>
              <Badge tone="sky">{submittedAppointment.pets.length} Hewan</Badge>
            </div>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSubmitSuccess(false)}>Selesai</Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => {
                  setSubmitSuccess(false);
                  useAppStore.getState().setTab('tracker');
                }}
              >
                <SearchCheck size={13} /> Cek Status
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ReviewItem({ label, value, required, mono }: { label: string; value: string; required?: boolean; mono?: boolean }) {
  const empty = value === '—';
  return (
    <div>
      <span className="block text-[9px] font-bold uppercase text-slate-400">{label}</span>
      <span
        className={`block text-[11px] font-bold ${
          empty && required ? 'text-rose-500 italic' : 'text-slate-800 dark:text-slate-100'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
