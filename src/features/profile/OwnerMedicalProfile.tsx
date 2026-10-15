import { useMemo, useState } from 'react';
import { BookOpen, Search, ChevronDown, PawPrint, FileDown, CreditCard, FileSignature, Trash2, Plus, HeartPulse, Syringe, BellRing } from 'lucide-react';
import jsPDF from 'jspdf';
import { Reservation, Appointment, Surgery, VaccinationRecord, ClinicalFollowUp } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useReservations, useAppointments, useSaveReservation, useAppConfig, useSurgeries, useVaccinations, useClinicalFollowUps } from '../../data-layer/hooks';
import { formatRupiah, formatDayDateID, todayISO } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';
import { parsePhotoUrls } from '../../lib/format';

interface OwnerMedicalProfileProps {
  onOpenResume: (res: Reservation) => void;
  onOpenEditReservation: (res: Reservation | null) => void;
}

interface GroupedPet {
  petName: string;
  petType: string;
  petBreed: string;
  history: Reservation[];
  /** Riwayat appointment klinik (gabung di timeline) */
  apptHistory: Appointment[];
  surgeries: Surgery[];
  vaccinations: VaccinationRecord[];
  followUps: ClinicalFollowUp[];
}

interface GroupedOwner {
  ownerName: string;
  ownerPhone: string;
  ownerAddress?: string;
  ownerEmail?: string;
  pets: GroupedPet[];
}

type TimelineEntry = {
  kind: 'grooming' | 'appointment' | 'surgery' | 'vaccination' | 'followup';
  date: string;
  res?: Reservation;
  appt?: Appointment;
  surgery?: Surgery;
  vaccination?: VaccinationRecord;
  followUp?: ClinicalFollowUp;
};

