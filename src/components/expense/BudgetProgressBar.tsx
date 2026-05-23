import type { ExpenseCategory } from '@/types';
import { CATEGORY_META } from '@/constants/categories';
import { formatVND } from '@/lib/utils';
import { ProgressBar } from '@/components/ui';
import { cn } from '@/lib/utils';

interface BudgetProgressBarProps {
  category: ExpenseCategory;
  spent: number;
  limit: number;
  className?: string;
  showCategoryIcon?: boolean;
  onClick?: () => void;
}

export function BudgetProgressBar({
  category,
  spent,
  limit,
  className,
  showCategoryIcon = true,
  onClick,
}: BudgetProgressBarProps) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const usage = limit > 0 ? spent / limit : 0;
  const overspent = spent > limit && limit > 0;
  const remaining = limit - spent;

  const tone =
    usage >= 1 ? 'text-rose-400' : usage >= 0.75 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-left',
        onClick && 'hover:bg-white/5 transition-colors',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {showCategoryIcon && (
            <div className={cn('size-9 rounded-xl flex items-center justify-center border', meta.bgClass, meta.borderClass)}>
              <Icon className={cn('size-4', meta.textClass)} />
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{meta.label}</h4>
            <p className="text-[11px] text-slate-400 truncate">
              {limit > 0 ? `${formatVND(spent, { compact: true })} of ${formatVND(limit, { compact: true })}` : 'No limit set'}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={cn('text-sm font-bold', tone)}>
            {limit > 0 ? `${Math.round(usage * 100)}%` : '—'}
          </span>
          {limit > 0 && (
            <p className={cn('text-[10px] font-semibold', overspent ? 'text-rose-400' : 'text-slate-500')}>
              {overspent ? `+${formatVND(-remaining, { compact: true })} over` : `${formatVND(remaining, { compact: true })} left`}
            </p>
          )}
        </div>
      </div>
      <ProgressBar value={usage} />
    </button>
  );
}
