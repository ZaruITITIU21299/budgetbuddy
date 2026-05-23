import { useEffect, useState } from 'react';
import {
  User2, Wallet, LogOut, Trash2, Sparkles, ChevronRight, Database, Mail,
  BarChart3, Cloud, HardDrive,
} from 'lucide-react';
import { Button, Card, Input, Avatar, Badge } from '@/components/ui';
import { useAuthStore, useUIStore } from '@/stores';
import { AIFeedbackRepo, resetAllStorage, STORAGE_BACKEND } from '@/lib/storage';
import { formatVND, parseVNDInput, cn } from '@/lib/utils';
import { ProfileUpdateSchema } from '@/lib/validation/schemas';
import { NotificationBell } from '@/components/layout/NotificationBell';
import toast from 'react-hot-toast';

export default function ProfileView() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const setView = useUIStore((s) => s.setView);
  const openModal = useUIStore((s) => s.openModal);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [monthlyIncome, setMonthlyIncome] = useState<number>(profile?.monthly_income ?? 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setMonthlyIncome(profile?.monthly_income ?? 0);
  }, [profile]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void AIFeedbackRepo.listForUser(session.userId).then((rows) => {
      if (!cancelled) setFeedbackCount(rows.length);
    });
    return () => { cancelled = true; };
  }, [session]);

  const save = async () => {
    const parsed = ProfileUpdateSchema.safeParse({ fullName, monthlyIncome });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path.join('.')] = i.message;
      setErrors(errs);
      return;
    }
    try {
      await updateProfile({ full_name: parsed.data.fullName, monthly_income: parsed.data.monthlyIncome });
      toast.success('Profile updated');
      setErrors({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile');
    }
  };

  const handleReset = async () => {
    const warning = STORAGE_BACKEND === 'supabase'
      ? `Delete ALL your data from Supabase? Every expense, group membership, budget, and notification belonging to you will be removed. This cannot be undone.`
      : 'Reset ALL local data? You will be logged out and all expenses, groups, and budgets will be erased. This cannot be undone.';
    if (!confirm(warning)) return;
    try {
      await resetAllStorage(session?.userId ?? null);
      await logout();
      toast.success(STORAGE_BACKEND === 'supabase' ? 'All your Supabase data cleared' : 'All local data cleared');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reset failed');
    }
  };

  if (!session || !profile) return null;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-5 sm:p-7 lg:p-9 space-y-5 max-w-3xl mx-auto pb-32 lg:pb-9">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Profile & Settings</h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage your account and app preferences</p>
          </div>
          <NotificationBell />
        </header>

        {/* Profile header */}
        <Card padding="md">
          <div className="flex items-center gap-4">
            <Avatar name={profile.full_name} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{profile.full_name}</h2>
              <p className="text-sm text-slate-400 flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {profile.email}
              </p>
            </div>
            <Badge variant={STORAGE_BACKEND === 'supabase' ? 'info' : 'neutral'}>
              {STORAGE_BACKEND === 'supabase' ? (
                <span className="flex items-center gap-1"><Cloud className="size-3" /> Supabase</span>
              ) : (
                <span className="flex items-center gap-1"><HardDrive className="size-3" /> Local</span>
              )}
            </Badge>
          </div>
        </Card>

        {/* Edit basic info */}
        <Card padding="md">
          <h3 className="text-base font-bold text-white mb-4">Account Info</h3>
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User2 className="size-4" />}
              error={errors['fullName']}
            />
            <Input
              label="Monthly Income (VND)"
              inputMode="numeric"
              value={monthlyIncome > 0 ? monthlyIncome.toLocaleString('de-DE') : ''}
              onChange={(e) => setMonthlyIncome(parseVNDInput(e.target.value))}
              leftIcon={<Wallet className="size-4" />}
              hint="Used for budget recommendations. Stays on this device."
              error={errors['monthlyIncome']}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Total: {formatVND(monthlyIncome)}</span>
              <Button onClick={save}>Save Changes</Button>
            </div>
          </div>
        </Card>

        {/* Settings rows */}
        <Card padding="none">
          <SettingsRow
            icon={Wallet}
            title="Monthly Budgets"
            subtitle="Configure spending limits per category"
            onClick={() => openModal('budget_setup')}
          />
          <SettingsRow
            icon={BarChart3}
            title="AI Metrics"
            subtitle={`Precision/recall, MAE, OCR accuracy · ${feedbackCount} feedback samples`}
            onClick={() => setView('metrics')}
            badge={feedbackCount > 0 ? <Badge variant="info">{feedbackCount}</Badge> : null}
          />
          <SettingsRow
            icon={Sparkles}
            title="Re-run Onboarding"
            subtitle="Replay the 3-step setup wizard"
            onClick={() => openModal('onboarding')}
          />
        </Card>

        {/* Danger zone */}
        <Card padding="md" className={cn('border-rose-500/20')}>
          <h3 className="text-base font-bold text-rose-300 mb-2">Danger Zone</h3>
          <p className="text-sm text-slate-400 mb-4">
            Reset wipes all local data. Useful for re-running the demo from a clean slate.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" leftIcon={<LogOut className="size-4" />} onClick={logout}>
              Sign Out
            </Button>
            <Button variant="danger" leftIcon={<Trash2 className="size-4" />} onClick={handleReset}>
              Reset All Data
            </Button>
          </div>
        </Card>

        <div className="text-center text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-3" />
            {STORAGE_BACKEND === 'supabase'
              ? 'Connected to Supabase (Postgres + RLS) · v0.2'
              : 'Local mode — data stored on this device · v0.2'}
          </span>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-5 py-4 flex items-center gap-3 hover:bg-white/[0.02] border-b border-white/5 last:border-b-0 transition-colors text-left"
    >
      <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Icon className="size-4 text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-slate-400 truncate">{subtitle}</p>
      </div>
      {badge}
      <ChevronRight className="size-4 text-slate-500" />
    </button>
  );
}
