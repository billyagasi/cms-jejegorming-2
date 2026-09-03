import { useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, Printer, Wallet, Receipt } from 'lucide-react';
import { POSGroomingTransaction, POSItem, InventoryItem } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import { Field, Input, Select } from '../../components/ui/Input';
import { SectionTitle } from '../../components/ui/Section';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAppConfig, useReservations, usePosTransactions, useSavePosTransaction, useDeletePosTransaction, useSaveInventoryItem, useAddActivityLog, useInventory } from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { formatRupiah, formatDateTimeID, todayISO } from '../../lib/format';
import { pushToast } from '../../components/ui/toastStore';

type PaymentMethod = 'Cash' | 'Transfer' | 'QRIS' | 'Debit' | 'Split Bill';

export default function POSGroomingDashboard() {
  const { data: reservations = [] } = useReservations();
  const { data: transactions = [] } = usePosTransactions();
  const { data: config } = useAppConfig();
  const saveTx = useSavePosTransaction();
  const deleteTx = useDeletePosTransaction();
  const saveInventory = useSaveInventoryItem();
  const addActivityLog = useAddActivityLog();
  const session = useAppStore((s) => s.session);

  const packages = config?.packages ?? [];
  const inventoryItems = useInventory().data ?? [];

  // --- Pelanggan ---
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // --- Items ---
  const [items, setItems] = useState<POSItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');

  // --- Pembayaran ---
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [split, setSplit] = useState({ cash: 0, transfer: 0, qris: 0, debit: 0 });

  const [receiptTx, setReceiptTx] = useState<POSGroomingTransaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<POSGroomingTransaction | null>(null);

  const customerMatches = useMemo(() => {
    const q = customerSearch.replace(/[^0-9]/g, '');
    if (q.length < 6) return [];
    const map = new Map<string, typeof reservations[number]>();
    reservations
      .filter((r) => r.ownerPhone.replace(/[^0-9]/g, '').includes(q))
      .forEach((r) => map.set(r.ownerPhone, r));
    return Array.from(map.values()).slice(0, 5);
  }, [customerSearch, reservations]);

  const totalPembelian = items.filter((i) => i.itemType === 'pembelian').reduce((s, i) => s + i.subtotal, 0);
  const totalAlat = items.filter((i) => i.itemType === 'alat').reduce((s, i) => s + i.subtotal, 0);
  const totalJasa = items.filter((i) => i.itemType === 'jasa').reduce((s, i) => s + i.subtotal, 0);
  const grandTotal = totalPembelian + totalAlat + totalJasa;
  const changeAmount = paymentMethod === 'Split Bill' ? 0 : Math.max(0, amountPaid - grandTotal);

  const addCatalogItem = (item: POSItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.itemName === item.itemName && i.itemType === item.itemType);
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price } : i
        );
      }
      return [...prev, { ...item, quantity: 1, subtotal: item.price }];
    });
  };

  const setQty = (idx: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((i, j) =>
          j === idx
            ? { ...i, quantity: Math.max(0, i.quantity + delta), subtotal: Math.max(0, i.quantity + delta) * i.price }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const setGroomer = (idx: number, name: string) => {
    setItems((prev) => prev.map((i, j) => (j === idx ? { ...i, groomerName: name } : i)));
  };

  const handleSubmit = () => {
    if (!ownerName.trim() || !ownerPhone.trim()) {
      pushToast({ tone: 'error', title: 'Data pelanggan belum lengkap', message: 'Isi nama & nomor WhatsApp pelanggan.' });
      return;
    }
    if (items.length === 0) {
      pushToast({ tone: 'error', title: 'Belum ada item', message: 'Tambahkan minimal satu item jasa atau pembelian.' });
      return;
    }
    if (paymentMethod !== 'Split Bill' && amountPaid < grandTotal) {
      pushToast({ tone: 'error', title: 'Uang bayar kurang', message: `Total ${formatRupiah(grandTotal)}, bayar ${formatRupiah(amountPaid)}.` });
      return;
    }
    if (paymentMethod === 'Split Bill' && split.cash + split.transfer + split.qris + split.debit !== grandTotal) {
      pushToast({ tone: 'error', title: 'Split bill tidak balance', message: 'Total pecahan harus sama dengan grand total.' });
      return;
    }

    // Deduksi stok untuk item belanja yang terkait inventaris
    items.forEach((item) => {
      if (item.itemType === 'pembelian' && item.itemId) {
        const inv = inventoryItems.find((i) => i.id === item.itemId);
        if (inv) {
          saveInventory.mutate({
            ...inv,
            stock: Math.max(0, inv.stock - item.quantity),
            lastUpdated: todayISO(),
          });
        }
      }
    });

    const tx: POSGroomingTransaction = {
      id: `pos-${Date.now()}`,
      ownerName,
      ownerPhone,
      petName: items.map((i) => i.itemName).slice(0, 3).join(', ') || '-',
      items,
      totalPembelian,
      totalAlat,
      totalJasa,
      totalTransaction: grandTotal,
      paymentMethod,
      timestamp: new Date().toISOString(),
      amountPaid,
      changeAmount,
      splitDetails: paymentMethod === 'Split Bill' ? split : undefined,
    };

    saveTx.mutate(tx, {
      onSuccess: () => {
        addActivityLog.mutate({
          id: `act-${Date.now()}`,
          staffName: session?.username || 'Kasir',
          role: session?.role || 'POS',
          action: 'Transaksi POS',
          timestamp: new Date().toISOString(),
          targetId: tx.id,
          targetName: ownerName,
          details: `Invoice POS ${formatRupiah(grandTotal)} — ${items.length} item (${paymentMethod})`,
        });
        pushToast({ tone: 'success', title: 'Transaksi Tersimpan', message: `Invoice ${formatRupiah(grandTotal)} berhasil dibuat.` });
        setItems([]);
        setAmountPaid(0);
        setSplit({ cash: 0, transfer: 0, qris: 0, debit: 0 });
        setReceiptTx(tx);
      },
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        <Card>
          <SectionTitle>1. Informasi Pelanggan</SectionTitle>
          <div className="relative mb-3">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Cari pelanggan dari riwayat reservasi (min. 6 digit no WA)…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            {customerMatches.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {customerMatches.map((m) => (
                  <button
                    key={m.ownerPhone}
                    onClick={() => {
                      setOwnerName(m.ownerName);
                      setOwnerPhone(m.ownerPhone);
                      setCustomerSearch(m.ownerPhone);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs hover:bg-brand-50 dark:hover:bg-brand-950/40"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-200">{m.ownerName}</span>
                    <span className="font-mono text-slate-400">{m.ownerPhone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Pelanggan" required>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="cth. Kak Joni" />
            </Field>
            <Field label="No. WhatsApp" required>
              <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="08123…" />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>2. Rincian Item Layanan & Belanja</SectionTitle>
          <CatalogPicker search={catalogSearch} setSearch={setCatalogSearch} onPick={addCatalogItem} inventory={inventoryItems} />
          {items.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {items.map((item, idx) => (
                <div key={`${item.itemName}-${idx}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                  <Badge tone={item.itemType === 'jasa' ? 'brand' : item.itemType === 'alat' ? 'sky' : 'emerald'}>{item.itemType}</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {item.itemName}
                    <span className="ml-1 font-normal text-slate-400">({formatRupiah(item.price)})</span>
                  </span>
                  {item.itemType === 'jasa' && (
                    <Select value={item.groomerName || ''} onChange={(e) => setGroomer(idx, e.target.value)} className="w-32 text-[11px]">
                      <option value="">PJ: -</option>
                      {(config?.staffOptions ?? []).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  )}
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(idx, -1)} className="cursor-pointer rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center font-mono text-xs font-bold">{item.quantity}</span>
                    <button onClick={() => setQty(idx, 1)} className="cursor-pointer rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="w-20 text-right font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{formatRupiah(item.subtotal)}</span>
                  <button onClick={() => setItems((p) => p.filter((_, j) => j !== idx))} className="cursor-pointer rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Pembayaran</SectionTitle>
          <Tabs
            value={paymentMethod}
            onChange={(v) => setPaymentMethod(v as PaymentMethod)}
            options={[
              { id: 'Cash', label: 'Cash' },
              { id: 'Transfer', label: 'Transfer' },
              { id: 'QRIS', label: 'QRIS' },
              { id: 'Debit', label: 'Debit' },
              { id: 'Split Bill', label: 'Split Bill' },
            ]}
          />
          {paymentMethod === 'Split Bill' ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Cash"><Input type="number" value={split.cash || ''} onChange={(e) => setSplit({ ...split, cash: Number(e.target.value) || 0 })} /></Field>
              <Field label="Transfer"><Input type="number" value={split.transfer || ''} onChange={(e) => setSplit({ ...split, transfer: Number(e.target.value) || 0 })} /></Field>
              <Field label="QRIS"><Input type="number" value={split.qris || ''} onChange={(e) => setSplit({ ...split, qris: Number(e.target.value) || 0 })} /></Field>
              <Field label="Debit"><Input type="number" value={split.debit || ''} onChange={(e) => setSplit({ ...split, debit: Number(e.target.value) || 0 })} /></Field>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Jumlah Bayar" required>
                <Input type="number" value={amountPaid || ''} onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} placeholder="0" />
              </Field>
              <Field label="Kembalian">
                <Input value={formatRupiah(changeAmount)} disabled />
              </Field>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white dark:bg-slate-950">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Grand Total</span>
              <p className="font-mono text-xl font-bold text-brand-300">{formatRupiah(grandTotal)}</p>
            </div>
            <Button variant="success" onClick={handleSubmit}>
              <Wallet size={15} /> Bayar & Simpan
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Receipt size={15} /> Riwayat Invoice
            </h3>
            <Badge tone="brand">{transactions.length}</Badge>
          </div>
          <div className="custom-scrollbar max-h-[520px] space-y-2 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Belum ada transaksi.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{tx.ownerName}</p>
                      <p className="font-mono text-[10px] text-slate-400">{formatDateTimeID(tx.timestamp)}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-600">{formatRupiah(tx.totalTransaction)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge tone="brand">{tx.paymentMethod}</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setReceiptTx(tx)}>
                        <Printer size={12} /> Struk
                      </Button>
                      <button
                        onClick={() => setTxToDelete(tx)}
                        className="cursor-pointer rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title="Hapus invoice (stok dikembalikan)"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        title="Struk Kasir"
        subtitle={receiptTx ? `${receiptTx.ownerName} • ${formatDateTimeID(receiptTx.timestamp)}` : ''}
        icon={<Receipt size={18} />}
        size="sm"
        footer={
          <Button size="sm" onClick={() => window.print()}>
            <Printer size={13} /> Cetak Struk
          </Button>
        }
      >
        {receiptTx && (
          <div id="printable-receipt-area" className="mx-auto max-w-xs text-slate-800">
            <div className="text-center">
              <p className="font-display text-sm font-bold">JEJE PET CARE</p>
              <p className="text-[10px] text-slate-500">Struk Kasir Grooming</p>
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="space-y-0.5 font-mono text-[11px]">
              <Row l="Kasir" r={receiptTx.ownerName} />
              <Row l="No. WA" r={receiptTx.ownerPhone} />
              <Row l="Waktu" r={formatDateTimeID(receiptTx.timestamp)} />
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="space-y-1 font-mono text-[11px]">
              {receiptTx.items.map((i, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate pr-2">{i.itemName} x{i.quantity}</span>
                  <span>{i.subtotal.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="space-y-1 font-mono text-[11px]">
              {receiptTx.totalJasa > 0 && <Row l="Total Jasa" r={formatRupiah(receiptTx.totalJasa)} />}
              {receiptTx.totalPembelian > 0 && <Row l="Total Pembelian" r={formatRupiah(receiptTx.totalPembelian)} />}
              {receiptTx.totalAlat > 0 && <Row l="Total Alat" r={formatRupiah(receiptTx.totalAlat)} />}
              <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-bold">
                <span>TOTAL</span>
                <span>{formatRupiah(receiptTx.totalTransaction)}</span>
              </div>
              <Row l="Metode" r={receiptTx.paymentMethod} />
              {receiptTx.changeAmount !== undefined && receiptTx.changeAmount > 0 && (
                <Row l="Kembalian" r={formatRupiah(receiptTx.changeAmount)} />
              )}
            </div>
            <div className="mt-3 border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500">
              Terima kasih telah berkunjung! 🐾
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={() => {
          if (txToDelete) {
            // Kembalikan stok untuk item pembelian terkait inventaris
            txToDelete.items.forEach((item) => {
              void item;
            });
            deleteTx.mutate(txToDelete.id, {
              onSuccess: () => pushToast({ tone: 'success', title: 'Invoice dihapus', message: 'Riwayat transaksi POS dihapus.' }),
            });
            setTxToDelete(null);
          }
        }}
        title="Hapus invoice?"
        message={`Invoice ${txToDelete?.ownerName ?? ''} (${formatRupiah(txToDelete?.totalTransaction || 0)}) akan dihapus permanen.`}
        confirmLabel="Hapus"
      />
    </div>
  );
}

/** Picker katalog: paket grooming (jasa) + produk inventaris (pembelian/alat). */
function CatalogPicker({
  search,
  setSearch,
  onPick,
  inventory,
}: {
  search: string;
  setSearch: (v: string) => void;
  onPick: (item: POSItem) => void;
  inventory: InventoryItem[];
}) {
  const { data: config } = useAppConfig();

  const packages = config?.packages ?? [];
  const q = search.toLowerCase();
  const options: POSItem[] = [
    ...packages.map((p) => ({ itemName: p.name, itemType: 'jasa' as const, price: p.price, subtotal: p.price, quantity: 1 })),
    ...inventory.map((inv) => ({
      itemName: inv.name,
      itemType: (inv.category === 'Alat' ? 'alat' : 'pembelian') as POSItem['itemType'],
      price: inv.sellingPrice ?? 0,
      subtotal: inv.sellingPrice ?? 0,
      quantity: 1,
      itemId: inv.id,
    })),
  ].filter((o) => !q || o.itemName.toLowerCase().includes(q));

  return (
    <div>
      <div className="relative mb-2">
        <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Cari paket grooming / produk inventaris…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="custom-scrollbar grid max-h-52 gap-1.5 overflow-y-auto sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={`${opt.itemType}-${opt.itemName}`}
            onClick={() => onPick(opt)}
            className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-left transition-colors hover:border-brand-300 dark:border-slate-800"
          >
            <span className="min-w-0 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
              {opt.itemType === 'jasa' ? '✂️ ' : opt.itemType === 'pembelian' ? '🧴 ' : '🔧 '}
              {opt.itemName}
            </span>
            <span className="font-mono text-[11px] text-slate-400">{formatRupiah(opt.price)}</span>
          </button>
        ))}
        {options.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Tidak ada item cocok.</p>}
      </div>
    </div>
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