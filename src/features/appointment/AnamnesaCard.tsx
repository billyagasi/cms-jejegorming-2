import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { DraftApptPet } from './appointmentData';
import { Field, Input, Textarea } from '../../components/ui/Input';

interface AnamnesaCardProps {
  pet: DraftApptPet;
  index: number;
  complaintsMaster: string[];
  questionsMaster: string[];
  onChange: (index: number, field: keyof DraftApptPet, value: unknown) => void;
  onError: (msg: string) => void;
}

/** Step 4: anamnesa per hewan — cerita kondisi, keluhan multiple (collapse), pertanyaan pre-visit (skippable). */
export default function AnamnesaCard({
  pet,
  index,
  complaintsMaster,
  questionsMaster,
  onChange,
  onError,
}: AnamnesaCardProps) {
  const toggleComplaint = (name: string) => {
    const has = pet.complaints.find((c) => c.name === name);
    if (has) {
      onChange(index, 'complaints', pet.complaints.filter((c) => c.name !== name));
    } else {
      onChange(index, 'complaints', [...pet.complaints, { name, detail: '' }]);
    }
  };

  const setComplaintDetail = (name: string, detail: string) => {
    onChange(
      index,
      'complaints',
      pet.complaints.map((c) => (c.name === name ? { ...c, detail } : c))
    );
  };

  const setAnswer = (question: string, answer: string) => {
    const existing = pet.preVisitAnswers.find((a) => a.question === question);
    if (existing) {
      onChange(
        index,
        'preVisitAnswers',
        pet.preVisitAnswers.map((a) => (a.question === question ? { ...a, answer } : a))
      );
    } else {
      onChange(index, 'preVisitAnswers', [...pet.preVisitAnswers, { question, answer }]);
    }
  };

  const skipped = questionsMaster.length > 0 && pet.preVisitAnswers.every((a) => a.answer.trim() === '');

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/30 p-4 dark:border-brand-900 dark:bg-brand-950/15">
      <h4 className="font-display mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
        🩺 Anamnesa — {pet.petName || `Hewan #${index + 1}`}
      </h4>

      {/* Cerita kondisi */}
      <Field label="Cerita Kondisi / Keluhan Utama" required hint="Ceritakan kronologi singkat kondisi hewan Anda">
        <Textarea
          rows={3}
          value={pet.conditionStory}
          onChange={(e) => onChange(index, 'conditionStory', e.target.value)}
          placeholder="cth. Sejak 2 hari lalu Bona lesu, nafsu makan menurun, sering menggigit area paha…"
        />
      </Field>

      {/* Keluhan multiple — collapse */}
      <details className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800" open>
        <summary className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 list-none dark:bg-slate-950/50 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
          <span>
            Keluhan yang Dialami{' '}
            {pet.complaints.length > 0 && (
              <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                {pet.complaints.length} dipilih
              </span>
            )}
          </span>
          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-2 p-3">
          {complaintsMaster.map((name) => {
            const selected = pet.complaints.find((c) => c.name === name);
            return (
              <div
                key={name}
                className={`rounded-lg border transition-colors ${
                  selected ? 'border-brand-300 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleComplaint(name)}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selected ? 'border-brand-600 bg-brand-600 text-[9px] text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {selected ? '✓' : ''}
                  </span>
                  {name}
                </button>
                {selected && (
                  <div className="px-3 pb-2">
                    <Input
                      value={selected.detail}
                      onChange={(e) => setComplaintDetail(name, e.target.value)}
                      placeholder={`cth. ada ${name.toLowerCase()} — isi: 1x ${name.toLowerCase()} (makanan)`}
                      className="text-xs"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </details>

      {/* Pertanyaan sebelum datang — skippable */}
      <details className="group mt-3 rounded-xl border border-amber-200 dark:border-amber-900/60" open={false}>
        <summary className="flex cursor-pointer items-center justify-between rounded-xl bg-amber-50/60 px-3 py-2 text-xs font-bold text-amber-800 list-none dark:bg-amber-950/30 dark:text-amber-300 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-1.5">
            <MessageCircleQuestion size={14} />
            Pertanyaan Sebelum Datang (opsional)
          </span>
          <span className="text-[10px] font-normal">
            {skipped ? 'Bisa dikosongkan — diisi admin saat datang' : 'Terjawab'}
          </span>
        </summary>
        <div className="space-y-3 p-3">
          {questionsMaster.map((q) => (
            <Field key={q} label={q} className="mb-0">
              <Input
                value={pet.preVisitAnswers.find((a) => a.question === q)?.answer || ''}
                onChange={(e) => setAnswer(q, e.target.value)}
                placeholder="Jawaban singkat (opsional)…"
                className="text-xs"
              />
            </Field>
          ))}
          <p className="text-[10px] leading-relaxed text-slate-400">
            Boleh dikosongkan — admin akan mengisi pertanyaan ini saat Anda datang melalui modul Appointment.
          </p>
        </div>
      </details>
    </div>
  );
}