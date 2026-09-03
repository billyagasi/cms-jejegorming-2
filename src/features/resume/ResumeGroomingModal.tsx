import { useEffect, useMemo, useState } from 'react';
import { FileText, Save, Download, Printer, Stethoscope, Scissors, Bath, Wind, ClipboardCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import { Reservation, ResumeGrooming, StepStatus, SelectedAddOn } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { SectionTitle } from '../../components/ui/Section';
import { useAppConfig, useInventory } from '../../data-layer/hooks';
import { pushToast } from '../../components/ui/toastStore';
import { useReservationActions } from '../queue/useReservationActions';
import { formatRupiah, formatDayDateID, formatDateID, parsePhotoUrls } from '../../lib/format';
import type { ReservationMaterial } from '../../types';

interface ResumeGroomingModalProps {
  isOpen: boolean;
  reservation: Reservation | null;
  onClose: () => void;
}

export const SKIN_OPTIONS = ['Bersih & Sehat', 'Ada Jamur Ringan', 'Ada Kutu Sedikit', 'Kulit Kering/Ketombe', 'Ada Luka Gores Kecil', 'Kutu & Jamur Parah', 'Lainnya (Isi Manual)'];
export const HAIR_OPTIONS = ['Sehat berkilau & Wangi', 'Mengembang Halus (Fluffy)', 'Sedikit Kusut / Gimbal Ringan', 'Sangat Kusut (Perlu Cukur Pendek)', 'Rontok Sedang', 'Rontok Parah', 'Lainnya (Isi Manual)'];
export const EAR_OPTIONS = ['Bersih & Harum', 'Sedikit Kotor (Sudah Dibersihkan)', 'Sangat Kotor / Ada Indikasi Earmites', 'Kemerahan/Iritasi Ringan', 'Lainnya (Isi Manual)'];
export const NAIL_OPTIONS = ['Sudah digunting pendek & kikir rapi', 'Dipotong sedang (aman)', 'Tidak dipotong (permintaan pemilik)', 'Kuku kotor (sudah dibersihkan)', 'Lainnya (Isi Manual)'];
export const MOUTH_OPTIONS = ['Bersih & Gigi Sehat', 'Ada Karang Gigi Ringan', 'Gusi Kemerahan / Iritasi', 'Bau Mulut / Halitosis', 'Lainnya (Isi Manual)'];
export const NOSE_OPTIONS = ['Bersih & Lembab Normal', 'Hidung Kering/Mengelupas', 'Ada Ingus/Flu', 'Ada Kotoran Mengering', 'Lainnya (Isi Manual)'];
const CUSTOM = 'Lainnya (Isi Manual)';

const STEP_META: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
  cek_umum: { title: 'Step 1: Check Up Vet Umum', desc: 'Suhu, Berat, & Cek Kesehatan Dasar', icon: <Stethoscope size={14} /> },
  grooming_kering: { title: 'Step 2: Treatment Kering', desc: 'Potong Kuku, Trim Paw, & Bersih Telinga', icon: <Scissors size={14} /> },
  grooming_basah: { title: 'Step 3: Proses Mandi', desc: 'Aplikasi Sampo, Pijat, & Bilas Bersih', icon: <Bath size={14} /> },
  pengeringan: { title: 'Step 4: Blowdry', desc: 'Pengeringan Bulu & Penyisiran', icon: <Wind size={14} /> },
  pemeriksaan_ulang: { title: 'Step 5: Re-check', desc: 'Pengecekan Akhir, Wangi & QC Sukses', icon: <ClipboardCheck size={14} /> },
};

