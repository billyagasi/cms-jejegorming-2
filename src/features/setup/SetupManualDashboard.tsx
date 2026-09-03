import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Database, Palette, ShieldCheck, Sparkles, Tags, Truck, Syringe, Users, Clock, CalendarDays,
  Award, FolderTree, Save, Upload, RotateCcw, MessageSquare, ListChecks, Plus, Trash2, Edit3, X,
  Stethoscope,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { SectionTitle } from '../../components/ui/Section';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { BRAND_THEMES, applyBrandTheme } from '../../lib/theme';
import { useAppConfig, useSaveAppConfig, useWhatsAppTemplates, useSaveWhatsAppTemplates, useReservations, useImportSystemData } from '../../data-layer/hooks';
import { resetDemoData } from '../../data-layer';
import { useAppStore } from '../../app/store';
import { pushToast } from '../../components/ui/toastStore';
import { WhatsAppTemplate, WhatsAppTemplateCategory, AppConfig, Reservation } from '../../types';
import { formatRupiah, formatDateID } from '../../lib/format';

interface SetupManualDashboardProps {
  onEditReservation: (res: Reservation | null) => void;
}

type TabId = 'backoffice' | 'whatsapp_templates' | 'reservasi';

export default function SetupManualDashboard({ onEditReservation }: SetupManualDashboardProps) {
  const { data: config } = useAppConfig();
  const saveConfig = useSaveAppConfig();
  const { data: templates = [] } = useWhatsAppTemplates();
  const saveTemplates = useSaveWhatsAppTemplates();
  const { data: reservations = [] } = useReservations();
  const importSystem = useImportSystemData();

  const [tab, setTab] = useState<TabId>('backoffice');
  const [draft, setDraft] = useState<AppConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (config && !draft) setDraft(config);
  }, [config, draft]);

  const update = (patch: Partial<AppConfig>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  const handleSaveAll = () => {
    if (!draft) return;
    saveConfig.mutate(draft, {
      onSuccess: () => {
        setDirty(false);
        applyBrandTheme(draft.activeTheme);
        pushToast({ tone: 'success', title: 'Database Master Tersimpan', message: 'Seluruh perubahan master data berhasil disimpan.' });
      },
    });
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        importSystem.mutate(
          { reservations: parsed.reservations, config: parsed.config },
          {
            onSuccess: () => {
              setDraft(null);
              pushToast({ tone: 'success', title: 'Import Berhasil', message: 'Data sistem dipulihkan dari berkas JSON.' });
            },
          }
        );
      } catch {
        pushToast({ tone: 'error', title: 'Import Gagal', message: 'Berkas JSON tidak valid.' });
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    resetDemoData();
    queryClient.invalidateQueries();
    setDraft(null);
    setDirty(false);
    setResetConfirmOpen(false);
    pushToast({
      tone: 'success',
      title: 'Data Demo Direset',
      message: 'Seluruh data dummy berhasil diregenerasi dengan tanggal relatif hari ini.',
    });
  };

  if (!draft) return <p className="py-20 text-center text-sm text-slate-400">Memuat database master…</p>;

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Database size={15} className="text-brand-600" />
            Database Master
          </h3>
          <p className="text-[11px] text-slate-500">Kelola seluruh konfigurasi, preset, dan master data aplikasi</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge tone="amber">Ada perubahan belum disimpan</Badge>}
          <Button variant="secondary" size="sm" onClick={() => setResetConfirmOpen(true)} title="Hapus semua data & regenerasi dummy">
            <RotateCcw size={13} /> Reset Demo Data
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportJson(e.target.files[0])} />
            <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <Upload size={13} /> Import JSON
            </span>
          </label>
          <Button size="sm" onClick={handleSaveAll} disabled={!dirty || saveConfig.isPending}>
            <Save size={13} /> Simpan Semua
          </Button>
        </div>
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { id: 'backoffice', label: 'Master Data', icon: <Database size={13} /> },
          { id: 'whatsapp_templates', label: 'Template WhatsApp', icon: <MessageSquare size={13} /> },
          { id: 'reservasi', label: 'Kelola Reservasi', icon: <ListChecks size={13} /> },
        ]}
      />

      {tab === 'backoffice' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Tema */}
          <SectionCard icon={<Palette size={14} />} title="Tema Brand">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BRAND_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update({ activeTheme: t.id })}
                  className={`cursor-pointer rounded-xl border p-2.5 text-left transition-all ${
                    draft.activeTheme === t.id
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-950/40'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full" style={{ background: t.colors['--brand-600'] }} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.name}</span>
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">{t.description}</span>
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Keamanan */}
          <SectionCard icon={<ShieldCheck size={14} />} title="Keamanan & Akses">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Password Admin">
                <Input value={draft.adminPassword} onChange={(e) => update({ adminPassword: e.target.value })} />
              </Field>
              <Field label="Username Owner">
                <Input value={draft.ownerUsername} onChange={(e) => update({ ownerUsername: e.target.value })} />
              </Field>
              <Field label="Kode Akses Owner">
                <Input value={draft.ownerAccessCode} onChange={(e) => update({ ownerAccessCode: e.target.value })} />
              </Field>
            </div>
            <p className="mt-2 mb-2 text-[10px] font-bold tracking-wide text-slate-400 uppercase">Akun Staf (RBAC)</p>
            <div className="space-y-2">
              {draft.roleAccounts.map((acc, i) => (
                <div key={`${acc.username}-${i}`} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={acc.role} onChange={(e) => update({ roleAccounts: draft.roleAccounts.map((a, j) => (j === i ? { ...a, role: e.target.value } : a)) })} className="text-xs" placeholder="Role" />
                    <Input value={acc.username} onChange={(e) => update({ roleAccounts: draft.roleAccounts.map((a, j) => (j === i ? { ...a, username: e.target.value } : a)) })} className="text-xs" placeholder="Username" />
                    <Input value={acc.password} onChange={(e) => update({ roleAccounts: draft.roleAccounts.map((a, j) => (j === i ? { ...a, password: e.target.value } : a)) })} className="text-xs" placeholder="Password" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['portal', 'appointments', 'queue', 'steps', 'scheduler', 'reminder', 'profile', 'logs', 'setup', 'laporan', 'inventaris', 'activityLogs', 'pos'].map((t) => {
                      const allowed = acc.allowedTabs?.includes(t) ?? true;
                      return (
                        <button
                          key={t}
                          onClick={() =>
                            update({
                              roleAccounts: draft.roleAccounts.map((a, j) => {
                                if (j !== i) return a;
                                const cur = a.allowedTabs ?? ['portal', 'queue', 'scheduler', 'pos', 'inventaris', 'steps', 'setup', 'logs', 'activityLogs'];
                                return { ...a, allowedTabs: allowed ? cur.filter((x) => x !== t) : [...cur, t] };
                              }),
                            })
                          }
                          className={`cursor-pointer rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                            allowed ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'border-slate-200 text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => update({ roleAccounts: [...draft.roleAccounts, { role: 'Staff Baru', username: 'staff', password: 'staff123', allowedTabs: ['portal'] }] })}>
                <Plus size={13} /> Tambah Akun Staf
              </Button>
            </div>
          </SectionCard>

          {/* Paket */}
          <SectionCard icon={<Sparkles size={14} />} title="Paket Grooming">
            <ItemListEditor
              items={draft.packages}
              fields={['name', 'price', 'desc']}
              onChange={(items) => update({ packages: items })}
              renderPreview={(item) => `${item.name} — ${formatRupiah(Number(item.price) || 0)}`}
              emptyTemplate={{ name: 'Paket Baru', price: 0, desc: '' }}
            />
          </SectionCard>

          {/* Add-ons */}
          <SectionCard icon={<Tags size={14} />} title="Layanan Add-Ons">
            <ItemListEditor
              items={draft.addons}
              fields={['name', 'price', 'desc']}
              onChange={(items) => update({ addons: items })}
              renderPreview={(item) => `${item.name} — ${formatRupiah(Number(item.price) || 0)}`}
              emptyTemplate={{ name: 'Add-On Baru', price: 0, desc: '' }}
            />
          </SectionCard>

          {/* Transport */}
          <SectionCard icon={<Truck size={14} />} title="Transport & Kurir">
            <ItemListEditor
              items={draft.transportPresets}
              fields={['driverName', 'assistantName', 'vehiclePlate']}
              onChange={(items) => update({ transportPresets: items })}
              renderPreview={(item) => `${item.driverName} & ${item.assistantName} — ${item.vehiclePlate}`}
              emptyTemplate={{ id: '', driverName: 'Driver', assistantName: 'Asisten', vehiclePlate: 'Kendaraan' }}
            />
          </SectionCard>

          {/* PJ Steps */}
          <SectionCard icon={<Users size={14} />} title="Preset PJ Step Grooming">
            <div className="space-y-2">
              {draft.stepPJPresets.map((pj, i) => (
                <div key={pj.id} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{pj.name}</span>
                  <Input
                    value={pj.defaultPic}
                    onChange={(e) => update({ stepPJPresets: draft.stepPJPresets.map((p, j) => (j === i ? { ...p, defaultPic: e.target.value } : p)) })}
                    className="text-xs"
                    placeholder="Nama PJ default (opsional)"
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Vaksin + Staf */}
          <SectionCard icon={<Syringe size={14} />} title="Preset Vaksin & Staf">
            <StringListEditor label="Preset Riwayat Vaksin" items={draft.vaccinePresets} onChange={(items) => update({ vaccinePresets: items })} />
            <div className="mt-4">
              <StringListEditor label="Daftar Nama Staf (PJ & Groomer)" items={draft.staffOptions} onChange={(items) => update({ staffOptions: items })} placeholder="Nama staf…" />
            </div>
          </SectionCard>

          {/* Kuota */}
          <SectionCard icon={<Clock size={14} />} title="Kuota Sesi Jam Operasional">
            <div className="space-y-2">
              {Object.entries(draft.sessionQuotas).map(([slot, quota]) => (
                <div key={slot} className="flex items-center gap-2">
                  <Input
                    value={slot}
                    onChange={(e) => {
                      const next = { ...draft.sessionQuotas };
                      delete next[slot];
                      next[e.target.value] = quota;
                      update({ sessionQuotas: next });
                    }}
                    className="flex-1 font-mono text-xs"
                  />
                  <Input
                    type="number"
                    value={quota}
                    onChange={(e) => update({ sessionQuotas: { ...draft.sessionQuotas, [slot]: Number(e.target.value) } })}
                    className="w-20 text-xs"
                  />
                  <button
                    onClick={() => {
                      const next = { ...draft.sessionQuotas };
                      delete next[slot];
                      update({ sessionQuotas: next });
                    }}
                    className="cursor-pointer rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => update({ sessionQuotas: { ...draft.sessionQuotas, ['14:00 - 15:00']: 3 } })}
              >
                <Plus size={13} /> Tambah Sesi
              </Button>
              <p className="text-[10px] text-slate-400">Kuota 0 = sesi tutup.</p>
            </div>
          </SectionCard>

          {/* Liburan */}
          <SectionCard icon={<CalendarDays size={14} />} title="Hari Libur">
            <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Libur Rutin Mingguan</p>
            <div className="flex flex-wrap gap-1.5">
              {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((d, idx) => {
                const on = draft.weeklyHolidays.includes(idx);
                return (
                  <button
                    key={d}
                    onClick={() => update({ weeklyHolidays: on ? draft.weeklyHolidays.filter((x) => x !== idx) : [...draft.weeklyHolidays, idx] })}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold ${
                      on ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/40' : 'border-slate-200 text-slate-500 dark:border-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              <StringListEditor
                label="Libur Khusus / Nasional (format: YYYY-MM-DD|Nama)"
                items={draft.specialHolidays.map((h) => `${h.date}|${h.name}`)}
                onChange={(items) =>
                  update({
                    specialHolidays: items
                      .map((s) => {
                        const [date, ...rest] = s.split('|');
                        return { date: date.trim(), name: rest.join('|').trim() };
                      })
                      .filter((h) => h.date),
                  })
                }
                placeholder="2026-08-17|Kemerdekaan RI"
              />
            </div>
          </SectionCard>

          {/* Loyalitas */}
          <SectionCard icon={<Award size={14} />} title="Program Loyalitas">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Min. Belanja / Poin (Rp)">
                <Input type="number" value={draft.loyalty.minSpend} onChange={(e) => update({ loyalty: { ...draft.loyalty, minSpend: Number(e.target.value) } })} />
              </Field>
              <Field label="Nilai 1 Poin (Rp)">
                <Input type="number" value={draft.loyalty.pointValue} onChange={(e) => update({ loyalty: { ...draft.loyalty, pointValue: Number(e.target.value) } })} />
              </Field>
              <Field label="Min. Tukar Poin">
                <Input type="number" value={draft.loyalty.minRedeem} onChange={(e) => update({ loyalty: { ...draft.loyalty, minRedeem: Number(e.target.value) } })} />
              </Field>
            </div>
          </SectionCard>

          {/* Kategori inventaris */}
          <SectionCard icon={<FolderTree size={14} />} title="Kategori Inventaris">
            <StringListEditor label="Kategori Stok" items={draft.inventoryCategories} onChange={(items) => update({ inventoryCategories: items })} placeholder="cth. Shampoo" />
          </SectionCard>

          {/* Appointment Klinik */}
          <SectionCard icon={<Stethoscope size={14} />} title="Appointment Klinik — Master">
            <StringListEditor label="Dokter Hewan" items={draft.doctors} onChange={(items) => update({ doctors: items })} placeholder="cth. drh. Ratna Wijaya" />
            <div className="mt-4">
              <StringListEditor label="Alasan Kunjungan (maks 2 dipilih per hewan)" items={draft.appointmentReasons} onChange={(items) => update({ appointmentReasons: items })} placeholder="cth. Vaksinasi" />
            </div>
            <div className="mt-4">
              <StringListEditor label="Master Keluhan (tiap keluhan punya kolom isian)" items={draft.appointmentComplaints} onChange={(items) => update({ appointmentComplaints: items })} placeholder="cth. Muntah" />
            </div>
            <div className="mt-4">
              <StringListEditor label="Pertanyaan Sebelum Datang" items={draft.appointmentPreVisitQuestions} onChange={(items) => update({ appointmentPreVisitQuestions: items })} placeholder="cth. Kapan keluhan muncul?" />
            </div>
          </SectionCard>

          <SectionCard icon={<Clock size={14} />} title="Appointment Klinik — Pengaturan">
            <StringListEditor label="Jam Praktik (slot 1 jam)" items={draft.appointmentSettings.sessionHours} onChange={(items) => update({ appointmentSettings: { ...draft.appointmentSettings, sessionHours: items } })} placeholder="cth. 09:00 - 10:00" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Kuota Hewan per Jam">
                <Input
                  type="number"
                  value={draft.appointmentSettings.maxPetsPerHour}
                  onChange={(e) => update({ appointmentSettings: { ...draft.appointmentSettings, maxPetsPerHour: Math.max(1, Number(e.target.value) || 2) } })}
                />
              </Field>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-xs font-semibold text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
                  <input
                    type="checkbox"
                    checked={draft.appointmentSettings.allowDoctorSelection}
                    onChange={(e) => update({ appointmentSettings: { ...draft.appointmentSettings, allowDoctorSelection: e.target.checked } })}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
                  />
                  <span>
                    Pelanggan <strong>boleh memilih dokter</strong>
                    <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                      Matikan bila dokter ditentukan otomatis
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <div className="mt-4">
              <Field label="Teks Informed Consent (setupable)" hint="Ditampilkan di langkah terakhir wizard appointment">
                <Textarea
                  rows={7}
                  value={draft.appointmentSettings.consentText}
                  onChange={(e) => update({ appointmentSettings: { ...draft.appointmentSettings, consentText: e.target.value } })}
                  className="text-xs"
                />
              </Field>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'whatsapp_templates' && (
        <WhatsAppTemplatesEditor templates={templates} onSave={(list) => saveTemplates.mutate(list)} />
      )}

      {tab === 'reservasi' && (
        <Card>
          <SectionTitle>Kelola Seluruh Reservasi ({reservations.length})</SectionTitle>
          <div className="custom-scrollbar max-h-[560px] overflow-y-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                <tr className="border-b border-slate-200 text-[10px] tracking-wide text-slate-400 uppercase dark:border-slate-800">
                  <th className="px-3 py-2 font-bold">Tanggal</th>
                  <th className="px-3 py-2 font-bold">Hewan</th>
                  <th className="px-3 py-2 font-bold">Pemilik</th>
                  <th className="px-3 py-2 font-bold">Paket</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-950/50">
                    <td className="px-3 py-2 font-mono text-[10.5px] whitespace-nowrap text-slate-500">{r.date}</td>
                    <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{r.petName}</td>
                    <td className="px-3 py-2 text-slate-500">{r.ownerName}</td>
                    <td className="px-3 py-2 text-slate-500">{r.packageType}</td>
                    <td className="px-3 py-2">
                      <Badge tone={r.status === 'Completed' ? 'emerald' : r.status === 'Cancelled' ? 'slate' : r.status === 'In_Progress' ? 'amber' : 'brand'}>
                        {r.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => onEditReservation(r)}>
                        <Edit3 size={12} /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetDemo}
        title="Reset seluruh data demo?"
        message="Semua data (reservasi, log, inventaris, POS, aktivitas, master data) akan dihapus dan diganti dengan data dummy baru bertanggal relatif hari ini. Ketik RESET untuk konfirmasi."
        confirmLabel="Reset Data Demo"
        confirmWord="RESET"
      />
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          {icon} {title}
        </span>
      </SectionTitle>
      {children}
    </Card>
  );
}

/** Editor daftar item generik dengan field bebas (untuk paket, addon, transport). */
function ItemListEditor<T extends Record<string, unknown>>({
  items,
  fields,
  onChange,
  renderPreview,
  emptyTemplate,
}: {
  items: T[];
  fields: string[];
  onChange: (items: T[]) => void;
  renderPreview: (item: T) => string;
  emptyTemplate: T;
}) {
  const [editIdx, setEditIdx] = useState(-1);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
          {editIdx === i ? (
            <div className="grid flex-1 grid-cols-1 gap-1.5 sm:grid-cols-3">
              {fields.map((f) => (
                <Input
                  key={f}
                  value={String(item[f] ?? '')}
                  onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, [f]: f === 'price' ? Number(e.target.value) : e.target.value } : it)))}
                  className="text-xs"
                  placeholder={f}
                />
              ))}
            </div>
          ) : (
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">{renderPreview(item)}</span>
          )}
          <div className="flex shrink-0 gap-1">
            {editIdx === i ? (
              <Button variant="success" size="sm" onClick={() => setEditIdx(-1)}>
                <Save size={12} />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditIdx(i)}>
                <Edit3 size={12} />
              </Button>
            )}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="cursor-pointer rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => { onChange([...items, { ...emptyTemplate }]); setEditIdx(items.length); }}>
        <Plus size={13} /> Tambah
      </Button>
    </div>
  );
}

/** Editor daftar string sederhana. */
function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [newItem, setNewItem] = useState('');
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="cursor-pointer text-slate-400 hover:text-rose-500">
              <X size={11} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-[11px] text-slate-400 italic">Belum ada.</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={placeholder || 'Tambah…'} className="text-xs" />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (newItem.trim()) {
              onChange([...items, newItem.trim()]);
              setNewItem('');
            }
          }}
        >
          <Plus size={13} />
        </Button>
      </div>
    </div>
  );
}

