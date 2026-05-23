import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0-1
  className?: string;
  showLabel?: boolean;
  threshold?: { warn?: number; danger?: number };
  height?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  className,
  showLabel = false,
  threshold = { warn: 0.75, danger: 1 },
  height = 'md',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(value, 1.4));
  const overflowed = clamped > 1;
  const pct = Math.min(clamped, 1) * 100;

  const color =
    clamped >= (threshold.danger ?? 1)
      ? 'bg-rose-500'
      : clamped >= (threshold.warn ?? 0.75)
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const h = height === 'sm' ? 'h-1.5' : height === 'lg' ? 'h-4' : 'h-2.5';

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-white/5 rounded-full overflow-hidden relative', h)}>
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        {overflowed && (
          <div className="absolute inset-y-0 right-0 w-1 bg-rose-300 animate-pulse" />
        )}
      </div>
      {showLabel && (
        <div className="mt-1.5 flex justify-between text-xs font-semibold">
          <span className={cn('text-slate-400')}>{Math.round(clamped * 100)}%</span>
          {overflowed && <span className="text-rose-400">Over budget</span>}
        </div>
      )}
    </div>
  );
}
