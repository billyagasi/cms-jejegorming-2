import { useMemo, useState } from 'react';
import { Package, Search, Plus, Minus, Pencil, Trash2, Copy, MessageSquare, KeyRound, Save, X } from 'lucide-react';
import { InventoryItem } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Tabs from '../../components/ui/Tabs';
import { Field, Input, Select } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/Section';
import { useAppConfig, useInventory, useSaveInventoryItem, useDeleteInventoryItem, useAddActivityLog } from '../../data-layer/hooks';
import { useAppStore, useOwnerStore } from '../../app/store';
import { copyToClipboard, formatRupiah, todayISO, waLink } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

const CATEGORY_EMOJI: Record<string, string> = {
  Shampoo: '🧴',
  Parfum: '🌸',
  Alat: '✂️',
  Lainnya: '📦',
};

export default function InventoryManager() {
  const { data: config } = useAppConfig();
  const { data: items = [] } = useInventory();
  const saveItem = useSaveInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const addActivityLog = useAddActivityLog();
  const isOwnerAuthenticated = useOwnerStore((s) => s.isOwnerAuthenticated);

  const categories = config?.inventoryCategories ?? ['Shampoo', 'Parfum', 'Alat', 'Lainnya'];

  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Low' | 'Aman'>('All');
  const [editingId, setEditingId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // Add form
  const [form, setForm] = useState({
    name: '',
    category: categories[0] || 'Lainnya',
    unit: 'Pcs',
    stock: 0,
    minStock: 3,
    purchaseDate: todayISO(),
    expiredDate: '',
    sellingPrice: 0,
    purchasePrice: 0,
  });

  const lowStock = items.filter((i) => i.stock <= i.minStock);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) => {
      const matchesSearch = !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'All' || i.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'All' || (statusFilter === 'Low' ? i.stock <= i.minStock : i.stock > i.minStock);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const restockRecap = lowStock
    .map((i) => `- ${i.name} (${i.category}): sisa ${i.stock} ${i.unit} [min. ${i.minStock}]`)
    .join('\n');
  const recapText = lowStock.length
    ? `📦 REKAP RESTOCK JEJE PET CARE\n\nMohon ketersediaan item berikut:\n\n${restockRecap}\n\nTerima kasih!`
    : '';

  const handleAdd = () => {
    if (!form.name.trim()) {
      pushToast({ tone: 'error', title: 'Nama item wajib diisi' });
      return;
    }
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      stock: form.stock,
      minStock: form.minStock,
      lastUpdated: todayISO(),
      purchaseDate: form.purchaseDate || undefined,
      expiredDate: form.expiredDate || undefined,
      sellingPrice: form.sellingPrice || undefined,
      purchasePrice: isOwnerAuthenticated ? form.purchasePrice || undefined : undefined,
    };
    saveItem.mutate(newItem, {
      onSuccess: () => {
        addActivityLog.mutate({
          id: `act-${Date.now()}`,
          staffName: useAppStore.getState().session?.username || 'Kasir',
          role: useAppStore.getState().session?.role || 'Inventaris',
          action: 'Tambah Inventaris',
          timestamp: new Date().toISOString(),
          targetId: newItem.id,
          targetName: newItem.name,
          details: `Item baru ${newItem.name} (${newItem.stock} ${newItem.unit})`,
        });
        pushToast({ tone: 'success', title: 'Item Ditambahkan', message: newItem.name });
        setForm((f) => ({ ...f, name: '', stock: 0 }));
        setShowAddForm(false);
      },
    });
  };

  const handleQuickStock = (item: InventoryItem, delta: number) => {
    saveItem.mutate({ ...item, stock: Math.max(0, item.stock + delta), lastUpdated: todayISO() });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => pushToast({ tone: 'success', title: 'Item Dihapus', message: deleteTarget.name }),
    });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Item" value={items.length} tone="brand" icon={<Package size={18} />} />
        <StatCard label="Perlu Restock" value={lowStock.length} tone="rose" hint="Stok ≤ batas minimum" />
        <StatCard label="Stok Aman" value={items.length - lowStock.length} tone="emerald" />
      </div>

      {/* Toolbar */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Cari nama item / kategori…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Tabs
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { id: 'All', label: 'Semua' },
              { id: 'Low', label: 'Low Stock' },
              { id: 'Aman', label: 'Aman' },
            ]}
          />
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={14} /> Tambah Item
          </Button>
        </div>

        {/* Category chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['All', ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                categoryFilter === cat
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              {cat === 'All' ? '📦 Semua' : `${CATEGORY_EMOJI[cat] || '📦'} ${cat}`}
            </button>
          ))}
        </div>

        {/* Form tambah */}
        {showAddForm && (
          <div className="animate-slide-up mt-4 grid gap-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-brand-800 dark:bg-brand-950/20">
            <Field label="Nama Item" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth. Sampo Premium Lavender" />
            </Field>
            <Field label="Kategori">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Satuan">
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {['Pcs', 'Botol', 'Liter', 'Set', 'Pack'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Stok">
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
              </Field>
              <Field label="Min. Stok">
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Harga Jual (Rp)">
              <Input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
            </Field>
            {isOwnerAuthenticated ? (
              <Field label="Harga Beli (Owner Only)">
                <Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
              </Field>
            ) : (
              <div className="flex items-end pb-1 text-[11px] font-semibold text-rose-500">
                <KeyRound size={12} className="mr-1" /> Harga beli: khusus owner
              </div>
            )}
            <Field label="Tgl Beli">
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </Field>
            <Field label="Tgl Kedaluwarsa">
              <Input type="date" value={form.expiredDate} onChange={(e) => setForm({ ...form, expiredDate: e.target.value })} />
            </Field>
            <div className="flex items-end gap-2">
              <Button size="sm" variant="success" onClick={handleAdd}>
                <Save size={13} /> Simpan
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowAddForm(false)}>
                <X size={13} /> Batal
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Restock recap */}
      {lowStock.length > 0 && (
        <Card className="bg-slate-900 dark:bg-slate-950">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-white">📋 Rekap Restock Otomatis ({lowStock.length} item)</h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (await copyToClipboard(recapText)) pushToast({ tone: 'success', title: 'Rekap disalin ke clipboard' });
                }}
              >
                <Copy size={13} /> Salin Teks
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => window.open(waLink('', recapText), '_blank')}
                title="Buka WhatsApp dengan teks rekap"
              >
                <MessageSquare size={13} /> WhatsApp Supplier
              </Button>
            </div>
          </div>
          <pre className="font-mono overflow-x-auto rounded-lg bg-slate-950/70 p-3 text-[11px] leading-relaxed text-brand-200">{recapText}</pre>
        </Card>
      )}

      {/* Tabel */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<Package size={22} />} title="Belum ada item inventaris" description="Tambahkan item pertama melalui tombol 'Tambah Item'." />
        ) : (
          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] tracking-wide text-slate-400 uppercase dark:border-slate-800">
                  <th className="px-3 py-2.5 font-bold">Nama Item</th>
                  <th className="px-3 py-2.5 font-bold">Kategori</th>
                  <th className="px-3 py-2.5 font-bold">Stok</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="px-3 py-2.5 font-bold">Harga Jual</th>
                  {isOwnerAuthenticated && <th className="px-3 py-2.5 font-bold">Harga Beli</th>}
                  <th className="px-3 py-2.5 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    onStartEdit={() => setEditingId(item.id)}
                    onEndEdit={() => setEditingId('')}
                    onSave={(fields) => {
                      saveItem.mutate({ ...item, ...fields, lastUpdated: todayISO() });
                      setEditingId('');
                    }}
                    onQuickStock={(d) => handleQuickStock(item, d)}
                    onDelete={() => setDeleteTarget(item)}
                    isOwner={isOwnerAuthenticated}
                    expired={!!item.expiredDate && new Date(item.expiredDate) <= new Date()}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus item inventaris?"
        message={`Item "${deleteTarget?.name}" akan dihapus permanen dari stok.`}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
}