function nextGroomingIso(baseDate: string): string {
  if (!baseDate) return '';
  const d = new Date(baseDate);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 25);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ResumeGroomingModal({ isOpen, reservation, onClose }: ResumeGroomingModalProps) {
  const { data: config } = useAppConfig();
  const { saveResume } = useReservationActions();
  const staffOptions = config?.staffOptions?.length ? config.staffOptions : [];
  const transportPresets = config?.transportPresets ?? [];
  const packages = config?.packages ?? [];
  const addons = config?.addons ?? [];

  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  // Form state
  const [weight, setWeight] = useState('');
  const [bodyTemp, setBodyTemp] = useState('');
  const [skinSel, setSkinSel] = useState('');
  const [skinManual, setSkinManual] = useState('');
  const [hairSel, setHairSel] = useState('');
  const [hairManual, setHairManual] = useState('');
  const [earSel, setEarSel] = useState('');
  const [earManual, setEarManual] = useState('');
  const [nailSel, setNailSel] = useState('');
  const [nailManual, setNailManual] = useState('');
  const [mouthSel, setMouthSel] = useState('');
  const [mouthManual, setMouthManual] = useState('');
  const [noseSel, setNoseSel] = useState('');
  const [noseManual, setNoseManual] = useState('');
  const [groomingNotes, setGroomingNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [driverName, setDriverName] = useState('');
  const [assistantName, setAssistantName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [newPackageType, setNewPackageType] = useState('');
  const [newBasePrice, setNewBasePrice] = useState(0);
  const [editedAddOns, setEditedAddOns] = useState<SelectedAddOn[]>([]);
  const [materials, setMaterials] = useState<ReservationMaterial[]>([]);
  const [steps, setSteps] = useState<Reservation['steps']>([]);

  const staffChoices = useMemo(() => {
    const set = new Set<string>(staffOptions);
    return Array.from(set);
  }, [staffOptions]);

  // Populate dari reservation
  useEffect(() => {
    if (!isOpen || !reservation) return;
    const r = reservation.resume;
    const matchSel = (options: string[], val?: string): { sel: string; manual: string } => {
      if (val && options.filter((o) => o !== CUSTOM).includes(val)) return { sel: val, manual: '' };
      if (val) return { sel: CUSTOM, manual: val };
      return { sel: options[0], manual: '' };
    };
    const s = matchSel(SKIN_OPTIONS, r?.skinCondition);
    const h = matchSel(HAIR_OPTIONS, r?.hairCondition);
    const e = matchSel(EAR_OPTIONS, r?.earCondition);
    const n = matchSel(NAIL_OPTIONS, r?.nailCondition);
    const m = matchSel(MOUTH_OPTIONS, r?.mouthCondition);
    const no = matchSel(NOSE_OPTIONS, r?.noseCondition);

    setWeight(r?.weight ? String(r.weight) : '');
    setBodyTemp(r?.bodyTemp ? String(r.bodyTemp) : '');
    setSkinSel(s.sel); setSkinManual(s.manual);
    setHairSel(h.sel); setHairManual(h.manual);
    setEarSel(e.sel); setEarManual(e.manual);
    setNailSel(n.sel); setNailManual(n.manual);
    setMouthSel(m.sel); setMouthManual(m.manual);
    setNoseSel(no.sel); setNoseManual(no.manual);
    setGroomingNotes(r?.groomingNotes || '');
    setRecommendations(r?.recommendations || '');
    setDriverName(r?.driverName || '');
    setAssistantName(r?.assistantName || '');
    setVehiclePlate(r?.vehiclePlate || '');
    setNextDate(r?.nextGroomingDateIso || nextGroomingIso(reservation.date));
    setNewPackageType(reservation.packageType);
    setNewBasePrice(reservation.basePrice ?? 0);
    setEditedAddOns(reservation.addOns || []);
    setMaterials(reservation.materialsUsed ? reservation.materialsUsed.map((m) => ({ ...m })) : []);
    setSteps(reservation.steps.map((st) => ({ ...st })));
    setActiveTab(r ? 'preview' : 'edit');
  }, [isOpen, reservation]);

  // Auto transport preset
  useEffect(() => {
    if (!reservation) return;
    if (reservation.transportMode && reservation.transportMode !== 'Antar Sendiri') {
      const preset = transportPresets[0];
      if (preset && !driverName) {
        setDriverName(preset.driverName);
        setAssistantName(preset.assistantName);
        setVehiclePlate(preset.vehiclePlate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation?.transportMode, transportPresets.length]);

  if (!reservation) return null;

  const pickValue = (sel: string, manual: string) => (sel === CUSTOM ? manual.trim() : sel);

  const handleSave = () => {
    const body: ResumeGrooming = {
      weight: weight ? Number(weight) : undefined,
      bodyTemp: bodyTemp ? Number(bodyTemp) : undefined,
      skinCondition: pickValue(skinSel, skinManual),
      hairCondition: pickValue(hairSel, hairManual),
      earCondition: pickValue(earSel, earManual),
      nailCondition: pickValue(nailSel, nailManual),
      mouthCondition: pickValue(mouthSel, mouthManual) || undefined,
      noseCondition: pickValue(noseSel, noseManual) || undefined,
      groomingNotes,
      recommendations,
      driverName: driverName || undefined,
      assistantName: assistantName || undefined,
      vehiclePlate: vehiclePlate || undefined,
      nextGroomingDate: nextDate ? formatDateID(nextDate) : undefined,
      nextGroomingDateIso: nextDate || undefined,
      nextGroomingType: undefined,
    };

    const priceChanged = newPackageType !== reservation.packageType || newBasePrice !== (reservation.basePrice ?? 0);
    const basePriceChanged = newBasePrice !== (reservation.basePrice ?? 0);
    saveResume(
      reservation.id,
      body,
      priceChanged ? Math.max(0, newBasePrice + editedAddOns.reduce((s, a) => s + a.price * a.quantity, 0)) : undefined,
      undefined,
      JSON.stringify(editedAddOns) !== JSON.stringify(reservation.addOns || []) ? editedAddOns : undefined,
      newPackageType !== reservation.packageType ? newPackageType : undefined,
      JSON.stringify(materials) !== JSON.stringify(reservation.materialsUsed || []) ? materials : undefined
    );
    setActiveTab('preview');
    void basePriceChanged;
  };

  const handleStepStatus = (stepId: string, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, status } : s)));
  };

  const handleStepPic = (stepId: string, pic: string) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, pic } : s)));
  };

  const handleExportPdf = async () => {
    const doc = new jsPDF({ unit: 'mm', format: [215, 330] }); // F4
    const margin = 18;
    let y = 22;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RESUME HASIL GROOMING', 107.5, y, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Jeje Pet Care Grooming — Sertifikat Hasil Perawatan', 107.5, y + 6, { align: 'center' });
    y += 14;
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.8);
    doc.line(margin, y, 215 - margin, y);
    y += 10;

    const line = (label: string, val: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, margin + 48, y, { maxWidth: 215 - margin * 2 - 48 });
      y += 6;
    };

    line('Nama Hewan', `${reservation.petName} (${reservation.petType} — ${reservation.petBreed})`);
    line('Pemilik', `${reservation.ownerName} — ${reservation.ownerPhone}`);
    line('Tanggal & Sesi', `${formatDayDateID(reservation.date)} • ${reservation.timeSlot}`);
    line('Paket', reservation.packageType);
    if (reservation.resume?.weight) line('Berat / Suhu', `${reservation.resume.weight} kg${reservation.resume.bodyTemp ? ` / ${reservation.resume.bodyTemp}°C` : ''}`);
    y += 2;

    const section = (title: string, body: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(title, margin, y);
      y += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(body || '-', 215 - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 4.6 + 3.5;
    };

    section('1. Kondisi Kulit', pickValue(skinSel, skinManual));
    section('2. Kondisi Bulu', pickValue(hairSel, hairManual));
    section('3. Kondisi Telinga', pickValue(earSel, earManual));
    section('4. Kondisi Kuku', pickValue(nailSel, nailManual));
    section('5. Catatan Grooming', groomingNotes);
    section('6. Rekomendasi Perawatan', recommendations);
    if (nextDate) section('Jadwal Grooming Berikutnya (H+25)', `${formatDayDateID(nextDate)}`);

    // Foto dokumentasi (embed dari photos)
    const photos = parsePhotoUrls(reservation.photos ?? reservation.photoUrl);
    if (photos.length > 0) {
      try {
        const dataUrl = await loadImageAsDataUrl(photos[0]);
        const imgProps = doc.getImageProperties(dataUrl);
        const w = 90;
        const h = (imgProps.height * w) / imgProps.width;
        const yPhoto = Math.min(y + 4, 330 - h - 34);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Foto Dokumentasi', margin, yPhoto - 3);
        doc.addImage(dataUrl, 'JPEG', margin, yPhoto, w, h);
      } catch {
        // foto gagal dimuat — lewati
      }
    }

    y = 330 - 26;
    doc.setDrawColor(180);
    doc.line(107.5, y - 12, 190, y - 12);
    doc.setFontSize(8);
    doc.text('Tanda Tangan Pemilik', 148.75, y - 7, { align: 'center' });
    doc.text('Terima kasih telah mempercayakan hewan kesayangan Anda kepada kami. 🐾', 107.5, y, { align: 'center' });

    doc.save(`Resume_Grooming_${reservation.petName}_${reservation.date}_JPC.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const editedFinalPrice = newBasePrice + editedAddOns.reduce((s, a) => s + a.price * a.quantity, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resume Grooming — ${reservation.petName}`}
      subtitle={`${reservation.ownerName} • ${formatDayDateID(reservation.date)} • ${reservation.timeSlot}`}
      icon={<FileText size={18} />}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="brand">
            Progres {completedCount}/5 Step
          </Badge>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer size={13} /> Cetak
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportPdf}>
              <Download size={13} /> Unduh PDF
            </Button>
            {activeTab === 'edit' && (
              <Button size="sm" variant="success" onClick={handleSave}>
                <Save size={13} /> Simpan & Terbitkan Resume
              </Button>
            )}
          </div>
        </div>
      }
    >
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { id: 'preview', label: 'Preview Dokumen' },
          { id: 'edit', label: 'Edit / Isi Data' },
        ]}
        className="mb-5"
      />

      {activeTab === 'edit' && (
        <div className="space-y-5">
          {/* 5-step checklist */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <SectionTitle>Checklist 5-Step Grooming</SectionTitle>
            <div className="space-y-2">
              {steps.map((step, i) => {
                const meta = STEP_META[step.id];
                return (
                  <div key={step.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      step.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : step.status === 'ongoing' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    }`}>
                      {meta?.icon ?? i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{meta?.title ?? step.name}</p>
                      <p className="truncate text-[10px] text-slate-400">{meta?.desc}</p>
                    </div>
                    <Select
                      value={step.pic}
                      onChange={(e) => handleStepPic(step.id, e.target.value)}
                      className="w-40"
                    >
                      <option value="">PJ belum diatur</option>
                      {staffChoices.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                    <div className="flex gap-1">
                      {(['pending', 'ongoing', 'completed'] as StepStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStepStatus(step.id, st)}
                          className={`cursor-pointer rounded-md px-2 py-1 text-[10px] font-bold uppercase transition-colors ${
                            step.status === st
                              ? st === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : st === 'ongoing'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-400 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vet check */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <Field label="Berat Badan (kg)">
              <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="cth. 3.8" />
            </Field>
            <Field label="Suhu Tubuh (°C)">
              <Input type="number" step="0.1" value={bodyTemp} onChange={(e) => setBodyTemp(e.target.value)} placeholder="cth. 38.5" />
            </Field>
          </div>

          {/* Conditions */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <ConditionField label="Kondisi Kulit" options={SKIN_OPTIONS} sel={skinSel} setSel={setSkinSel} manual={skinManual} setManual={setSkinManual} />
            <ConditionField label="Kondisi Bulu" options={HAIR_OPTIONS} sel={hairSel} setSel={setHairSel} manual={hairManual} setManual={setHairManual} />
            <ConditionField label="Kondisi Telinga" options={EAR_OPTIONS} sel={earSel} setSel={setEarSel} manual={earManual} setManual={setEarManual} />
            <ConditionField label="Kondisi Kuku" options={NAIL_OPTIONS} sel={nailSel} setSel={setNailSel} manual={nailManual} setManual={setNailManual} />
            <ConditionField label="Kondisi Mulut" options={MOUTH_OPTIONS} sel={mouthSel} setSel={setMouthSel} manual={mouthManual} setManual={setMouthManual} />
            <ConditionField label="Kondisi Hidung" options={NOSE_OPTIONS} sel={noseSel} setSel={setNoseSel} manual={noseManual} setManual={setNoseManual} />
          </div>

          {/* Notes */}
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <Field label="Catatan Grooming" required>
              <Textarea value={groomingNotes} onChange={(e) => setGroomingNotes(e.target.value)} placeholder="cth. Model cukuran Teddy Bear, kuku pendek, telinga dibersihkan…" rows={2} />
            </Field>
            <Field label="Rekomendasi untuk Pemilik" required>
              <Textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="cth. Grooming rutin kembali dalam 3-4 minggu." rows={2} />
            </Field>
            <Field label="Tanggal Grooming Berikutnya (H+25)">
              <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </Field>
          </div>

          {/* Transport */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <SectionTitle>Transport & Kurir</SectionTitle>
            {reservation.transportMode === 'Antar Sendiri' ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-950/50">
                Moda <strong>Antar Sendiri</strong> — kolom kurir dinonaktifkan.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Nama Driver"><Input value={driverName} onChange={(e) => setDriverName(e.target.value)} /></Field>
                <Field label="Nama Asisten"><Input value={assistantName} onChange={(e) => setAssistantName(e.target.value)} /></Field>
                <Field label="Kendaraan / Plat"><Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} /></Field>
              </div>
            )}
          </div>

          {/* Material & barang terpakai */}
        <MaterialsSection
          materials={materials}
          setMaterials={setMaterials}
          onError={(msg) => pushToast({ tone: 'error', title: 'Material', message: msg })}
        />

        {/* Revisi harga */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
            <SectionTitle>
              <span className="text-amber-700 dark:text-amber-400">Revisi Harga & Paket (opsional)</span>
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Paket">
                <Select value={newPackageType} onChange={(e) => {
                  const pkg = packages.find((p) => p.name === e.target.value);
                  setNewPackageType(e.target.value);
                  if (pkg) setNewBasePrice(pkg.price);
                }}>
                  {packages.map((p) => (
                    <option key={p.name} value={p.name}>{p.name} — {formatRupiah(p.price)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Harga Dasar (Rp)">
                <Input type="number" value={newBasePrice} onChange={(e) => setNewBasePrice(Number(e.target.value))} />
              </Field>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Add-Ons (qty dapat diubah)</p>
              <div className="space-y-1.5">
                {addons.map((addon) => {
                  const sel = editedAddOns.find((a) => a.name === addon.name);
                  return (
                    <div key={addon.name} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 ${sel ? 'border-amber-300 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700'}`}>
                      <button
                        type="button"
                        className="min-w-0 flex-1 cursor-pointer truncate text-left text-xs font-medium text-slate-700 dark:text-slate-200"
                        onClick={() =>
                          setEditedAddOns((prev) =>
                            prev.find((a) => a.name === addon.name)
                              ? prev.filter((a) => a.name !== addon.name)
                              : [...prev, { name: addon.name, price: addon.price, quantity: 1 }]
                          )
                        }
                      >
                        {sel ? '✓ ' : '+ '}
                        {addon.name} · {formatRupiah(addon.price)}
                      </button>
                      {sel && (
                        <div className="flex items-center gap-1">
                          <button type="button" className="cursor-pointer rounded p-0.5 text-slate-500 hover:bg-slate-100" onClick={() => setEditedAddOns((prev) => prev.map((a) => (a.name === addon.name ? { ...a, quantity: Math.max(1, a.quantity - 1) } : a)))}>−</button>
                          <span className="w-4 text-center font-mono text-[11px] font-bold">{sel.quantity}</span>
                          <button type="button" className="cursor-pointer rounded p-0.5 text-slate-500 hover:bg-slate-100" onClick={() => setEditedAddOns((prev) => prev.map((a) => (a.name === addon.name ? { ...a, quantity: a.quantity + 1 } : a)))}>+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 px-3.5 py-2 text-white dark:bg-slate-950">
              <span className="text-xs font-semibold">Final Harga Setelah Revisi:</span>
              <span className="font-mono text-sm font-bold text-brand-300">{formatRupiah(editedFinalPrice)}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <PreviewDocument reservation={reservation} resumeBody={{
          weight: weight ? Number(weight) : undefined,
          bodyTemp: bodyTemp ? Number(bodyTemp) : undefined,
          skinCondition: pickValue(skinSel, skinManual),
          hairCondition: pickValue(hairSel, hairManual),
          earCondition: pickValue(earSel, earManual),
          nailCondition: pickValue(nailSel, nailManual),
          mouthCondition: pickValue(mouthSel, mouthManual) || undefined,
          noseCondition: pickValue(noseSel, noseManual) || undefined,
          groomingNotes,
          recommendations,
          driverName,
          assistantName,
          vehiclePlate,
          nextGroomingDate: nextDate ? formatDateID(nextDate) : undefined,
        }} steps={steps} />
      )}
    </Modal>
  );
}

function ConditionField({
  label,
  options,
  sel,
  setSel,
  manual,
  setManual,
}: {
  label: string;
  options: string[];
  sel: string;
  setSel: (v: string) => void;
  manual: string;
  setManual: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={sel} onChange={(e) => setSel(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </Select>
      {sel === CUSTOM && (
        <Input className="mt-1.5" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Isi kondisi manual…" />
      )}
    </Field>
  );
}

function PreviewDocument({
  reservation,
  resumeBody,
  steps,
}: {
  reservation: Reservation;
  resumeBody: ResumeGrooming;
  steps: Reservation['steps'];
}) {
  const rows: [string, string][] = [
    ['Nama Hewan', `${reservation.petName} (${reservation.petType} — ${reservation.petBreed})`],
    ['Pemilik', `${reservation.ownerName} — ${reservation.ownerPhone}`],
    ['Jadwal', `${formatDayDateID(reservation.date)} • ${reservation.timeSlot}`],
    ['Paket', reservation.packageType],
    ['Berat / Suhu', `${resumeBody.weight ?? '-'} kg / ${resumeBody.bodyTemp ?? '-'} °C`],
  ];

  return (
    <div id="printable-receipt-area" className="mx-auto max-w-2xl rounded-2xl border-2 border-brand-700 bg-white p-8 text-slate-800 shadow-inner">
      <div className="border-b-2 border-brand-700 pb-4 text-center">
        <h2 className="font-display text-xl font-bold text-brand-900">RESUME HASIL GROOMING</h2>
        <p className="mt-1 text-[11px] text-slate-500">Jeje Pet Care Grooming — Sertifikat Hasil Perawatan</p>
      </div>

      <div className="mt-5 space-y-1.5">
        {rows.map(([label, val]) => (
          <div key={label} className="flex gap-3 text-xs">
            <span className="w-28 shrink-0 font-bold text-slate-500">{label}</span>
            <span className="font-semibold text-slate-800">{val}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-5 gap-1.5">
        {steps.map((s) => (
          <div key={s.id} className={`rounded-lg border p-2 text-center ${
            s.status === 'completed' ? 'border-emerald-300 bg-emerald-50' : s.status === 'ongoing' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
          }`}>
            <p className="text-[9px] font-bold text-slate-600">{s.name.replace('Step ', 'S').split(':')[0]}</p>
            <p className="mt-0.5 text-[8px] font-semibold uppercase text-slate-400">{s.status}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
        <DocSection title="Kondisi Kulit" body={resumeBody.skinCondition} />
        <DocSection title="Kondisi Bulu" body={resumeBody.hairCondition} />
        <DocSection title="Kondisi Telinga" body={resumeBody.earCondition} />
        <DocSection title="Kondisi Kuku" body={resumeBody.nailCondition} />
        <DocSection title="Catatan Grooming" body={resumeBody.groomingNotes} />
        <DocSection title="Rekomendasi Perawatan" body={resumeBody.recommendations} />
        {resumeBody.nextGroomingDate && <DocSection title="Jadwal Berikutnya (H+25)" body={resumeBody.nextGroomingDate} />}
      </div>

      {(() => {
        const photos = parsePhotoUrls(reservation.photos ?? reservation.photoUrl);
        if (photos.length === 0) return null;
        return (
          <div className="mt-5">
            <p className="text-[10px] font-bold tracking-wide text-brand-700 uppercase">Foto Dokumentasi</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Foto sesi grooming ${i + 1}`}
                  className="h-28 w-40 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                />
              ))}
            </div>
          </div>
        );
      })()}

      <div className="mt-6 flex items-end justify-between">
        <div className="text-[10px] text-slate-400">
          <p>Dokumen ini diterbitkan otomatis oleh JPC Grooming Hub</p>
          <p>{reservation.id}</p>
        </div>
        {reservation.signatureData ? (
          <div className="text-center">
            <img src={reservation.signatureData} alt="Tanda tangan" className="h-12" />
            <p className="border-t border-slate-300 pt-1 text-[9px] text-slate-500">Tanda Tangan Pemilik</p>
          </div>
        ) : (
          <div className="w-40 border-t border-slate-300 pt-1 text-center text-[9px] text-slate-400">Tanda Tangan Pemilik</div>
        )}
      </div>
    </div>
  );
}

function DocSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-wide text-brand-700 uppercase">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{body || '-'}</p>
    </div>
  );
}
/** Section Material & Barang Terpakai — quick-pick dari Inventaris + qty stepper. */
function MaterialsSection({
  materials,
  setMaterials,
  onError,
}: {
  materials: ReservationMaterial[];
  setMaterials: (m: ReservationMaterial[]) => void;
  onError: (msg: string) => void;
}) {
  const { data: inventory = [] } = useInventory();

  const addMaterial = (item: { id: string; name: string }) => {
    const existing = materials.find((m) => m.itemId === item.id);
    if (existing) {
      setMaterials(materials.map((m) => (m.itemId === item.id ? { ...m, quantity: m.quantity + 1 } : m)));
    } else {
      setMaterials([...materials, { itemId: item.id, name: item.name, quantity: 1 }]);
    }
  };

  const setQty = (idx: number, delta: number) => {
    setMaterials(
      materials
        .map((m, i) => (i === idx ? { ...m, quantity: Math.max(0, m.quantity + delta) } : m))
        .filter((m) => m.quantity > 0)
    );
  };

  const addFreeText = () => {
    onError('Gunakan item dari Inventaris agar stok tercatat otomatis.');
  };

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 dark:border-sky-900/60 dark:bg-sky-950/20">
      <SectionTitle>
        <span className="text-sky-700 dark:text-sky-400">Material & Barang Terpakai (stok Inventaris auto-berkurang)</span>
      </SectionTitle>
      {materials.length > 0 && (
        <div className="mb-3 space-y-1">
          {materials.map((m, idx) => (
            <div key={`${m.itemId}-${idx}`} className="flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-1.5 dark:border-sky-800 dark:bg-slate-900">
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                🧴 {m.name}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setQty(idx, -1)} className="cursor-pointer rounded border border-slate-200 p-0.5 text-slate-500 dark:border-slate-600">−</button>
                <span className="w-6 text-center font-mono text-xs font-bold">{m.quantity}</span>
                <button type="button" onClick={() => setQty(idx, 1)} className="cursor-pointer rounded border border-slate-200 p-0.5 text-slate-500 dark:border-slate-600">+</button>
              </div>
              <button
                type="button"
                onClick={() => setMaterials(materials.filter((_, i) => i !== idx))}
                className="cursor-pointer rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {inventory
          .filter((i) => i.category === 'Shampoo' || i.category === 'Parfum' || i.stock > 0)
          .slice(0, 12)
          .map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => addMaterial({ id: i.id, name: i.name })}
              className="cursor-pointer rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[10px] font-bold text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300"
              title={`Stok: ${i.stock} ${i.unit}`}
            >
              + {i.name}
            </button>
          ))}
      </div>
      {materials.length === 0 && (
        <p className="mt-2 text-[10px] text-slate-400 italic">
          Belum ada material — pilih dari Inventaris di atas. Stok otomatis berkurang saat resume disimpan.
        </p>
      )}
      <button type="button" onClick={addFreeText} className="hidden" aria-hidden />
    </div>
  );
}


/** Muat gambar URL (public/demo) menjadi data URL untuk jsPDF. */
async function loadImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat foto: ${url}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
