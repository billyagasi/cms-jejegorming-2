import { ChevronDown, AlertTriangle } from 'lucide-react';
import { DraftApptPet, MAX_REASONS } from './appointmentData';
import { Field, Input, Select } from '../../components/ui/Input';
import { PetType } from '../../types';

const petTypeOptions: { value: PetType; label: string; emoji: string }[] = [
  { value: 'Kucing', label: 'Kucing', emoji: '🐱' },
  { value: 'Anjing', label: 'Anjing', emoji: '🐶' },
  { value: 'Kelinci', label: 'Kelinci', emoji: '🐰' },
  { value: 'Lainnya', label: 'Lainnya', emoji: '🐾' },
];

function petEmoji(type: string): string {
  return petTypeOptions.find((o) => o.value === type)?.emoji || '🐾';
}

interface PetIdentityCardProps {
  pet: DraftApptPet;
  index: number;
  vaccines: string[];
  reasons: string[];
  canRemove: boolean;
  onChange: (id: number, field: keyof DraftApptPet, value: unknown) => void;
  onRemove: (index: number) => void;
  onError: (msg: string) => void;
}

/** Step 3: identitas hewan + alasan kunjungan (collapse, maks 2) */
export function PetIdentityCard({
  pet,
  index,
  vaccines,
  reasons,
  canRemove,
  onChange,
  onRemove,
  onError,
}: PetIdentityCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-display flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
            {index + 1}
          </span>
          {petEmoji(pet.petType)} Hewan #{index + 1}
        </h4>
        <button
          type="button"
          disabled={!canRemove}
          onClick={() => onRemove(index)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/40"
          title={canRemove ? 'Hapus hewan ini' : 'Minimal 1 hewan'}
        >
          🗑
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nama Hewan" required>
          <Input value={pet.petName} onChange={(e) => onChange(index, 'petName', e.target.value)} placeholder="Contoh: Bona" />
        </Field>
        <Field label="Jenis Hewan">
          <Select value={pet.petType} onChange={(e) => onChange(index, 'petType', e.target.value)}>
            {petTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ras / Breed" required>
          <Input value={pet.petBreed} onChange={(e) => onChange(index, 'petBreed', e.target.value)} placeholder="Contoh: Poodle Toy" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Usia">
            <Input value={pet.petAge} onChange={(e) => onChange(index, 'petAge', e.target.value)} placeholder="cth. 1 Tahun" />
          </Field>
          <Field label="Kelamin">
            <Select value={pet.petGender} onChange={(e) => onChange(index, 'petGender', e.target.value)}>
              <option>Jantan</option>
              <option>Betina</option>
            </Select>
          </Field>
        </div>
        <Field label="Riwayat Vaksin">
          <Select value={pet.petVaccine} onChange={(e) => onChange(index, 'petVaccine', e.target.value)}>
            {vaccines.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan Kesehatan">
          <Input value={pet.healthNotes} onChange={(e) => onChange(index, 'healthNotes', e.target.value)} placeholder="Alergi, kondisi khusus…" />
        </Field>
      </div>

      {/* Alasan kunjungan — collapse, maks 2 */}
      <ReasonCollapse
        reasons={reasons}
        selected={pet.reasons}
        onToggle={(name) => {
          const has = pet.reasons.includes(name);
          if (has) {
            onChange(index, 'reasons', pet.reasons.filter((r) => r !== name));
          } else {
            if (pet.reasons.length >= MAX_REASONS) {
              onError(`Maksimal ${MAX_REASONS} alasan kunjungan untuk ${pet.petName || 'hewan ini'}.`);
              return;
            }
            onChange(index, 'reasons', [...pet.reasons, name]);
          }
        }}
      />
    </div>
  );
}

function ReasonCollapse({
  reasons,
  selected,
  onToggle,
}: {
  reasons: string[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <details className="group mt-4 rounded-xl border border-slate-200 dark:border-slate-800" open>
      <summary className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 list-none dark:bg-slate-950/50 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
        <span>
          Alasan Kunjungan{' '}
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${selected.length >= MAX_REASONS ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700'}`}>
            {selected.length}/{MAX_REASONS} dipilih
          </span>
        </span>
        <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-wrap gap-1.5 p-3">
        {reasons.map((r) => {
          const on = selected.includes(r);
          return (
            <button
              type="button"
              key={r}
              onClick={() => onToggle(r)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                on
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-slate-300 text-slate-600 hover:border-brand-400 dark:border-slate-600 dark:text-slate-300'
              }`}
            >
              {on ? '✓ ' : ''}
              {r}
            </button>
          );
        })}
        <span className="inline-flex items-center text-[10px] font-medium text-slate-400 italic">
          <AlertTriangle size={11} className="mr-1 text-amber-500" />
          maks. {MAX_REASONS} alasan per hewan
        </span>
      </div>
    </details>
  );
}
