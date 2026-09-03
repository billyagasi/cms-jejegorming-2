import { Trash2, Minus, Plus, Cat, Dog, Rabbit, PawPrint } from 'lucide-react';
import { DraftPet } from './portalData';
import { formatRupiah } from '../../lib/format';
import { PetType, PackageItem, AddOnItem } from '../../types';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';

interface PetDraftCardProps {
  pet: DraftPet;
  index: number;
  packages: PackageItem[];
  addons: AddOnItem[];
  vaccines: string[];
  reservations: { petName: string; petType: PetType; petBreed: string; petGender?: string }[];
  canRemove: boolean;
  onChange: (id: string, field: keyof DraftPet, value: unknown) => void;
  onToggleAddon: (petId: string, addonName: string, addonPrice: number) => void;
  onAddonQty: (petId: string, addonName: string, change: number) => void;
  onRemove: (id: string) => void;
}

const petTypeOptions: { value: PetType; label: string; emoji: typeof Cat }[] = [
  { value: 'Kucing', label: 'Kucing', emoji: Cat },
  { value: 'Anjing', label: 'Anjing', emoji: Dog },
  { value: 'Kelinci', label: 'Kelinci', emoji: Rabbit },
  { value: 'Lainnya', label: 'Lainnya', emoji: PawPrint },
];

function PetIcon({ type }: { type: PetType }) {
  const opt = petTypeOptions.find((o) => o.value === type) || petTypeOptions[3];
  const Emoji = opt.emoji;
  return <Emoji size={16} />;
}

export default function PetDraftCard({
  pet,
  index,
  packages,
  addons,
  vaccines,
  reservations,
  canRemove,
  onChange,
  onToggleAddon,
  onAddonQty,
  onRemove,
}: PetDraftCardProps) {
  const basePrice = packages.find((pkg) => pkg.name === pet.packageType)?.price || 0;
  const addonsPrice = pet.selectedAddOns.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = basePrice + addonsPrice;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-display flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
            {index + 1}
          </span>
          Data Hewan #{index + 1}
        </h4>
        <button
          type="button"
          disabled={!canRemove}
          onClick={() => onRemove(pet.id)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/40"
          title={canRemove ? 'Hapus hewan ini' : 'Minimal 1 hewan'}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nama Peliharaan" required hint="Nama terdaftar: data terisi otomatis">
          <Input
            value={pet.petName}
            onChange={(e) => {
              const val = e.target.value;
              const match = reservations.find((r) => r.petName && r.petName.trim().toLowerCase() === val.trim().toLowerCase());
              if (match) {
                onChange(pet.id, 'petName', val);
                onChange(pet.id, 'petType', match.petType || 'Kucing');
                onChange(pet.id, 'petBreed', match.petBreed || '');
                onChange(pet.id, 'petGender', match.petGender || 'Jantan');
              } else {
                onChange(pet.id, 'petName', val);
              }
            }}
            placeholder="Contoh: Milo"
          />
        </Field>
        <Field label="Jenis Hewan">
          <Select value={pet.petType} onChange={(e) => onChange(pet.id, 'petType', e.target.value)}>
            {petTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ras / Breed" required>
          <Input value={pet.petBreed} onChange={(e) => onChange(pet.id, 'petBreed', e.target.value)} placeholder="Contoh: Persia Peaknose" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Usia">
            <Input value={pet.petAge} onChange={(e) => onChange(pet.id, 'petAge', e.target.value)} placeholder="cth. 2 Tahun" />
          </Field>
          <Field label="Kelamin">
            <Select value={pet.petGender} onChange={(e) => onChange(pet.id, 'petGender', e.target.value)}>
              <option>Jantan</option>
              <option>Betina</option>
            </Select>
          </Field>
        </div>
        <Field label="Riwayat Vaksin">
          <Select value={pet.petVaccine} onChange={(e) => onChange(pet.id, 'petVaccine', e.target.value)}>
            {vaccines.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan Kesehatan">
          <Input value={pet.healthNotes} onChange={(e) => onChange(pet.id, 'healthNotes', e.target.value)} placeholder="Alergi, kondisi khusus…" />
        </Field>
        <Field label="Preferensi Khusus" className="md:col-span-2">
          <Input
            value={pet.specialPreferences}
            onChange={(e) => onChange(pet.id, 'specialPreferences', e.target.value)}
            placeholder="Model potongan, produk khusus…"
          />
        </Field>
      </div>

      {/* Paket */}
      <div className="mt-4">
        <Field label="Paket Grooming" required>
          <Select value={pet.packageType} onChange={(e) => onChange(pet.id, 'packageType', e.target.value)}>
            {packages.map((pkg) => (
              <option key={pkg.name} value={pkg.name}>
                {pkg.name} — {formatRupiah(pkg.price)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Add-ons */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Layanan Tambahan</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {addons.map((addon) => {
            const selected = pet.selectedAddOns.find((item) => item.name === addon.name);
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
                  onClick={() => onToggleAddon(pet.id, addon.name, addon.price)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {selected && <span className="text-[9px] text-white">✓</span>}
                  </span>
                  <span className="min-w-0 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                    {addon.name} · {formatRupiah(addon.price)}
                  </span>
                </button>
                {selected && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAddonQty(pet.id, addon.name, -1)}
                      className="rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-4 text-center font-mono text-[11px] font-bold">{selected.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onAddonQty(pet.id, addon.name, 1)}
                      className="rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2.5 text-white dark:bg-slate-950">
        <span className="text-xs font-semibold">Estimasi Subtotal Ekor Ini:</span>
        <span className="font-mono text-sm font-bold text-brand-300">{formatRupiah(subtotal)}</span>
      </div>
    </div>
  );
}