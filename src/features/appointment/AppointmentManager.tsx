import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Stethoscope, Search, Clock, Calendar, Trash2, CheckCircle2, XCircle, Pencil, Printer, Wallet, Pill } from 'lucide-react';
import { Appointment, AppointmentPet, AppointmentTreatmentItem, ReservationStatus } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Input, Select } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/Section';
import { useAppointments, useSaveAppointment, useDeleteAppointment, useAddActivityLog, useAppConfig, useInventory, useSaveInventoryItem } from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { formatRupiah, formatDateTimeID, formatDayDateID, todayISO } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

type StatusFilter = 'All' | 'Active' | ReservationStatus;

let billItemSeq = 1;

export default function AppointmentManager() {
  const { data: appointments = [] } = useAppointments();
  const saveAppointment = useSaveAppointment();
  const deleteAppointment = useDeleteAppointment();
  const addActivityLog = useAddActivityLog();
  const { data: config } = useAppConfig();
  const { data: inventory = [] } = useInventory();
  const saveInventory = useSaveInventoryItem();
  const session = useAppStore((s) => s.session);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [invoiceAppt, setInvoiceAppt] = useState<Appointment | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return appointments
      .filter((a) => {
        const matchesStatus =
          statusFilter === 'All'
            ? true
            : statusFilter === 'Active'
              ? a.status !== 'Completed' && a.status !== 'Cancelled'
              : a.status === statusFilter;
        const matchesSearch =
          !q ||
          a.ownerName.toLowerCase().includes(q) ||
          a.ownerPhone.includes(search) ||
          a.pets.some((p) => p.petName.toLowerCase().includes(q)) ||
          (a.service?.name || '').toLowerCase().includes(q) ||
          (a.doctorName || '').toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  }, [appointments, search, statusFilter]);

  const today = todayISO();
  const apptToday = appointments.filter((a) => a.date === today && a.status !== 'Cancelled').length;
  const waiting = appointments.filter((a) => a.status === 'Waiting').length;
  const inProgress = appointments.filter((a) => a.status === 'In_Progress').length;

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
    saveAppointment.mutate(
      { ...appt, status },
      {
        onSuccess: () => {
          log('Status Appointment', appt.id, appt.ownerName, `Status appointment diubah menjadi ${status}`);
          pushToast({ tone: 'success', title: 'Status Diperbarui', message: `${appt.ownerName} → ${status.replace('_', ' ')}` });
          setDetail((d) => (d ? { ...d, status } : d));
        },
      }
    );
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

    const closed: Appointment = { ...appt, billClosed: true, payment, status: 'Completed' };
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Appointment Hari Ini" value={apptToday} tone="brand" icon={<Calendar size={18} />} />
        <StatCard label="Waiting" value={waiting} tone="amber" hint="Menunggu konfirmasi" />
        <StatCard label="In Progress" value={inProgress} tone="emerald" icon={<Stethoscope size={18} />} hint="Sedang ditangani" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Cari pemilik / hewan / dokter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Active', 'Waiting', 'In_Progress', 'Completed', 'Cancelled'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                  statusFilter === s
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                {s === 'All' ? 'Semua' : s === 'Active' ? 'Aktif' : s.replace('_', ' ')}
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
            return (
              <Card key={appt.id} hover>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">{appt.ownerName}</h4>
                      <Badge tone={appt.status === 'Completed' ? 'emerald' : appt.status === 'Cancelled' ? 'slate' : appt.status === 'In_Progress' ? 'amber' : 'brand'}>
                        {appt.status.replace('_', ' ')}
                      </Badge>
                      {appt.status !== 'Cancelled' && (
                        appt.billClosed
                          ? <Badge tone="emerald">🟢 Lunas {formatRupiah(billTotal(appt))}</Badge>
                          : total > 0
                            ? <Badge tone="rose">🔴 Belum ditutup — {formatRupiah(total)}</Badge>
                            : <Badge tone="slate">Belum ada tindakan</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      📅 {formatDayDateID(appt.date)} • 🕒 {appt.timeSlot} • 🩺 {appt.doctorName || '—'}
                    </p>
                    {appt.service && <p className="mt-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300">🏥 {appt.service.name}</p>}
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {appt.pets.map((p) => `🐾 ${p.petName} (${p.reasons.join('/')})`).join('  •  ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => setDetail(appt)}>
                      <Pencil size={12} /> Kelola
                    </Button>
                    <button
                      onClick={() => setDeleteTarget(appt)}
                      className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title="Hapus appointment"
                    >
                      <Trash2 size={14} />
                    </button>
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Hapus appointment?"
        message={`Appointment ${deleteTarget?.ownerName} pada ${deleteTarget?.date} ${deleteTarget?.timeSlot} akan dihapus permanen.`}
        confirmLabel="Hapus"
      />
    </div>
  );
}

function billTotal(appt: Appointment): number {
  return appt.pets.reduce(
    (sum, pet) => sum + pet.treatments.reduce((s, t) => s + t.subtotal, 0),
    0
  );
}

// ================== DETAIL MODAL ==================

function AppointmentDetailModal({
  appointment,
  inventory,
  onClose,
  onStatus,
  onSave,
  onPreviewInvoice,
  onCloseBill,
}: {
  appointment: Appointment | null;
  inventory: { id: string; name: string; stock: number; sellingPrice?: number }[];
  onClose: () => void;
  onStatus: (appt: Appointment, status: ReservationStatus) => void;
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
            {draft.status === 'Waiting' && (
              <Button size="sm" variant="secondary" onClick={() => onStatus(draft, 'In_Progress')}>
                <Clock size={12} /> Mulai
              </Button>
            )}
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
        <div className="flex flex-wrap gap-2">
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
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
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
          </div>
        ))}

        {/* Bill & Pembayaran */}
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="font-display mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-300">
            <Wallet size={15} /> Bill & Pembayaran
          </p>
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
