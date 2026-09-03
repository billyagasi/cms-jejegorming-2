import { useState, useEffect, useMemo } from 'react';
import { Calendar, Contact, Heart, Sparkles, Truck, Award, Minus, Plus, Save } from 'lucide-react';
import { Reservation, PetType, GroomingStep } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { SectionTitle } from '../../components/ui/Section';
import SignaturePad from '../../components/common/SignaturePad';
import { useAppConfig, useReservations } from '../../data-layer/hooks';
import { pushToast } from '../../components/ui/toastStore';
import { formatRupiah, todayISO } from '../../lib/format';

interface AddEditReservationModalProps {
  isOpen: boolean;
  /** null = mode buat baru, object = mode edit / prefill */
  reservation: Reservation | null;
  prefillDate?: string;
  prefillSlot?: string;
  onClose: () => void;
  onSave: (res: Reservation) => void;
}

export default function AddEditReservationModal({
  isOpen,
  reservation,
  prefillDate,
  prefillSlot,
  onClose,
  onSave,
}: AddEditReservationModalProps) {
  const { data: config } = useAppConfig();
  const { data: allReservations = [] } = useReservations();

  const packages = config?.packages?.length ? config.packages : [];
  const addons = config?.addons?.length ? config.addons : [];
  const vaccineOptions = config?.vaccinePresets?.length ? config.vaccinePresets : ['belum vaksin'];
  const stepPJPresets = config?.stepPJPresets ?? [];
  const sessionQuotas = config?.sessionQuotas ?? {};
  const weeklyHolidays = config?.weeklyHolidays ?? [];
  const specialHolidays = config?.specialHolidays ?? [];
  const loyalty = config?.loyalty ?? { minSpend: 10000, pointValue: 500, minRedeem: 5 };

  const availableSlots = useMemo(
    () =>
      Object.keys(sessionQuotas).length > 0
        ? Object.keys(sessionQuotas).sort((a, b) => a.localeCompare(b))
        : ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00 (Istirahat)', '12:00 - 13:00'],
    [sessionQuotas]
  );

  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<PetType>('Kucing');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petVaccine, setPetVaccine] = useState('');
  const [petGender, setPetGender] = useState('Jantan');
  const [healthNotes, setHealthNotes] = useState('');
  const [specialPreferences, setSpecialPreferences] = useState('');

  const [packageType, setPackageType] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<{ name: string; price: number; quantity: number }[]>([]);
  const [transportMode, setTransportMode] = useState('Antar Sendiri');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('09:00 - 10:00');
  const [notes, setNotes] = useState('');
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [signatureData, setSignatureData] = useState<string | undefined>(undefined);

  // Riwayat booking Completed milik pemilik (untuk loyalitas)
  const completedBookings = useMemo(
    () =>
      allReservations.filter(
        (res) =>
          res.ownerPhone.trim() === ownerPhone.trim() &&
          ownerPhone.trim() !== '' &&
          res.status === 'Completed' &&
          res.id !== reservation?.id
      ),
    [allReservations, ownerPhone, reservation?.id]
  );

  const availablePoints = useMemo(() => {
    const earned = completedBookings.reduce((sum, res) => sum + Math.floor(res.price / loyalty.minSpend), 0);
    const redeemed = completedBookings.reduce((sum, res) => sum + (res.pointsRedeemed || 0), 0);
    return Math.max(0, earned - redeemed);
  }, [completedBookings, loyalty.minSpend]);

  // Populate field saat modal dibuka / berpindah reservation
  useEffect(() => {
    if (!isOpen) return;
    if (reservation) {
      setPetName(reservation.petName || '');
      setPetType(reservation.petType || 'Kucing');
      setPetBreed(reservation.petBreed || '');
      setPetAge(reservation.petAge || '');
      setPetVaccine(reservation.petVaccine || vaccineOptions[0] || '');
      setPetGender(reservation.petGender || 'Jantan');
      setHealthNotes(reservation.healthNotes || '');
      setSpecialPreferences(reservation.specialPreferences || '');
      setOwnerName(reservation.ownerName || '');
      setOwnerPhone(reservation.ownerPhone || '');
      setOwnerAddress(reservation.ownerAddress || '');
      setOwnerEmail(reservation.ownerEmail || '');
      setNotes(reservation.notes || '');
      setTransportMode(reservation.transportMode || 'Antar Sendiri');
      if (reservation.id) {
        setPackageType(reservation.packageType);
        setBasePrice(reservation.basePrice ?? packages.find((p) => p.name === reservation.packageType)?.price ?? 65000);
        setSelectedAddOns(reservation.addOns || []);
        setDate(reservation.date);
        setTimeSlot(reservation.timeSlot);
        setPointsRedeemed(reservation.pointsRedeemed || 0);
        setSignatureData(reservation.signatureData);
      } else {
        const pkg = packages[0];
        setPackageType(pkg?.name || '');
        setBasePrice(pkg?.price ?? 0);
        setSelectedAddOns([]);
        setDate(prefillDate || reservation.date || todayISO());
        setTimeSlot(prefillSlot || reservation.timeSlot || availableSlots[0] || '09:00 - 10:00');
        setPointsRedeemed(0);
        setSignatureData(undefined);
      }
    } else {
      const pkg = packages[0];
      setPetName('');
      setPetType('Kucing');
      setPetBreed('');
      setPetAge('');
      setPetVaccine(vaccineOptions[0] || '');
      setPetGender('Jantan');
      setHealthNotes('');
      setSpecialPreferences('');
      setOwnerName('');
      setOwnerPhone('');
      setOwnerAddress('');
      setOwnerEmail('');
      setPackageType(pkg?.name || '');
      setBasePrice(pkg?.price ?? 0);
      setSelectedAddOns([]);
      setTransportMode('Antar Sendiri');
      setDate(prefillDate || todayISO());
      setTimeSlot(prefillSlot || availableSlots[0] || '09:00 - 10:00');
      setNotes('');
      setPointsRedeemed(0);
      setSignatureData(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reservation, prefillDate, prefillSlot]);

  const handleOwnerPhoneChange = (val: string) => {
    setOwnerPhone(val);
    const digits = val.replace(/[^0-9]/g, '');
    if (digits.length >= 8) {
      const match = allReservations.find((res) => {
        const resDigits = (res.ownerPhone || '').replace(/[^0-9]/g, '');
        return resDigits.startsWith(digits) || (resDigits.length >= 8 && digits.startsWith(resDigits.substring(0, 8)));
      });
      if (match) {
        setOwnerName(match.ownerName || '');
        setOwnerAddress(match.ownerAddress !== 'Belum diisi' ? match.ownerAddress || '' : '');
        setOwnerEmail(match.ownerEmail !== 'Belum diisi' ? match.ownerEmail || '' : '');
        setOwnerPhone(match.ownerPhone || '');
        if (match.signatureData) setSignatureData(match.signatureData);
      }
    }
  };

  const handlePetNameChange = (val: string) => {
    setPetName(val);
    if (val.trim()) {
      const match = allReservations.find(
        (res) => res.petName && res.petName.trim().toLowerCase() === val.trim().toLowerCase()
      );
      if (match) {
        setPetType(match.petType || 'Kucing');
        setPetBreed(match.petBreed || '');
        setPetGender(match.petGender || 'Jantan');
      }
    }
  };

  const handlePackageChange = (pName: string) => {
    setPackageType(pName);
    const selected = packages.find((p) => p.name === pName);
    if (selected) setBasePrice(selected.price);
  };

  const handleAddOnToggle = (addonName: string, addonPrice: number) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((item) => item.name === addonName);
      if (exists) return prev.filter((item) => item.name !== addonName);
      return [...prev, { name: addonName, price: addonPrice, quantity: 1 }];
    });
  };

  const handleAddOnQty = (addonName: string, change: number) => {
    setSelectedAddOns((prev) =>
      prev.map((item) => (item.name === addonName ? { ...item, quantity: Math.max(1, item.quantity + change) } : item))
    );
  };

  const totalAddOnsCost = selectedAddOns.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountFromPoints = pointsRedeemed * loyalty.pointValue;
  const finalPrice = Math.max(0, basePrice + totalAddOnsCost - discountFromPoints);

  const validateBooking = (): string | null => {
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (weeklyHolidays.includes(parsed.getDay())) {
          return `Tanggal ${date} adalah Hari Libur Rutin Mingguan.`;
        }
        const special = specialHolidays.find((h) => h.date === date);
        if (special) return `Tanggal ${date} adalah Libur Khusus/Nasional (${special.name}).`;
      }
    }
    if (date && timeSlot) {
      const limit = sessionQuotas[timeSlot] !== undefined ? sessionQuotas[timeSlot] : 3;
      if (limit === 0) return `Sesi "${timeSlot}" saat ini dinonaktifkan/ditutup.`;
      const booked = allReservations.filter(
        (r) => r.date === date && r.timeSlot === timeSlot && r.status !== 'Cancelled' && (!reservation || r.id !== reservation.id)
      ).length;
      if (booked >= limit) return `Sesi "${timeSlot}" pada tanggal ${date} sudah penuh (kuota maksimum ${limit} ekor).`;
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateBooking();
    if (validationError) {
      pushToast({ tone: 'error', title: 'Validasi Gagal', message: validationError });
      return;
    }

    let steps: GroomingStep[];
    let finalStatus = reservation ? reservation.status : 'Waiting';

    if (reservation) {
      if (reservation.status === 'Cancelled') {
        finalStatus = 'Waiting';
        steps = reservation.steps.map((step) => ({ ...step, status: 'pending' as const }));
      } else {
        steps = [...reservation.steps];
      }
    } else {
      const getPic = (sid: string) => stepPJPresets.find((p) => p.id === sid)?.defaultPic || '';
      steps = [
        { id: 'cek_umum', name: 'Step 1: Check Up Vet Umum', status: 'pending', pic: getPic('cek_umum') },
        { id: 'grooming_kering', name: 'Step 2: Treatment Kering', status: 'pending', pic: getPic('grooming_kering') },
        { id: 'grooming_basah', name: 'Step 3: Proses Mandi', status: 'pending', pic: getPic('grooming_basah') },
        { id: 'pengeringan', name: 'Step 4: Blowdry', status: 'pending', pic: getPic('pengeringan') },
        { id: 'pemeriksaan_ulang', name: 'Step 5: Re-check', status: 'pending', pic: getPic('pemeriksaan_ulang') },
      ];
    }

    const payload: Reservation = {
      id: reservation?.id || `res-${Math.floor(1000 + Math.random() * 9000)}`,
      ownerName,
      ownerPhone,
      ownerAddress,
      ownerEmail,
      petName,
      petType,
      petBreed,
      petAge,
      petVaccine,
      petGender,
      healthNotes: healthNotes.trim() || '-',
      specialPreferences: specialPreferences.trim() || '-',
      packageType,
      basePrice,
      price: finalPrice,
      addOns: selectedAddOns,
      transportMode,
      pointsRedeemed,
      discountApplied: discountFromPoints,
      date,
      timeSlot,
      status: finalStatus,
      steps,
      notes,
      ...(reservation?.resume ? { resume: reservation.resume } : {}),
      ...(reservation?.photoUrl ? { photoUrl: reservation.photoUrl } : {}),
      ...(reservation?.photos ? { photos: reservation.photos } : {}),
      signatureData,
      createdAt: reservation?.id ? reservation.createdAt : new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={reservation ? 'Edit Reservasi' : 'Setup Reservasi Manual'}
      subtitle="Lengkapi & kelola parameter reservasi grooming hewan"
      icon={<Calendar size={18} />}
      size="lg"
      bodyClassName="bg-slate-50 dark:bg-slate-950/40"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
            Total:{' '}
            <span className="font-mono text-brand-700 dark:text-brand-300">{formatRupiah(finalPrice)}</span>
          </div>
          <Button type="submit" form="add-edit-res-form" size="sm">
            <Save size={14} />
            Simpan Reservasi
          </Button>
        </div>
      }
    >
      <form id="add-edit-res-form" onSubmit={handleSubmit} className="space-y-5">
        {/* DATA KONTAK PEMILIK */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <Contact size={13} /> Data Kontak Pemilik
            </span>
          </SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nama Pemilik" required>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Contoh: Kak Joni, Ibu Santi" required />
            </Field>
            <Field label="No. WhatsApp Pemilik" required hint="≥ 8 digit: data pemilik & tanda tangan terisi otomatis dari riwayat">
              <Input
                type="tel"
                value={ownerPhone}
                onChange={(e) => handleOwnerPhoneChange(e.target.value)}
                placeholder="Contoh: 081234567890"
                required
              />
            </Field>
            <Field label="Email Pemilik">
              <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="pemilik@gmail.com" />
            </Field>
            <Field label="Alamat Pemilik">
              <Input value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} placeholder="Contoh: Jl. Sudirman No 25" />
            </Field>
          </div>
        </div>

        {/* DETAIL HEWAN */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <SectionTitle>
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <Heart size={13} /> Detail Data Hewan Peliharaan
            </span>
          </SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nama Peliharaan" required hint="Nama yang pernah terdaftar: data hewan terisi otomatis">
              <Input value={petName} onChange={(e) => handlePetNameChange(e.target.value)} placeholder="Contoh: Milo, Chiko, Rocky" required />
            </Field>
            <Field label="Jenis Hewan" required>
              <Select value={petType} onChange={(e) => setPetType(e.target.value as PetType)}>
                <option value="Kucing">🐱 Kucing</option>
                <option value="Anjing">🐶 Anjing</option>
                <option value="Kelinci">🐰 Kelinci</option>
                <option value="Lainnya">🐾 Lainnya</option>
              </Select>
            </Field>
            <Field label="Ras / Breed" required>
              <Input value={petBreed} onChange={(e) => setPetBreed(e.target.value)} placeholder="Contoh: Persia Peaknose" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Usia">
                <Input value={petAge} onChange={(e) => setPetAge(e.target.value)} placeholder="cth. 2 Tahun" />
              </Field>
              <Field label="Jenis Kelamin">
                <Select value={petGender} onChange={(e) => setPetGender(e.target.value)}>
                  <option>Jantan</option>
                  <option>Betina</option>
                </Select>
              </Field>
            </div>
            <Field label="Riwayat Vaksin">
              <Select value={petVaccine} onChange={(e) => setPetVaccine(e.target.value)}>
                {vaccineOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Catatan Kesehatan / Alergi">
              <Textarea value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} placeholder="Alergi, kondisi kulit, catatan medis…" rows={2} />
            </Field>
            <Field label="Preferensi Khusus" className="md:col-span-2">
              <Input value={specialPreferences} onChange={(e) => setSpecialPreferences(e.target.value)} placeholder="Model potongan, produk khusus, dll." />
            </Field>
          </div>
        </div>

        {/* PAKET & ADD-ONS */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <SectionTitle>
            <span className="inline-flex items-center gap-1">
              <Sparkles size={13} /> Paket Utama & Add-Ons
            </span>
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Paket Grooming" required>
              <Select value={packageType} onChange={(e) => handlePackageChange(e.target.value)} required>
                <option value="" disabled>
                  Pilih paket…
                </option>
                {packages.map((pkg) => (
                  <option key={pkg.name} value={pkg.name}>
                    {pkg.name} — {formatRupiah(pkg.price)}
                  </option>
                ))}
              </Select>
              {packageType && (
                <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                  {packages.find((p) => p.name === packageType)?.desc}
                </p>
              )}
            </Field>
            <Field label="Layanan Tambahan (Add-Ons)">
              <div className="space-y-1.5">
                {addons.map((addon) => {
                  const selected = selectedAddOns.find((item) => item.name === addon.name);
                  return (
                    <div
                      key={addon.name}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                        selected
                          ? 'border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleAddOnToggle(addon.name, addon.price)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {selected && <span className="text-[9px] text-white">✓</span>}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{addon.name}</span>
                          <span className="block text-[10px] text-slate-400">{formatRupiah(addon.price)}</span>
                        </span>
                      </button>
                      {selected && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAddOnQty(addon.name, -1)}
                            className="rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-5 text-center font-mono text-xs font-bold">{selected.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleAddOnQty(addon.name, 1)}
                            className="rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {addons.length === 0 && <p className="text-xs text-slate-400">Belum ada add-on terdaftar.</p>}
              </div>
            </Field>
          </div>
        </div>

        {/* TRANSPORT & JADWAL */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <SectionTitle>
            <span className="inline-flex items-center gap-1">
              <Truck size={13} /> Moda Transportasi & Jadwal
            </span>
          </SectionTitle>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal Booking" required>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Sesi Waktu" required>
                <Select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                      {(sessionQuotas[slot] ?? 3) === 0 ? ' (Tutup)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </div>

        {/* LOYALITAS */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <SectionTitle>
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <Award size={13} /> Program Loyalitas Pelanggan
            </span>
          </SectionTitle>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="amber">{availablePoints} Poin Tersedia</Badge>
              <span className="text-[11px] text-slate-500">
                (1 poin = {formatRupiah(loyalty.pointValue)} diskon · min. belanja {formatRupiah(loyalty.minSpend)} / poin)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPointsRedeemed((p) => Math.max(0, p - 1))}
                disabled={pointsRedeemed <= 0}
                className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700"
              >
                <Minus size={13} />
              </button>
              <span className="min-w-14 text-center font-mono text-sm font-bold text-amber-700 dark:text-amber-400">
                {pointsRedeemed} P
              </span>
              <button
                type="button"
                onClick={() => setPointsRedeemed((p) => Math.min(availablePoints, p + 1))}
                disabled={pointsRedeemed >= availablePoints}
                className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* TANDA TANGAN KOLEKTIF */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <Contact size={13} /> Tanda Tangan Kolektif
            </span>
          </SectionTitle>
          <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 text-[11px] leading-relaxed text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <strong>Fitur Tanda Tangan Kolektif Aktif</strong> — satu tanda tangan dipakai untuk semua hewan yang
            didaftarkan pemilik pada hari yang sama. Tanda tangan otomatis terisi bila nomor WhatsApp sudah pernah
            terdaftar.
          </div>
          <SignaturePad
            value={signatureData}
            onChange={setSignatureData}
            label="TANDA TANGAN DIGITAL PEMILIK"
            required
            height={140}
          />
        </div>

        <Field label="Catatan Reservasi">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan untuk staf…" rows={2} />
        </Field>
      </form>
    </Modal>
  );
}