export default function OwnerMedicalProfile({ onOpenResume, onOpenEditReservation }: OwnerMedicalProfileProps) {
  const { data: reservations = [] } = useReservations();
  const { data: appointments = [] } = useAppointments();
  const { data: surgeries = [] } = useSurgeries();
  const { data: vaccinations = [] } = useVaccinations();
  const { data: followUps = [] } = useClinicalFollowUps();
  const saveReservation = useSaveReservation();
  const { data: config } = useAppConfig();
  const loyalty = config?.loyalty ?? { minSpend: 10000, pointValue: 500, minRedeem: 5 };

  const [search, setSearch] = useState('');
  const [expandedOwner, setExpandedOwner] = useState('');
  const [expandedPet, setExpandedPet] = useState('');
  const [membershipOwner, setMembershipOwner] = useState<GroupedOwner | null>(null);
  const [consentRes, setConsentRes] = useState<Reservation | null>(null);
  const [deleteRes, setDeleteRes] = useState<Reservation | null>(null);

  // Grouping owner → pet → history (paritas OwnerMedicalProfile lama)
  const groups = useMemo(() => {
    const ownerMap = new Map<string, GroupedOwner>();
    reservations.forEach((r) => {
      const key = r.ownerPhone.trim();
      if (!ownerMap.has(key)) {
        ownerMap.set(key, {
          ownerName: r.ownerName,
          ownerPhone: r.ownerPhone,
          ownerAddress: r.ownerAddress,
          ownerEmail: r.ownerEmail,
          pets: [],
        });
      }
      const owner = ownerMap.get(key)!;
      let pet = owner.pets.find((p) => p.petName.toLowerCase() === r.petName.toLowerCase());
      if (!pet) {
        pet = { petName: r.petName, petType: r.petType, petBreed: r.petBreed, history: [], apptHistory: [], surgeries: [], vaccinations: [], followUps: [] };
        owner.pets.push(pet);
      }
      pet.history.push(r);
    });
    // Riwayat appointment klinik masuk ke timeline hewan yang sama
    appointments.forEach((appt) => {
      const ownerKey = appt.ownerPhone.trim();
      let owner = ownerMap.get(ownerKey);
      if (!owner) {
        owner = { ownerName: appt.ownerName, ownerPhone: appt.ownerPhone, ownerAddress: appt.ownerAddress, ownerEmail: appt.ownerEmail, pets: [] };
        ownerMap.set(ownerKey, owner);
      }
      appt.pets.forEach((p) => {
        let pet = owner.pets.find((x) => x.petName.toLowerCase() === p.petName.toLowerCase());
        if (!pet) {
          pet = { petName: p.petName, petType: p.petType, petBreed: p.petBreed, history: [], apptHistory: [], surgeries: [], vaccinations: [], followUps: [] };
          owner.pets.push(pet);
        }
        pet.apptHistory.push(appt);
      });
    });
    const ensureClinicalPet = (patient: { ownerPhone: string; ownerName: string; petName: string; petType: string; petBreed?: string }): GroupedPet => {
        const ownerKey = patient.ownerPhone.trim();
        let owner = ownerMap.get(ownerKey);
        if (!owner) {
          owner = { ownerName: patient.ownerName, ownerPhone: patient.ownerPhone, pets: [] };
          ownerMap.set(ownerKey, owner);
        }
        let pet = owner.pets.find((entry) => entry.petName.toLowerCase() === patient.petName.toLowerCase());
        if (!pet) {
          pet = { petName: patient.petName, petType: patient.petType, petBreed: patient.petBreed || '-', history: [], apptHistory: [], surgeries: [], vaccinations: [], followUps: [] };
          owner.pets.push(pet);
        }
        return pet;
    };
    surgeries.forEach((item) => ensureClinicalPet(item.patient).surgeries.push(item));
    vaccinations.forEach((item) => ensureClinicalPet(item.patient).vaccinations.push(item));
    followUps.forEach((item) => ensureClinicalPet(item.patient).followUps.push(item));
    // history terbaru dulu
    ownerMap.forEach((o) =>
      o.pets.forEach((p) => {
        p.history.sort((a, b) => b.date.localeCompare(a.date));
        p.apptHistory.sort((a, b) => b.date.localeCompare(a.date));
        p.surgeries.sort((a, b) => b.date.localeCompare(a.date));
        p.vaccinations.sort((a, b) => b.givenDate.localeCompare(a.givenDate));
        p.followUps.sort((a, b) => b.followUpDate.localeCompare(a.followUpDate));
      })
    );
    const q = search.toLowerCase();
    return Array.from(ownerMap.values()).filter(
      (o) => !q || o.ownerName.toLowerCase().includes(q) || o.ownerPhone.includes(q) || o.pets.some((p) => p.petName.toLowerCase().includes(q))
    );
  }, [reservations, appointments, surgeries, vaccinations, followUps, search]);

  /** Timeline gabungan grooming + appointment, terurut tanggal desc */
  const timelineFor = (pet: GroupedPet): TimelineEntry[] => {
    const items: TimelineEntry[] = [
      ...pet.history.map((r) => ({ kind: 'grooming' as const, date: r.date, res: r })),
      ...pet.apptHistory.map((a) => ({ kind: 'appointment' as const, date: a.date, appt: a })),
      ...pet.surgeries.map((surgery) => ({ kind: 'surgery' as const, date: surgery.date, surgery })),
      ...pet.vaccinations.map((vaccination) => ({ kind: 'vaccination' as const, date: vaccination.givenDate, vaccination })),
      ...pet.followUps.map((followUp) => ({ kind: 'followup' as const, date: followUp.followUpDate, followUp })),
    ];
    return items.sort((a, b) => b.date.localeCompare(a.date));
  };

  const totalAppts = appointments.length;

  const loyaltyForOwner = (owner: GroupedOwner) => {
    const completed = owner.pets.flatMap((p) => p.history).filter((r) => r.status === 'Completed');
    const earned = completed.reduce((s, r) => s + Math.floor(r.price / loyalty.minSpend), 0);
    const redeemed = completed.reduce((s, r) => s + (r.pointsRedeemed || 0), 0);
    return { earned, redeemed, balance: Math.max(0, earned - redeemed) };
  };

  const exportOwnerPdf = (owner: GroupedOwner) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`REKAM MEDIS & PROFIL — ${owner.ownerName}`, 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${owner.ownerPhone} • ${owner.ownerAddress || '-'}`, 14, y);
    y += 10;
    owner.pets.forEach((pet) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${pet.petName} (${pet.petType} — ${pet.petBreed})`, 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      timelineFor(pet).forEach((entry) => {
        let line = '';
        if (entry.kind === 'grooming' && entry.res) {
          const r = entry.res;
          line = `[GROOMING] ${r.date} ${r.timeSlot} — ${r.packageType} [${r.status}] ${r.resume ? `| ${r.resume.groomingNotes}` : ''}`;
        } else if (entry.appt) {
          const a = entry.appt;
          const petAppt = a.pets.find((x) => x.petName.toLowerCase() === pet.petName.toLowerCase());
          const bill = a.billClosed ? `Bill LUNAS (${a.payment?.method})` : 'Bill belum ditutup';
          line = `[KLINIK] ${a.date} ${a.timeSlot} — ${a.doctorName || '-'} | ${petAppt?.reasons.join(', ') || '-'} | ${petAppt?.diagnosis || 'Belum ada diagnosis'} | ${bill}`;
        } else if (entry.surgery) {
          line = `[OPERASI] ${entry.surgery.date} — ${entry.surgery.procedureName} | ${entry.surgery.surgeonName} | ${entry.surgery.status}`;
        } else if (entry.vaccination) {
          line = `[VAKSIN] ${entry.vaccination.givenDate} — ${entry.vaccination.vaccineName} | Batch ${entry.vaccination.batchNumber || '-'} | Booster ${entry.vaccination.nextDueDate || '-'}`;
        } else if (entry.followUp) {
          line = `[FOLLOW-UP] ${entry.followUp.followUpDate} — ${entry.followUp.sourceType} | ${entry.followUp.status} | ${entry.followUp.recommendedAction}`;
        }
        const wrapped = doc.splitTextToSize(`• ${line}`, 182);
        doc.text(wrapped, 14, y);
        y += wrapped.length * 4.4 + 1.5;
      });
      y += 4;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save(`Rekam_Medis_${owner.ownerName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <BookOpen size={15} className="text-brand-600" />
              Rekam Medis & Profil Pelanggan
            </h3>
            <p className="text-[11px] text-slate-500">
              {groups.length} pemilik terdaftar • {reservations.length} sesi grooming • {totalAppts} riwayat appointment klinik
            </p>
          </div>
          <div className="relative w-72">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-9 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Cari pemilik / hewan / no WA…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <EmptyState icon={<PawPrint size={22} />} title="Belum ada data pelanggan" description="Data pemilik & hewan muncul otomatis dari reservasi yang dibuat." />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((owner) => {
            const ownerKey = owner.ownerPhone;
            const isOpen = expandedOwner === ownerKey;
            const loyalty = loyaltyForOwner(owner);
            return (
              <Card key={ownerKey} hover>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" onClick={() => setExpandedOwner(isOpen ? '' : ownerKey)}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg dark:bg-brand-950/60">
                      🧑‍⚕️
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">{owner.ownerName}</span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {owner.ownerPhone} • {owner.pets.length} hewan • {owner.pets.reduce((s, p) => s + p.history.length, 0)} sesi
                      </span>
                    </span>
                    <ChevronDown size={16} className={`ml-auto text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => setMembershipOwner(owner)}>
                      <CreditCard size={13} /> Membership
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => exportOwnerPdf(owner)}>
                      <FileDown size={13} /> PDF
                    </Button>
                    <Button size="sm" onClick={() => onOpenEditReservation(null)}>
                      <Plus size={13} /> Booking
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="animate-fade-in mt-4 space-y-3 border-t border-dashed border-slate-200 pt-4 dark:border-slate-800">
                    {owner.pets.map((pet) => {
                      const petKey = `${ownerKey}-${pet.petName}`;
                      const petOpen = expandedPet === petKey;
                      const latest = pet.history[0];
                      return (
                        <div key={petKey} className="rounded-xl border border-slate-200 dark:border-slate-800">
                          <button
                            className="flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left"
                            onClick={() => setExpandedPet(petOpen ? '' : petKey)}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-base">{pet.petType === 'Kucing' ? '🐱' : pet.petType === 'Anjing' ? '🐶' : '🐾'}</span>
                              <span>
                                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                                  {pet.petName} <span className="font-normal text-slate-400">({pet.petBreed})</span>
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  {pet.history.length} grooming • {pet.apptHistory.length} appointment • {pet.surgeries.length} operasi • {pet.vaccinations.length} vaksin
                                </span>
                              </span>
                            </span>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${petOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {petOpen && (
                            <div className="space-y-2.5 border-t border-slate-100 p-3 dark:border-slate-800">
                              {timelineFor(pet).map((entry) =>
                                entry.kind === 'surgery' && entry.surgery ? <ClinicalEventCard key={`s-${entry.surgery.id}`} tone="rose" icon={<HeartPulse size={14} />} label="Operasi" date={entry.surgery.date} title={entry.surgery.procedureName} status={entry.surgery.status} detail={`${entry.surgery.surgeonName}${entry.surgery.preOpDiagnosis ? ` • ${entry.surgery.preOpDiagnosis}` : ''}`} />
                                : entry.kind === 'vaccination' && entry.vaccination ? <ClinicalEventCard key={`v-${entry.vaccination.id}`} tone="emerald" icon={<Syringe size={14} />} label="Vaksinasi" date={entry.vaccination.givenDate} title={entry.vaccination.vaccineName} status={entry.vaccination.status} detail={`Dokter ${entry.vaccination.veterinarianName} • Batch ${entry.vaccination.batchNumber || '-'}${entry.vaccination.nextDueDate ? ` • Booster ${formatDayDateID(entry.vaccination.nextDueDate)}` : ''}`} />
                                : entry.kind === 'followup' && entry.followUp ? <ClinicalEventCard key={`f-${entry.followUp.id}`} tone="amber" icon={<BellRing size={14} />} label="Follow-up" date={entry.followUp.followUpDate} title={entry.followUp.sourceType} status={entry.followUp.status} detail={entry.followUp.recommendedAction} />
                                : entry.kind === 'appointment' && entry.appt ? (() => {
                                  const appt = entry.appt;
                                  const petAppt = appt.pets.find((x) => x.petName.toLowerCase() === pet.petName.toLowerCase()) || appt.pets[0];
                                  const billTotalAppt = petAppt.treatments.reduce((s, t) => s + t.subtotal, 0);
                                  return (
                                    <div key={appt.id} className="rounded-lg border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900 dark:bg-sky-950/20">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                            {formatDayDateID(appt.date)} • {appt.timeSlot}
                                          </p>
                                          <p className="truncate text-[10.5px] text-slate-500">🩺 {appt.doctorName || '—'}{appt.queueNumber ? ` • Antrean ${appt.queueNumber}` : ''}</p>
                                          {appt.service && <p className="truncate text-[10px] font-semibold text-brand-600 dark:text-brand-300">🏥 {appt.service.name}</p>}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <Badge tone="sky">🩺 Appointment</Badge>
                                          <Badge tone={appt.status === 'Completed' ? 'emerald' : appt.status === 'Cancelled' ? 'slate' : appt.status === 'In_Progress' ? 'amber' : 'brand'}>
                                            {appt.status === 'Waiting' && appt.confirmedAt ? 'Terkonfirmasi' : appt.status.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="mt-2 space-y-1 rounded-lg bg-white p-2.5 text-[10.5px] dark:bg-slate-900">
                                        <p className="text-slate-600 dark:text-slate-300">📋 {petAppt.reasons.join(', ')}</p>
                                        <p className="text-slate-600 dark:text-slate-300">📝 {petAppt.conditionStory}</p>
                                        {petAppt.complaints.length > 0 && (
                                          <p className="text-slate-500">
                                            {petAppt.complaints.map((c) => `✅ ${c.name}: ${c.detail}`).join(' • ')}
                                          </p>
                                        )}
                                        {petAppt.diagnosis && (
                                          <p className="font-semibold text-brand-700 dark:text-brand-300">🩺 Diagnosis: {petAppt.diagnosis}</p>
                                        )}
                                        {petAppt.examination && <p className="text-slate-500">🌡️ {petAppt.examination.weight ? `${petAppt.examination.weight} kg` : 'Berat -'} • {petAppt.examination.temperature ? `${petAppt.examination.temperature}°C` : 'Suhu -'} • {petAppt.examination.turgor || 'Turgor -'}</p>}
                                        {petAppt.examination?.physicalExam && <p className="text-slate-500">🔎 {petAppt.examination.physicalExam}</p>}
                                        {petAppt.treatments.length > 0 && (
                                          <p className="text-slate-500">
                                            💊 {petAppt.treatments.map((t) => `${t.name} x${t.quantity}${t.dosage ? ` (${t.dosage})` : ''}`).join(', ')}
                                          </p>
                                        )}
                                        {(petAppt.documents?.length ?? 0) > 0 && <div className="flex flex-wrap gap-1">{petAppt.documents!.map((document) => <a key={document.id} href={document.dataUrl} target="_blank" rel="noreferrer" className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">📎 {document.kind}: {document.name}</a>)}</div>}
                                        {appt.billClosed && (
                                          <p className="text-emerald-600 dark:text-emerald-400">🟢 Bill lunas — {appt.payment?.method}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })() : (() => {
                                  const res = entry.res!;
                                  const photos = parsePhotoUrls(res.photos ?? res.photoUrl);
                                  return (
                                    <div key={res.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                            {formatDayDateID(res.date)} • {res.timeSlot}
                                          </p>
                                          <p className="truncate text-[10.5px] text-slate-500">
                                            {res.packageType} — {formatRupiah(res.price)}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <Badge tone="slate">✂️ Grooming</Badge>
                                          <Badge tone={res.status === 'Completed' ? 'emerald' : res.status === 'Cancelled' ? 'slate' : res.status === 'In_Progress' ? 'amber' : 'brand'}>
                                            {res.status.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                      </div>

                                      {res.resume && (
                                        <div className="mt-2 space-y-1 rounded-lg bg-white p-2.5 text-[10.5px] dark:bg-slate-900">
                                          {res.resume.weight && <p className="text-slate-500">⚖️ {res.resume.weight} kg{res.resume.bodyTemp ? ` • ${res.resume.bodyTemp}°C` : ''}</p>}
                                          {res.resume.skinCondition && <p className="text-slate-500">🩺 {res.resume.skinCondition}</p>}
                                          {res.resume.groomingNotes && <p className="text-slate-600 dark:text-slate-300">📝 {res.resume.groomingNotes}</p>}
                                          {res.resume.nextGroomingDate && <p className="text-brand-700 dark:text-brand-300">📅 Berikutnya: {res.resume.nextGroomingDate}</p>}
                                        </div>
                                      )}

                                      {photos.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {photos.slice(0, 6).map((url, i) => (
                                            <img key={i} src={url} alt={`Foto ${i + 1}`} className="h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                                          ))}
                                        </div>
                                      )}

                                      <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                                        {res.status === 'Completed' && !res.signatureData && (
                                          <Button variant="secondary" size="sm" onClick={() => setConsentRes(res)}>
                                            <FileSignature size={12} /> Consent
                                          </Button>
                                        )}
                                        <Button variant="secondary" size="sm" onClick={() => onOpenResume(res)}>
                                          Resume
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => onOpenEditReservation(res)}>
                                          Edit
                                        </Button>
                                        <button onClick={() => setDeleteRes(res)} className="cursor-pointer rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Membership card */}
      <Modal
        isOpen={!!membershipOwner}
        onClose={() => setMembershipOwner(null)}
        title="Kartu Member & Loyalitas"
        subtitle={membershipOwner?.ownerName}
        icon={<CreditCard size={18} />}
        size="sm"
      >
        {membershipOwner && (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 to-brand-950 p-5 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <span className="text-2xl">🐾</span>
                <span className="font-mono text-[10px] tracking-widest text-brand-300">MEMBERSHIP</span>
              </div>
              <p className="font-display mt-6 truncate text-base font-bold">{membershipOwner.ownerName}</p>
              <p className="font-mono text-[11px] text-white/60">{membershipOwner.ownerPhone}</p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <span className="block text-[9px] tracking-widest text-white/50 uppercase">Saldo Poin</span>
                  <span className="font-mono text-2xl font-bold text-amber-300">{loyaltyForOwner(membershipOwner).balance} P</span>
                </div>
                <span className="text-[10px] text-white/50">1 P = {formatRupiah(loyalty.pointValue)}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Poin Didapat</p>
                <p className="font-mono mt-0.5 font-bold text-emerald-600">{loyaltyForOwner(membershipOwner).earned} P</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Poin Ditebus</p>
                <p className="font-mono mt-0.5 font-bold text-rose-500">{loyaltyForOwner(membershipOwner).redeemed} P</p>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Informed consent */}
      <Modal
        isOpen={!!consentRes}
        onClose={() => setConsentRes(null)}
        title="Informed Consent Grooming"
        subtitle={consentRes ? `${consentRes.petName} — ${formatDayDateID(consentRes.date)}` : ''}
        icon={<FileSignature size={18} />}
        size="md"
        footer={
          <Button
            size="sm"
            variant="success"
            onClick={() => {
              if (consentRes) {
                saveReservation.mutate(
                  { ...consentRes, signatureData: consentRes.signatureData },
                  {
                    onSuccess: () => {
                      pushToast({ tone: 'success', title: 'Consent tercatat', message: `Persetujuan grooming ${consentRes.petName} tersimpan.` });
                      setConsentRes(null);
                    },
                  }
                );
              }
            }}
          >
            Simpan Persetujuan
          </Button>
        }
      >
        {consentRes && (
          <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              Dengan ini saya, <strong>{consentRes.ownerName}</strong>, pemilik dari <strong>{consentRes.petName}</strong>{' '}
              ({consentRes.petType} — {consentRes.petBreed}), memberikan persetujuan penuh kepada staf Jeje Pet Care untuk
              melakukan tindakan grooming pada tanggal {formatDayDateID(consentRes.date)} sesi {consentRes.timeSlot} dengan
              layanan {consentRes.packageType}.
            </p>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              Saya memahami risiko yang telah dijelaskan (kondisi kesehatan bawaan, perilaku hewan, matting, force majeure,
              kutu/jamur, dan batasan pengambilan) dan menyatakan hewan saya dalam kondisi sehat layak grooming.
            </p>
            {consentRes.signatureData ? (
              <div className="text-center">
                <img src={consentRes.signatureData} alt="Tanda tangan" className="mx-auto h-14" />
                <p className="border-t border-slate-300 pt-1 text-[10px] text-slate-500">Tanda Tangan Pemilik (terekam)</p>
              </div>
            ) : (
              <p className="rounded-lg bg-rose-50 p-2.5 text-center font-semibold text-rose-600 dark:bg-rose-950/40">
                Belum ada tanda tangan — lakukan melalui form reservasi / portal mandiri.
              </p>
            )}
            <p className="text-right text-[10px] text-slate-400">Diterbitkan: {todayISO()}</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteRes}
        onClose={() => setDeleteRes(null)}
        onConfirm={() => {
          if (deleteRes) {
            saveReservation
              .mutateAsync({ ...deleteRes, status: 'Cancelled' })
              .then(() => pushToast({ tone: 'success', title: 'Sesi dibatalkan', message: `${deleteRes.petName} — ${deleteRes.date}` }));
            setDeleteRes(null);
          }
        }}
        title="Batalkan sesi ini?"
        message={`Sesi ${deleteRes?.petName} pada ${deleteRes?.date} akan ditandai dibatalkan (riwayat tetap tersimpan).`}
        confirmLabel="Batalkan Sesi"
      />
    </div>
  );
}

function ClinicalEventCard({ tone, icon, label, date, title, status, detail }: { tone: 'rose' | 'emerald' | 'amber'; icon: React.ReactNode; label: string; date: string; title: string; status: string; detail: string }) {
  const styles = tone === 'rose'
    ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20'
    : tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
      : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20';
  return <div className={`rounded-lg border p-3 ${styles}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">{icon}{formatDayDateID(date)} • {title}</p><p className="mt-1 text-[10.5px] text-slate-500">{detail}</p></div><div className="flex gap-1.5"><Badge tone={tone}>{label}</Badge><Badge tone="slate">{status}</Badge></div></div></div>;
}
