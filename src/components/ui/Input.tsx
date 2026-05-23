import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? `input_${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{leftIcon}</div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all',
            leftIcon && 'pl-10',
            rightSlot && 'pr-12',
            error && 'border-rose-500/50 focus:ring-rose-500/40',
            className,
          )}
          {...rest}
        />
        {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? `tx_${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all',
          error && 'border-rose-500/50',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="text-xs font-medium text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? `sel_${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all',
          'appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2394A3B8%27 stroke-width=%272%27><path d=%27M6 9l6 6 6-6%27/></svg>")] bg-no-repeat bg-[position:right_1rem_center] pr-10',
          error && 'border-rose-500/50',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs font-medium text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});
