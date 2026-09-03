import React from 'react';

export interface TabOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

export default function Tabs<T extends string>({ options, value, onChange, className = '' }: TabsProps<T>) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-display text-xs font-semibold transition-all ${
              active
                ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
