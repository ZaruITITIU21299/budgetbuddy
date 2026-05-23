import { LayoutDashboard, Receipt, Users, PieChart, User } from 'lucide-react';
import type { View } from '@/types';
import { useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

const NAV: Array<{ id: View; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'groups', label: 'Groups', icon: Users },
  { id: 'reports', label: 'Reports', icon: PieChart },
  { id: 'profile', label: 'Profile', icon: User },
];

export function MobileBottomNav() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B1224]/95 backdrop-blur-lg border-t border-white/5 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2.5 active:scale-95 transition-transform',
                active ? 'text-emerald-300' : 'text-slate-500 hover:text-white',
              )}
            >
              <Icon className={cn('size-5', active && 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]')} />
              <span className="text-[10px] font-bold">{item.label}</span>
              {active && <span className="absolute bottom-1.5 size-1 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
