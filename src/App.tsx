import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  useAuthStore, useBudgetStore, useExpenseStore, useGroupStore, useNotificationStore, useUIStore,
} from '@/stores';
import { useRealtime } from '@/hooks';
import Sidebar from '@/components/Sidebar';
import LoginView from '@/components/LoginView';
import ResetPasswordView from '@/components/ResetPasswordView';
import DashboardView from '@/components/DashboardView';
import ExpensesView from '@/components/ExpensesView';
import GroupsView from '@/components/GroupsView';
import ReportsView from '@/components/ReportsView';
import ProfileView from '@/components/ProfileView';
import MetricsView from '@/components/MetricsView';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { ExpenseFormModal } from '@/components/expense/ExpenseForm';
import { ReceiptScannerModal } from '@/components/expense/ReceiptScannerModal';
import { GroupSettleUpModal } from '@/components/group/GroupSettleUpModal';
import { GroupCreateModal } from '@/components/group/GroupCreateModal';
import { GroupJoinModal } from '@/components/group/GroupJoinModal';
import { GroupInviteModal } from '@/components/group/GroupInviteModal';
import { MonthlyBudgetSetupModal } from '@/components/expense/MonthlyBudgetSetup';
import { ExportModal } from '@/components/expense/ExportModal';
import { OnboardingFlow } from '@/components/layout/OnboardingFlow';

const PUBLIC_TOASTER = (
  <Toaster
    position="top-center"
    toastOptions={{
      style: {
        background: '#0B1224',
        color: '#fff',
        border: '1px solid rgba(148,163,184,0.15)',
        fontSize: '13px',
        borderRadius: '12px',
      },
      success: { iconTheme: { primary: '#10B981', secondary: '#0B1224' } },
      error: { iconTheme: { primary: '#F43F5E', secondary: '#0B1224' } },
    }}
  />
);

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isRecovering = useAuthStore((s) => s.isRecovering);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#060B1B] text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  // Password-recovery flow takes precedence over any active session — the
  // user must finish setting a new password (or cancel) before doing anything
  // else.
  if (isRecovering) {
    return (
      <ErrorBoundary>
        <ResetPasswordView />
        {PUBLIC_TOASTER}
      </ErrorBoundary>
    );
  }

  if (!session || !profile) {
    return (
      <ErrorBoundary>
        <LoginView />
        {PUBLIC_TOASTER}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthenticatedApp />
    </ErrorBoundary>
  );
}

function AuthenticatedApp() {
  const session = useAuthStore((s) => s.session)!;
  const profile = useAuthStore((s) => s.profile)!;
  const view = useUIStore((s) => s.view);
  const openModal = useUIStore((s) => s.openModal);

  const loadExpenses = useExpenseStore((s) => s.loadFor);
  const loadGroups = useGroupStore((s) => s.loadFor);
  const loadBudget = useBudgetStore((s) => s.loadFor);
  const loadNotifs = useNotificationStore((s) => s.loadFor);
  const reloadExpenseSplits = useExpenseStore((s) => s.reloadSplits);

  // Initial load (fire-and-forget — stores set isLoaded when done).
  useEffect(() => {
    void loadExpenses(session.userId);
    void loadGroups(session.userId);
    void loadBudget(session.userId);
    void loadNotifs(session.userId);
  }, [session.userId, loadExpenses, loadGroups, loadBudget, loadNotifs]);

  // Real-time sync (BroadcastChannel locally / Supabase Realtime in prod).
  useRealtime(
    ['expenses', 'expense_splits', 'budget_limits', 'groups', 'group_members', 'notifications', 'ai_insights'],
    (event) => {
      if (event.table === 'expenses' || event.table === 'expense_splits') {
        void loadExpenses(session.userId);
        void reloadExpenseSplits(session.userId);
        void loadGroups(session.userId);
      } else if (event.table === 'groups' || event.table === 'group_members') {
        void loadGroups(session.userId);
      } else if (event.table === 'budget_limits') {
        void loadBudget(session.userId);
      } else if (event.table === 'notifications') {
        void loadNotifs(session.userId);
      }
    },
  );

  // Onboarding trigger
  useEffect(() => {
    if (!profile.onboarding_done) {
      openModal('onboarding');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.onboarding_done]);

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <DashboardView />;
      case 'expenses': return <ExpensesView />;
      case 'groups': return <GroupsView />;
      case 'reports': return <ReportsView />;
      case 'profile': return <ProfileView />;
      case 'metrics': return <MetricsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#060B1B] font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileBottomNav />
      <OfflineBanner />

      {/* Modals — rendered once at root, controlled via useUIStore */}
      <ExpenseFormModal />
      <ReceiptScannerModal />
      <GroupSettleUpModal />
      <GroupCreateModal />
      <GroupJoinModal />
      <GroupInviteModal />
      <MonthlyBudgetSetupModal />
      <ExportModal />
      <OnboardingFlow />

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#0B1224',
            color: '#fff',
            border: '1px solid rgba(148,163,184,0.15)',
            fontSize: '13px',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#0B1224' } },
          error: { iconTheme: { primary: '#F43F5E', secondary: '#0B1224' } },
        }}
      />
    </div>
  );
}
