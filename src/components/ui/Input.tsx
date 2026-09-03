import React from 'react';

export interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, required, hint, error, className = '', children }: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-[11px] font-medium text-rose-500">{error}</p>}
    </div>
  );
}

const baseControl =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid, className = '', ...props }: InputProps) {
  return (
    <input
      className={`${
        invalid
          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/30 dark:border-slate-700'
      } ${className} ${baseControl}`}
      {...props}
    />
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`min-h-[72px] ${
        invalid
          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/30 dark:border-slate-700'
      } ${className} ${baseControl}`}
      {...props}
    />
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ invalid, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`${
        invalid
          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/30 dark:border-slate-700'
      } ${className} ${baseControl}`}
      {...props}
    >
      {children}
    </select>
  );
}