function InventoryRow({
  item,
  isEditing,
  onStartEdit,
  onEndEdit,
  onSave,
  onQuickStock,
  onDelete,
  isOwner,
  expired,
}: {
  item: InventoryItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onSave: (fields: Partial<InventoryItem>) => void;
  onQuickStock: (delta: number) => void;
  onDelete: () => void;
  isOwner: boolean;
  expired: boolean;
}) {
  const [draft, setDraft] = useState(item);
  const low = item.stock <= item.minStock;

  if (isEditing) {
    return (
      <tr className="border-t border-slate-100 bg-brand-50/40 dark:border-slate-800 dark:bg-brand-950/20">
        <td className="px-3 py-2">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="text-xs" />
        </td>
        <td className="px-3 py-2">
          <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="w-24 text-xs" />
        </td>
        <td className="px-3 py-2" colSpan={2}>
          <div className="flex items-center gap-1.5">
            <Input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} className="w-16 text-xs" />
            <Input type="number" value={draft.minStock} onChange={(e) => setDraft({ ...draft, minStock: Number(e.target.value) })} className="w-16 text-xs" />
            <Input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="w-16 text-xs" />
          </div>
        </td>
        <td className="px-3 py-2">
          <Input type="number" value={draft.sellingPrice ?? 0} onChange={(e) => setDraft({ ...draft, sellingPrice: Number(e.target.value) })} className="w-24 text-xs" />
        </td>
        {isOwner && (
          <td className="px-3 py-2">
            <Input type="number" value={draft.purchasePrice ?? 0} onChange={(e) => setDraft({ ...draft, purchasePrice: Number(e.target.value) })} className="w-24 text-xs" />
          </td>
        )}
        <td className="px-3 py-2 text-right">
          <div className="flex justify-end gap-1">
            <Button variant="success" size="sm" onClick={() => onSave(draft)}>
              <Save size={12} />
            </Button>
            <Button variant="secondary" size="sm" onClick={onEndEdit}>
              <X size={12} />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-950/50 ${expired ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}`}>
      <td className="px-3 py-2">
        <p className="font-bold text-slate-700 dark:text-slate-200">
          {CATEGORY_EMOJI[item.category] || '📦'} {item.name}
        </p>
        {expired && <Badge tone="rose" className="mt-0.5 animate-pulse-soft">Kedaluwarsa!</Badge>}
      </td>
      <td className="px-3 py-2 text-slate-500">{item.category}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button onClick={() => onQuickStock(-1)} className="cursor-pointer rounded border border-slate-200 p-0.5 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <Minus size={11} />
          </button>
          <span className={`w-10 text-center font-mono text-xs font-bold ${low ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
            {item.stock}
          </span>
          <button onClick={() => onQuickStock(1)} className="cursor-pointer rounded border border-slate-200 p-0.5 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <Plus size={11} />
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        <Badge tone={low ? 'rose' : 'emerald'}>{low ? `Low (${item.minStock})` : 'Aman'}</Badge>
      </td>
      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{item.sellingPrice ? formatRupiah(item.sellingPrice) : '-'}</td>
      {isOwner && <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{item.purchasePrice ? formatRupiah(item.purchasePrice) : '-'}</td>}
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1">
          <button onClick={onStartEdit} className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800" title="Edit item">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="cursor-pointer rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" title="Hapus item">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}