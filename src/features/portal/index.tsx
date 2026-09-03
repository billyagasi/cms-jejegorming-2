import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Plus, DoorOpen, PartyPopper } from 'lucide-react';
import { Reservation, GroomingStep, PetType } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Stepper from '../../components/ui/Stepper';
import { Field, Input, Select } from '../../components/ui/Input';
import { SectionTitle } from '../../components/ui/Section';
import SignaturePad from '../../components/common/SignaturePad';
import { useAppConfig, useReservations, useSaveReservations, useAddActivityLog } from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { pushToast } from '../../components/ui/toastStore';
import { formatRupiah, formatDayDateID } from '../../lib/format';
import { useNotificationEngine } from '../notifications/useNotificationEngine';
import PetDraftCard from './PetDraftCard';
import { DraftPet, CONSENT_CLAUSES, CONSENT_CHECKBOX_TEXT, createDraftPet } from './portalData';

const WIZARD_STEPS = [
  { id: 's1', label: 'Data Pemilik' },
  { id: 's2', label: 'Jadwal' },
  { id: 's3', label: 'Data Hewan' },
  { id: 's4', label: 'Review & TTD' },
];

export default function PortalPage() {
  const { data: config } = useAppConfig();
  const { data: reservations = [] } = useReservations();
  const saveReservations = useSaveReservations();
  const addActivityLog = useAddActivityLog();
  const { notifyPortalBooking } = useNotificationEngine();
  const session = useAppStore((s) => s.session);
  const portalPrefill = useAppStore((s) => s.portalPrefill);
  const setPortalPrefill = useAppStore((s) => s.setPortalPrefill);

  const packages = config?.packages?.length ? config.packages : [];
  const addons = config?.addons?.length ? config.addons : [];
  const vaccineOptions = config?.vaccinePresets?.length ? config.vaccinePresets : ['belum vaksin'];
  const stepPJPresets = config?.stepPJPresets ?? [];
  const sessionQuotas = config?.sessionQuotas ?? {};
  const weeklyHolidays = config?.weeklyHolidays ?? [];
  const specialHolidays = config?.specialHolidays ?? [];

  const availableSlots = useMemo(
    () =>
      Object.keys(sessionQuotas).length > 0
        ? Object.keys(sessionQuotas).sort((a, b) => a.localeCompare(b))
        : ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00 (Istirahat)', '12:00 - 13:00'],
    [sessionQuotas]
  );

  // --- Owner & schedule ---
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerCallPreference, setOwnerCallPreference] = useState('');
  const [ownerProfession, setOwnerProfession] = useState('');
  const [transportMode, setTransportMode] = useState('Antar Sendiri');

  const [currentStep, setCurrentStep] = useState(0);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  // --- Pets ---
  const [pets, setPets] = useState<DraftPet[]>([]);

  // --- Consent & signature ---
  const [isConsented, setIsConsented] = useState(false);
  const [signatureData, setSignatureData] = useState<string | undefined>(undefined);
  const hasSignature = !!signatureData;

  // --- Submit state ---
  const [errorText, setErrorText] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Init pets & jadwal
  useEffect(() => {
    if (pets.length === 0) {
      setPets([createDraftPet('draft-1', packages, vaccineOptions)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages.length, vaccineOptions.length]);

  useEffect(() => {
    if (portalPrefill?.date) setDate(portalPrefill.date);
    if (portalPrefill?.slot) setTimeSlot(portalPrefill.slot);
  }, [portalPrefill]);

  useEffect(() => {
    if (!date) setDate(todayStr());
    if (!timeSlot) setTimeSlot(availableSlots[0] || '09:00 - 10:00');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSlots.length]);

  // Holiday helper
  const selectedHoliday = useMemo(() => {
    if (!date) return null;
    const parts = date.split('-');
    if (parts.length !== 3) return null;
    const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (weeklyHolidays.includes(parsed.getDay())) {
      return { type: 'weekly' as const, name: 'Hari Libur Rutin Mingguan' };
    }
    const special = specialHolidays.find((h) => h.date === date);
    if (special) return { type: 'special' as const, name: special.name };
    return null;
  }, [date, weeklyHolidays, specialHolidays]);

  const slotQuota = sessionQuotas[timeSlot] !== undefined ? sessionQuotas[timeSlot] : 3;
  const slotBooked = reservations.filter(
    (r) => r.date === date && r.timeSlot === timeSlot && r.status !== 'Cancelled'
  ).length;
  const spaceLeft = Math.max(0, slotQuota - slotBooked);

  const calculatePetPrice = (pet: DraftPet): number => {
    const base = packages.find((pkg) => pkg.name === pet.packageType)?.price || 0;
    const addOnTotal = pet.selectedAddOns.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return base + addOnTotal;
  };
  const grandTotal = pets.reduce((sum, p) => sum + calculatePetPrice(p), 0);

  const showError = (msg: string) => {
    setErrorText(msg);
    setTimeout(() => setErrorText(''), 6000);
  };

  // --- Phone lookup ---
  const handleOwnerPhoneChange = (val: string) => {
    setOwnerPhone(val);
    const digits = val.replace(/[^0-9]/g, '');
    if (digits.length >= 8) {
      const match = reservations.find((res) => {
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

  // --- Pet handlers ---
  const handleAddNewPet = () => {
    if (pets.length >= 10) {
      showError('Batas maksimal pendaftaran dalam satu reservasi adalah 10 ekor hewan peliharaan.');
      return;
    }
    setPets([...pets, createDraftPet(`draft-${Date.now()}`, packages, vaccineOptions)]);
  };

  const handleRemovePet = (id: string) => {
    if (pets.length <= 1) {
      showError('Minimal mendaftarkan 1 ekor hewan peliharaan.');
      return;
    }
    setPets(pets.filter((p) => p.id !== id));
  };

  const updatePetField = (id: string, field: keyof DraftPet, value: unknown) => {
    setPets((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleAddonToggleForPet = (petId: string, addonName: string, addonPrice: number) => {
    setPets((prev) =>
      prev.map((p) => {
        if (p.id !== petId) return p;
        const exists = p.selectedAddOns.find((item) => item.name === addonName);
        return {
          ...p,
          selectedAddOns: exists
            ? p.selectedAddOns.filter((item) => item.name !== addonName)
            : [...p.selectedAddOns, { name: addonName, price: addonPrice, quantity: 1 }],
        };
      })
    );
  };

  const handleAddonQtyForPet = (petId: string, addonName: string, change: number) => {
    setPets((prev) =>
      prev.map((p) =>
        p.id !== petId
          ? p
          : {
              ...p,
              selectedAddOns: p.selectedAddOns.map((item) =>
                item.name === addonName ? { ...item, quantity: Math.max(1, item.quantity + change) } : item
              ),
            }
      )
    );
  };

  // --- Wizard navigation ---
  const handleNextStep = () => {
    setErrorText('');
    if (currentStep === 0) {
      if (!ownerName.trim()) return showError('Mohon isi nama lengkap Anda.');
      if (!ownerPhone.trim()) return showError('Mohon isi nomor WhatsApp Anda.');
      if (!ownerAddress.trim()) return showError('Mohon isi alamat lengkap Anda.');
      if (!ownerEmail.trim()) return showError('Mohon isi alamat email aktif Anda.');
    } else if (currentStep === 1) {
      if (!date) return showError('Mohon pilih tanggal grooming.');
      if (selectedHoliday) return showError(`Toko libur pada tanggal tersebut (${selectedHoliday.name}). Silakan pilih tanggal operasional lain.`);
      if (slotQuota === 0) return showError(`Sesi jam operasional "${timeSlot}" saat ini ditutup.`);
      if (slotBooked >= slotQuota) {
        return showError(
          `Sesi jam operasional "${timeSlot}" pada tanggal ${date} sudah penuh (kuota maksimum ${slotQuota} ekor). Silakan pilih sesi atau hari lain.`
        );
      }
    } else if (currentStep === 2) {
      for (let i = 0; i < pets.length; i++) {
        if (!pets[i].petName.trim()) return showError(`Mohon lengkapi nama peliharaan untuk Peliharaan #${i + 1}.`);
        if (!pets[i].petBreed.trim()) return showError(`Mohon lengkapi ras / breed peliharaan untuk Peliharaan #${i + 1}.`);
      }
      if (pets.length > spaceLeft) {
        return showError(
          `Sesi "${timeSlot}" hanya memiliki sisa kuota ${spaceLeft} ekor lagi pada tanggal ${date}. Anda mencoba mendaftarkan ${pets.length} ekor. Silakan kurangi jumlah hewan atau pilih jadwal lain.`
        );
      }
    }
    setCurrentStep((prev) => Math.min(3, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackStep = () => {
    setErrorText('');
    setCurrentStep((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Submit ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!ownerName.trim()) return showError('Mohon isi nama lengkap Anda.');
    if (!ownerPhone.trim()) return showError('Mohon isi nomor WhatsApp Anda.');
    if (!date) return showError('Mohon pilih tanggal grooming.');
    if (selectedHoliday) return showError(`Toko libur pada tanggal tersebut (${selectedHoliday.name}). Silakan pilih tanggal operasional lain.`);
    if (slotQuota === 0) return showError(`Sesi jam operasional "${timeSlot}" saat ini ditutup.`);
    if (pets.length > spaceLeft) {
      return showError(
        `Sesi "${timeSlot}" hanya memiliki sisa kuota ${spaceLeft} ekor lagi pada tanggal ${date}. Anda mencoba mendaftarkan ${pets.length} ekor. Silakan kurangi jumlah hewan atau pilih jadwal lain.`
      );
    }
    for (let i = 0; i < pets.length; i++) {
      if (!pets[i].petName.trim()) return showError(`Mohon lengkapi nama peliharaan untuk Peliharaan #${i + 1}.`);
    }
    if (!isConsented) {
      return showError('Anda harus menyetujui "Format Persetujuan Tindakan Grooming" sebelum dapat mengirimkan form.');
    }
    if (!hasSignature) {
      return showError('Mohon berikan tanda tangan digital Anda pada area tanda tangan yang disediakan sebelum mengirim form.');
    }

    const newReservations: Reservation[] = pets.map((p) => {
      const pkgPrice = packages.find((pkg) => pkg.name === p.packageType)?.price || 0;
      const getPic = (sid: string) => stepPJPresets.find((pj) => pj.id === sid)?.defaultPic || '';
      const steps: GroomingStep[] = [
        { id: 'cek_umum', name: 'Step 1: Check Up Vet Umum', status: 'pending', pic: getPic('cek_umum') },
        { id: 'grooming_kering', name: 'Step 2: Treatment Kering', status: 'pending', pic: getPic('grooming_kering') },
        { id: 'grooming_basah', name: 'Step 3: Proses Mandi', status: 'pending', pic: getPic('grooming_basah') },
        { id: 'pengeringan', name: 'Step 4: Blowdry', status: 'pending', pic: getPic('pengeringan') },
        { id: 'pemeriksaan_ulang', name: 'Step 5: Re-check', status: 'pending', pic: getPic('pemeriksaan_ulang') },
      ];

      return {
        id: `res-mandiri-${Math.floor(1000 + Math.random() * 9000)}`,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerAddress: ownerAddress.trim() || 'Alamat tidak diinput (Mandiri)',
        ownerEmail: ownerEmail.trim() || 'customer@jeje-petshop.com',
        ownerCallPreference: ownerCallPreference.trim(),
        ownerProfession: ownerProfession.trim(),
        petName: p.petName.trim(),
        petType: p.petType,
        petBreed: p.petBreed.trim() || 'Domestik / Mix',
        petAge: p.petAge.trim() || 'Belum diketahui',
        petGender: p.petGender,
        petVaccine: p.petVaccine,
        healthNotes: p.healthNotes.trim() || '-',
        specialPreferences: p.specialPreferences.trim() || '-',
        packageType: p.packageType,
        basePrice: pkgPrice,
        price: calculatePetPrice(p),
        addOns: p.selectedAddOns,
        transportMode,
        pointsRedeemed: 0,
        discountApplied: 0,
        date,
        timeSlot,
        status: 'Waiting' as const,
        steps,
        notes: `Reservasi Mandiri Pemilik. Moda: ${transportMode}`,
        signatureData: signatureData || '',
        createdAt: new Date().toISOString(),
      };
    });

    saveReservations.mutate(newReservations, {
      onSuccess: () => {
        newReservations.forEach((res) => {
          addActivityLog.mutate({
            id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            staffName: session?.username || 'Pelanggan / Mandiri',
            role: session?.role || 'Reservasi Mandiri',
            action: 'Reservasi Portal Mandiri',
            timestamp: new Date().toISOString(),
            targetId: res.id,
            targetName: res.petName,
            details: `Registrasi mandiri oleh ${res.ownerName} untuk ${res.petName} (Paket: ${res.packageType}, Sesi: ${res.timeSlot})`,
          });
        });
        notifyPortalBooking(newReservations);
        setSubmitSuccess(true);
        setPortalPrefill(null);
        // Reset wizard
        setCurrentStep(0);
        setOwnerName('');
        setOwnerPhone('');
        setOwnerAddress('');
        setOwnerEmail('');
        setOwnerCallPreference('');
        setOwnerProfession('');
        setTransportMode('Antar Sendiri');
        setIsConsented(false);
        setSignatureData(undefined);
        setPets([createDraftPet('draft-1', packages, vaccineOptions)]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header portal */}
      <Card className="bg-gradient-to-br from-brand-900 to-brand-950 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <DoorOpen size={22} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Sistem Reservasi Mandiri</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-white/70">
              Daftarkan diri Anda beserta seluruh hewan peliharaan secara mandiri. Setiap hewan akan menjadi satu
              antrean reservasi tersendiri pada sesi yang dipilih.
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

      {/* Error banner */}
      {errorText && (
        <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300" id="portal-error">
          ⚠️ {errorText}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* STEP 1: DATA PEMILIK */}
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

        {/* STEP 2: JADWAL */}
        {currentStep === 1 && (
          <Card className="animate-slide-up">
            <SectionTitle>Jadwal & Transportasi</SectionTitle>

            {selectedHoliday && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                🚨 Toko libur pada tanggal tersebut ({selectedHoliday.name}). Silakan pilih tanggal operasional lain.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Moda Transportasi">
                <Select value={transportMode} onChange={(e) => setTransportMode(e.target.value)}>
                  {['Antar Sendiri', 'Pet Taxi', 'Pet Ojek', 'Lainnya'].map((mode) => (
                    <option key={mode} value={mode}>
                      {mode === 'Antar Sendiri' ? '🚗 Antar Sendiri (Gratis)' : `🚚 ${mode}`}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tanggal Grooming" required>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Pilih Sesi Waktu <span className="text-rose-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {availableSlots.map((slot) => {
                const quota = sessionQuotas[slot] !== undefined ? sessionQuotas[slot] : 3;
                const booked = reservations.filter(
                  (r) => r.date === date && r.timeSlot === slot && r.status !== 'Cancelled'
                ).length;
                const closed = quota === 0;
                const full = booked >= quota;
                const selected = slot === timeSlot;
                return (
                  <button
                    type="button"
                    key={slot}
                    disabled={closed || full}
                    onClick={() => setTimeSlot(slot)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                        : closed || full
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'
                          : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <span className="block font-mono text-[11px] font-bold">{slot}</span>
                    <span className={`mt-0.5 block text-[10px] ${selected ? 'text-white/80' : closed ? '' : 'text-slate-400'}`}>
                      {closed ? 'Tutup' : full ? 'Penuh' : `Sisa ${quota - booked} kuota`}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* STEP 3: DATA HEWAN */}
        {currentStep === 2 && (
          <div className="animate-slide-up space-y-4">
            {pets.map((pet, idx) => (
              <PetDraftCard
                key={pet.id}
                pet={pet}
                index={idx}
                packages={packages}
                addons={addons}
                vaccines={vaccineOptions}
                reservations={reservations}
                canRemove={pets.length > 1}
                onChange={updatePetField}
                onToggleAddon={handleAddonToggleForPet}
                onAddonQty={handleAddonQtyForPet}
                onRemove={handleRemovePet}
              />
            ))}
            <button
              type="button"
              onClick={handleAddNewPet}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500 transition-colors hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
            >
              <Plus size={16} />
              Tambah Hewan Lain (maks. 10)
            </button>
          </div>
        )}

        {/* STEP 4: REVIEW & TTD */}
        {currentStep === 3 && (
          <div className="animate-slide-up space-y-6">
            {/* Informed Consent */}
            <Card className="border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/15">
              <SectionTitle>
                <span className="text-amber-700 dark:text-amber-400">📋 Format Persetujuan Tindakan Grooming (Informed Consent)</span>
              </SectionTitle>
              <p className="mb-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                Demi kelancaran, keselamatan, dan perlindungan hukum bersama antara Pemilik Hewan dengan seluruh staf dan
                praktisi dokter hewan <strong>Jeje Pet Care</strong>, mohon pelajari poin-poin kesepakatan di bawah ini
                secara saksama:
              </p>
              <div className="custom-scrollbar max-h-64 space-y-2.5 overflow-y-auto rounded-xl border border-amber-200 bg-white/90 p-3.5 text-[10px] leading-relaxed text-slate-600 dark:border-amber-900 dark:bg-slate-900/90 dark:text-slate-300">
                {CONSENT_CLAUSES.map((clause) => (
                  <div key={clause.title}>
                    <span className="block font-bold text-amber-900 dark:text-amber-400">{clause.title}</span>
                    <p>{clause.body}</p>
                  </div>
                ))}
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

            {/* Review summary */}
            <Card>
              <SectionTitle>Resume Pengajuan Reservasi</SectionTitle>
              <div className="space-y-3 text-xs">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <ReviewItem label="Nama Lengkap" value={ownerName || '—'} required />
                    <ReviewItem label="No. WhatsApp" value={ownerPhone || '—'} required mono />
                    <ReviewItem label="Rencana Tanggal" value={`${formatDayDateID(date)} @ ${timeSlot}`} mono />
                    <ReviewItem label="Transportasi" value={transportMode === 'Antar Sendiri' ? 'Antar Sendiri (Gratis)' : `${transportMode} (konfirmasi via WA)`} />
                  </div>
                </div>
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                    🐾 Rincian Layanan & Hewan ({pets.length}):
                  </p>
                  {pets.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                      <span className="min-w-0 text-[11px] text-slate-700 dark:text-slate-200">
                        <strong>
                          {idx + 1}. {p.petName || '—'}
                        </strong>{' '}
                        ({p.petType} {p.petBreed}) — {p.packageType}
                        {p.selectedAddOns.length > 0 && (
                          <span className="text-slate-400"> + {p.selectedAddOns.length} add-on</span>
                        )}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-brand-700 dark:text-brand-300">
                        {formatRupiah(calculatePetPrice(p))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-white dark:bg-slate-950">
                  <span className="text-xs font-bold">Total Estimasi Kolektif:</span>
                  <span className="font-mono text-base font-bold text-brand-300">{formatRupiah(grandTotal)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Navigasi wizard */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={handleBackStep} disabled={currentStep === 0}>
            ← Kembali
          </Button>
          {currentStep < 3 ? (
            <Button type="button" onClick={handleNextStep}>
              Lanjut →
            </Button>
          ) : (
            <Button type="submit" variant="success" disabled={saveReservations.isPending}>
              <CheckCircle2 size={15} />
              Kirim Reservasi
            </Button>
          )}
        </div>
      </form>

      {/* Success overlay */}
      {submitSuccess && (
        <div className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border-2 border-emerald-500 bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60">
              <PartyPopper size={32} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-display text-base font-bold tracking-tight text-emerald-700 uppercase dark:text-emerald-400">
              Data Berhasil Di-Input
            </h3>
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs leading-relaxed font-bold text-slate-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-slate-200">
              Data reservasi telah berhasil di-input dan diterima! Notifikasi WhatsApp simulasi telah dikirim. Silakan
              hubungi admin untuk konfirmasi data lebih lanjut.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Badge tone="brand">Status: Waiting</Badge>
              <Badge tone="emerald">5-Step Pipeline Siap</Badge>
            </div>
            <Button variant="success" size="sm" className="mt-5" onClick={() => setSubmitSuccess(false)}>
              Selesai
            </Button>
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
      <span className={`block text-[11px] font-bold ${empty && required ? 'text-rose-500 italic' : 'text-slate-800 dark:text-slate-100'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}