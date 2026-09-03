import React from 'react';
import { Check } from 'lucide-react';

export interface StepperProps<T extends string> {
  steps: { id: T; label: string }[];
  current: T;
  onStepClick?: (id: T) => void;
  className?: string;
}

export default function Stepper<T extends string>({ steps, current, onStepClick, className = '' }: StepperProps<T>) {
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <div className={`flex items-start ${className}`}>
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = step.id === current;
        const clickable = !!onStepClick && (done || active);
        return (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <div
                className={`mt-[15px] h-0.5 flex-1 rounded-full ${
                  i <= currentIndex ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(step.id)}
              className={`group flex w-20 shrink-0 flex-col items-center gap-1.5 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-display text-xs font-bold transition-all ${
                  done
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : active
                      ? 'border-brand-600 bg-white text-brand-700 ring-4 ring-brand-600/15 dark:bg-slate-900 dark:text-brand-300'
                      : 'border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                {done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`text-center text-[10.5px] leading-tight font-semibold ${
                  active ? 'text-brand-700 dark:text-brand-300' : done ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