/** CRUD template WhatsApp. */
function WhatsAppTemplatesEditor({
  templates,
  onSave,
}: {
  templates: WhatsAppTemplate[];
  onSave: (list: WhatsAppTemplate[]) => void;
}) {
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppTemplate | null>(null);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle>Template Pesan WhatsApp</SectionTitle>
        <Button
          size="sm"
          onClick={() => setEditing({ id: `tpl-${Date.now()}`, title: '', content: '', category: 'Lainnya' })}
        >
          <Plus size={13} /> Template Baru
        </Button>
      </div>
      <div className="space-y-2">
        {templates.map((tpl) => (
          <div key={tpl.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{tpl.title}</p>
                <Badge tone="sky" className="mt-0.5">{tpl.category}</Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(tpl)}>
                  <Edit3 size={12} /> Edit
                </Button>
                <button onClick={() => setDeleteTarget(tpl)} className="cursor-pointer rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">{tpl.content}</p>
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.title || 'Template Baru'}
        icon={<MessageSquare size={18} />}
        footer={
          <Button
            size="sm"
            onClick={() => {
              if (editing) {
                onSave(templates.some((t) => t.id === editing.id) ? templates.map((t) => (t.id === editing.id ? editing : t)) : [...templates, editing]);
                setEditing(null);
                pushToast({ tone: 'success', title: 'Template tersimpan' });
              }
            }}
          >
            <Save size={13} /> Simpan
          </Button>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Judul Template" required>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="cth. Ucapan Terima Kasih" />
            </Field>
            <Field label="Kategori">
              <Select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as WhatsAppTemplateCategory })}>
                {(['Ucapan Terima Kasih', 'Konfirmasi', 'Pengingat', 'Lainnya'] as const).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Isi Pesan" hint="Variabel: {nama_pemilik}, {nama_hewan}, {jenis_hewan}, {jadwal}, {sesi_waktu}, {kontak}">
              <Textarea rows={5} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onSave(templates.filter((t) => t.id !== deleteTarget.id));
            setDeleteTarget(null);
          }
        }}
        title="Hapus template?"
        message={`Template "${deleteTarget?.title}" akan dihapus.`}
        confirmLabel="Hapus"
      />
    </Card>
  );
}