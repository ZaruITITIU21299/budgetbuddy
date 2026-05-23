import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12 px-6 flex flex-col items-center', className)}>
      {Icon && (
        <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Icon className="size-6 text-slate-400" />
        </div>
      )}
      <h3 className="text-white font-bold text-lg">{title}</h3>
      {description && <p className="text-sm text-slate-400 mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
