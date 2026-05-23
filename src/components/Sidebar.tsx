import {
  LayoutDashboard, Receipt, Users, PieChart, User, LogOut, Plus,
} from 'lucide-react';
import type { View } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, Button } from '@/components/ui';
import { useAuthStore, useUIStore } from '@/stores';

interface NavItem {
  id: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'groups', label: 'Groups', icon: Users },
  { id: 'reports', label: 'Reports', icon: PieChart },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const openModal = useUIStore((s) => s.openModal);
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col justify-between border-r border-white/5 bg-[#0B1224]/70 backdrop-blur py-6 px-4">
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="size-9 rounded-xl gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-white font-bold">B</span>
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight leading-none">BudgetBuddy</span>
            <p className="text-[10px] text-slate-500 leading-tight">Student finance</p>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-2">
          <Avatar name={profile?.full_name ?? 'You'} size="sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white leading-tight truncate">{profile?.full_name}</span>
            <span className="text-[11px] text-slate-400 truncate">{profile?.email}</span>
          </div>
        </div>

        <Button leftIcon={<Plus className="size-4" />} className="w-full" onClick={() => openModal('expense_form')}>
          Add Expense
        </Button>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className={cn('size-4.5', isActive && 'text-emerald-300')} />
                <span className="text-sm font-semibold">{item.label}</span>
                {isActive && <span className="ml-auto size-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </nav>
      </div>

      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
      >
        <LogOut className="size-4" />
        <span className="text-sm font-semibold">Sign Out</span>
      </button>
    </aside>
  );
}
