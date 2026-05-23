import { CATEGORY_META } from '@/constants/categories';
import type { ExpenseCategory } from '@/types';
import { cn } from '@/lib/utils';

interface CategoryPillProps {
  category: ExpenseCategory;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function CategoryPill({ category, size = 'md', showIcon = true, className }: CategoryPillProps) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold border',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        meta.bgClass,
        meta.textClass,
        meta.borderClass,
        className,
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'size-3' : 'size-3.5'} />}
      {meta.label}
    </span>
  );
}

interface CategoryIconBadgeProps {
  category: ExpenseCategory;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ICON_SIZES = { sm: 'size-9', md: 'size-11', lg: 'size-14' } as const;
const ICON_PX = { sm: 'size-4', md: 'size-5', lg: 'size-6' } as const;

export function CategoryIconBadge({ category, size = 'md', className }: CategoryIconBadgeProps) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        'rounded-2xl flex items-center justify-center border',
        meta.bgClass,
        meta.borderClass,
        ICON_SIZES[size],
        className,
      )}
    >
      <Icon className={cn(ICON_PX[size], meta.textClass)} />
    </div>
  );
}
