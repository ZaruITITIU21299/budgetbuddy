import { useMemo } from 'react';
import { Plus, Wallet, TrendingUp, Users, Scan, Sparkles, ArrowRight } from 'lucide-react';
import { Button, Card, CategoryIconBadge, EmptyState } from '@/components/ui';
import { useAuthStore, useExpenseStore, useUIStore } from '@/stores';
import { useBudgetCalculator, useMonthlySummary } from '@/hooks';
import { formatVND, formatRelativeDate, cn, getCurrentMonthYear } from '@/lib/utils';
import { AreaChartCard, PieChartCard } from '@/components/charts';
import { AIInsightsPanel } from '@/components/ai/AIInsightsPanel';
import { SpendingForecastCard } from '@/components/ai/SpendingForecastCard';
import { BudgetProgressBar } from '@/components/expense/BudgetProgressBar';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { CATEGORY_META } from '@/constants/categories';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

export default function DashboardView() {
  const session = useAuthStore((s) => s.session);
  const expenses = useExpenseStore((s) => s.expenses);
  const openModal = useUIStore((s) => s.openModal);
  const setView = useUIStore((s) => s.setView);

  const summary = useMonthlySummary();
  const calc = useBudgetCalculator();

  const monthYear = getCurrentMonthYear();

  const totalGroupExpenses = expenses
    .filter((e) => e.isGroupExpense() && e.monthYear() === monthYear)
    .reduce((s, e) => s + e.amount, 0);

  // Build last-30-days time series
  const dailySeries = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const byDay = new Map<string, number>();
    for (const e of expenses) {
      if (e.isGroupExpense()) continue;
      const key = format(e.expenseDate, 'yyyy-MM-dd');
      byDay.set(key, (byDay.get(key) ?? 0) + e.amount);
    }
    return days.map((d) => ({
      name: format(d, 'd'),
      day: format(d, 'MMM d'),
      amount: byDay.get(format(d, 'yyyy-MM-dd')) ?? 0,
    }));
  }, [expenses]);

  const pieData = useMemo(() => {
    return calc
      .getBreakdownByCategory()
      .slice(0, 6)
      .map((c) => ({
        name: CATEGORY_META[c.category].label,
        value: c.amount,
        color: CATEGORY_META[c.category].color,
      }));
  }, [calc]);

  const topPie = pieData[0];
  const recent = expenses.slice(0, 5);

  const usageRatio = summary.totalBudget > 0 ? summary.totalSpent / summary.totalBudget : 0;
  const ringTone = usageRatio >= 1 ? 'rose' : usageRatio >= 0.75 ? 'amber' : 'emerald';

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-5 sm:p-7 lg:p-9 space-y-6 max-w-7xl mx-auto pb-32 lg:pb-9">
        {/* Header */}
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400 font-medium">{format(new Date(), 'EEEE, MMMM d')}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
              Hi, {session?.fullName?.split(' ').slice(-1)[0] ?? 'there'} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            title="Spent this month"
            value={formatVND(summary.totalSpent, { compact: true })}
            sub={`${summary.expenseCount} expenses · avg ${formatVND(summary.avgPerDay, { compact: true })}/day`}
            icon={Wallet}
            gradient="gradient-emerald"
            onClick={() => setView('expenses')}
          />
          <SummaryCard
            title="Budget remaining"
            value={
              summary.totalBudget > 0
                ? formatVND(Math.max(summary.totalBudget - summary.totalSpent, 0), { compact: true })
                : 'No budget set'
            }
            sub={
              summary.totalBudget > 0
                ? `${Math.round(usageRatio * 100)}% used of ${formatVND(summary.totalBudget, { compact: true })}`
                : 'Tap to set monthly limits'
            }
            icon={TrendingUp}
            gradient={ringTone === 'rose' ? 'gradient-rose' : ringTone === 'amber' ? 'gradient-violet' : 'gradient-sky'}
            onClick={() => openModal('budget_setup')}
          />
          <SummaryCard
            title="Group spending"
            value={formatVND(totalGroupExpenses, { compact: true })}
            sub="Bills shared with roommates & friends"
            icon={Users}
            gradient="gradient-violet"
            onClick={() => setView('groups')}
          />
        </div>

        {/* Forecast + AI Insights row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SpendingForecastCard />
          <AIInsightsPanel className="lg:col-span-2" />
        </div>

        {/* Chart row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2" padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Spending this month</h3>
                <p className="text-xs text-slate-400 mt-0.5">Daily totals · personal expenses</p>
              </div>
              <Button size="sm" variant="ghost" rightIcon={<ArrowRight className="size-3.5" />} onClick={() => setView('reports')}>
                Reports
              </Button>
            </div>
            <AreaChartCard
              data={dailySeries as never}
              dataKey="amount"
              xKey="name"
              color="#10B981"
              height={240}
              formatter={(v) => formatVND(v, { compact: true })}
            />
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">Categories</h3>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">This month</span>
            </div>
            {pieData.length > 0 ? (
              <>
                <PieChartCard
                  data={pieData}
                  height={200}
                  centerLabel="Top"
                  centerValue={topPie ? topPie.name : ''}
                  innerRadius={56}
                  outerRadius={84}
                />
                <div className="mt-3 space-y-1.5">
                  {pieData.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-slate-300 truncate">{p.name}</span>
                      </div>
                      <span className="text-white font-bold">{formatVND(p.value, { compact: true })}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No spending yet"
                description="Add an expense to see your category breakdown."
              />
            )}
          </Card>
        </div>

        {/* Budget progress + recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Budget per category</h3>
                <p className="text-xs text-slate-400 mt-0.5">{format(new Date(), 'MMMM yyyy')}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openModal('budget_setup')}>
                Edit
              </Button>
            </div>
            <div className="space-y-2.5">
              {calc.getRiskRanking().length === 0 && (
                <EmptyState
                  icon={Wallet}
                  title="No budgets set"
                  description="Set category limits to track progress in real time."
                  action={<Button onClick={() => openModal('budget_setup')}>Set up budgets</Button>}
                />
              )}
              {calc.getRiskRanking().slice(0, 5).map((r) => (
                <BudgetProgressBar
                  key={r.category}
                  category={r.category}
                  spent={calc.getSpentByCategory(r.category)}
                  limit={calc.getLimitByCategory(r.category)}
                />
              ))}
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Recent activity</h3>
              <Button size="sm" variant="ghost" rightIcon={<ArrowRight className="size-3.5" />} onClick={() => setView('expenses')}>
                See all
              </Button>
            </div>

            {recent.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No expenses yet"
                description="Tap the + button to log your first one."
                action={<Button onClick={() => openModal('expense_form')}>Add Expense</Button>}
              />
            ) : (
              <div className="space-y-1.5">
                {recent.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => openModal('expense_edit', { expense: e })}
                    className="w-full p-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3"
                  >
                    <CategoryIconBadge category={e.category} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-white truncate">{e.title}</p>
                      <p className="text-[11px] text-slate-400">{formatRelativeDate(e.expenseDate)} · {CATEGORY_META[e.category].label}</p>
                    </div>
                    <span className={cn(
                      'text-sm font-bold shrink-0',
                      e.isGroupExpense() ? 'text-violet-300' : 'text-white',
                    )}>
                      {formatVND(e.amount, { compact: true })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction icon={Plus} label="Add Expense" gradient="gradient-emerald" onClick={() => openModal('expense_form')} />
          <QuickAction icon={Scan} label="Scan Receipt" gradient="gradient-sky" onClick={() => openModal('receipt_scanner')} />
          <QuickAction icon={Users} label="New Group" gradient="gradient-violet" onClick={() => openModal('group_create')} />
          <QuickAction icon={TrendingUp} label="Export Report" gradient="gradient-rose" onClick={() => openModal('export_modal')} />
        </div>
      </div>

      {/* FAB on mobile */}
      <button
        onClick={() => openModal('expense_form')}
        className="lg:hidden fixed bottom-20 right-5 z-30 size-14 rounded-full gradient-emerald shadow-2xl shadow-emerald-500/30 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Add expense"
      >
        <Plus className="size-6 text-white" />
      </button>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  onClick?: () => void;
}

function SummaryCard({ title, value, sub, icon: Icon, gradient, onClick }: SummaryCardProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-3xl card-elevated p-5 text-left hover:border-white/20 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white mt-1.5">{value}</p>
        </div>
        <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', gradient)}>
          <Icon className="size-5 text-white" />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3">{sub}</p>
    </button>
  );
}

function QuickAction({ icon: Icon, label, gradient, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; gradient: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl card-elevated p-4 hover:border-white/20 transition-all flex flex-col items-start gap-2.5 active:scale-[0.97]"
    >
      <div className={cn('size-9 rounded-xl flex items-center justify-center', gradient)}>
        <Icon className="size-4 text-white" />
      </div>
      <span className="text-xs font-bold text-white">{label}</span>
    </button>
  );
}
