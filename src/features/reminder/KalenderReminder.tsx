import { useMemo, useState } from 'react';
import { BellRing, ChevronLeft, ChevronRight, Copy, Send, RotateCcw, Save, Search } from 'lucide-react';
import { Reservation } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { useReservations } from '../../data-layer/hooks';
import { loadFromStorage, saveToStorage } from '../../data-layer/storage';
import { copyToClipboard, waLink, formatDayDateID, MONTHS_ID, DAYS_ID } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

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