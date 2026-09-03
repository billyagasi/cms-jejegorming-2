import React from 'react';

export function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h4 className={`section-label mb-3 ${className}`}>{children}</h4>;
}

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';
  hint?: string;
  className?: string;
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, { icon: string; value: string }> = {
  brand: { icon: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300', value: 'text-brand-800 dark:text-brand-300' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', value: 'text-emerald-800 dark:text-emerald-300' },
  amber: { icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300', value: 'text-amber-800 dark:text-amber-300' },
  rose: { icon: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300', value: 'text-rose-800 dark:text-rose-300' },
  slate: { icon: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', value: 'text-slate-800 dark:text-slate-200' },
  sky: { icon: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300', value: 'text-sky-800 dark:text-sky-300' },
};

export function StatCard({ label, value, icon, tone = 'slate', hint, className = '' }: StatCardProps) {
  const t = toneClasses[tone];
  return (
    <div className={`bento-card ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            {label}
          </p>
          <p className={`font-display mt-1 truncate text-xl font-bold ${t.value}`}>{value}</p>
          {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>}
        </div>
        {icon && <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>{icon}</div>}
      </div>
    </div>
  );
}
