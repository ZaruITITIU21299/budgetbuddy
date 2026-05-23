import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { Download } from 'lucide-react';
import { Button, Card, CategoryIconBadge, EmptyState } from '@/components/ui';
import { useAuthStore, useExpenseStore, useUIStore } from '@/stores';
import { BarChartCard, LineChartCard, PieChartCard } from '@/components/charts';
import { CATEGORY_META } from '@/constants/categories';
import type { ExpenseCategory } from '@/types';
import { formatVND, getMonthYearOf, cn } from '@/lib/utils';
import { NotificationBell } from '@/components/layout/NotificationBell';

type Range = 'this_month' | 'last_month' | 'last_3' | 'last_6';

const RANGE_LABEL: Record<Range, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  last_3: 'Last 3 months',
  last_6: 'Last 6 months',
};

export default function ReportsView() {
  const expenses = useExpenseStore((s) => s.expenses);
  const session = useAuthStore((s) => s.session);
  const openModal = useUIStore((s) => s.openModal);

  const [range, setRange] = useState<Range>('this_month');

  const { start, end } = useMemo(() => {
    if (range === 'this_month') return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
    if (range === 'last_month') {
      const d = subMonths(new Date(), 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    if (range === 'last_3') {
      return { start: startOfMonth(subMonths(new Date(), 2)), end: endOfMonth(new Date()) };
    }
    return { start: startOfMonth(subMonths(new Date(), 5)), end: endOfMonth(new Date()) };
  }, [range]);

  const inRange = useMemo(
    () =>
      expenses
        .filter((e) => e.expenseDate >= start && e.expenseDate <= end)
        .filter((e) => !e.isGroupExpense()),
    [expenses, start, end],
  );

  const total = inRange.reduce((s, e) => s + e.amount, 0);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const avgPerDay = total / days;

  const biggestExpense = inRange.reduce((best, e) => (e.amount > (best?.amount ?? 0) ? e : best), inRange[0]);

  const byCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, { amount: number; count: number }>();
    for (const e of inRange) {
      const cur = map.get(e.category) ?? { amount: 0, count: 0 };
      cur.amount += e.amount;
      cur.count += 1;
      map.set(e.category, cur);
    }
    return Array.from(map.entries())
      .map(([cat, v]) => ({
        category: cat,
        amount: v.amount,
        count: v.count,
        avg: Math.round(v.amount / v.count),
        pct: total > 0 ? v.amount / total : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [inRange, total]);

  const topCategory = byCategory[0]?.category;

  const monthlyHistory = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    return months.map((m) => {
      const my = getMonthYearOf(m);
      const monthExpenses = expenses.filter((e) => e.monthYear() === my && !e.isGroupExpense());
      return {
        name: format(m, 'MMM'),
        amount: monthExpenses.reduce((s, e) => s + e.amount, 0),
      };
    });
  }, [expenses]);

  const monthComparison = useMemo(() => {
    const cur = format(new Date(), 'yyyy-MM');
    const prev = format(subMonths(new Date(), 1), 'yyyy-MM');
    const map: Record<ExpenseCategory, { current: number; previous: number }> = {} as never;
    for (const e of expenses) {
      const my = e.monthYear();
      if (my !== cur && my !== prev) continue;
      if (e.isGroupExpense()) continue;
      if (!map[e.category]) map[e.category] = { current: 0, previous: 0 };
      if (my === cur) map[e.category].current += e.amount;
      else map[e.category].previous += e.amount;
    }
    return Object.entries(map)
      .map(([cat, v]) => ({
        name: CATEGORY_META[cat as ExpenseCategory].label.slice(0, 9),
        current: v.current,
        previous: v.previous,
      }))
      .filter((d) => d.current > 0 || d.previous > 0)
      .slice(0, 7);
  }, [expenses]);

  const pieData = byCategory.map((c) => ({
    name: CATEGORY_META[c.category].label,
    value: c.amount,
    color: CATEGORY_META[c.category].color,
  }));

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-5 sm:p-7 lg:p-9 space-y-5 max-w-7xl mx-auto pb-32 lg:pb-9">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Reports</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {format(start, 'MMM d')} → {format(end, 'MMM d, yyyy')} · {session?.fullName}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <NotificationBell />
            <Button variant="secondary" leftIcon={<Download className="size-4" />} onClick={() => openModal('export_modal')}>
              Export
            </Button>
          </div>
        </header>

        {/* Range tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-2">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-full border whitespace-nowrap',
                range === r
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white',
              )}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total spent" value={formatVND(total, { compact: true })} sub={`${inRange.length} expenses`} />
          <StatCard label="Avg / day" value={formatVND(avgPerDay, { compact: true })} sub={`${days} day${days === 1 ? '' : 's'}`} />
          <StatCard
            label="Top category"
            value={topCategory ? CATEGORY_META[topCategory].label : '—'}
            sub={topCategory ? `${formatVND(byCategory[0].amount, { compact: true })}` : 'No data'}
          />
          <StatCard
            label="Biggest expense"
            value={biggestExpense ? formatVND(biggestExpense.amount, { compact: true }) : '—'}
            sub={biggestExpense?.title ?? 'No data'}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">6-month trend</h3>
            </div>
            <LineChartCard
              data={monthlyHistory as never}
              dataKey="amount"
              xKey="name"
              color="#10B981"
              height={240}
              formatter={(v) => formatVND(v, { compact: true })}
            />
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">This vs last month</h3>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Current</div>
                <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-500" /> Previous</div>
              </div>
            </div>
            {monthComparison.length === 0 ? (
              <EmptyState icon={Download} title="Need at least 2 months of data" />
            ) : (
              <BarChartCard
                data={monthComparison as never}
                dataKey="current"
                secondKey="previous"
                xKey="name"
                color="#10B981"
                secondColor="#0EA5E9"
                height={240}
                formatter={(v) => formatVND(v, { compact: true })}
              />
            )}
          </Card>
        </div>

        {/* Pie + table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card padding="md">
            <h3 className="text-base font-bold text-white mb-3">Category share</h3>
            {pieData.length > 0 ? (
              <PieChartCard data={pieData} height={220} centerLabel="Total" centerValue={formatVND(total, { compact: true })} />
            ) : (
              <EmptyState icon={Download} title="No data" />
            )}
          </Card>

          <Card className="lg:col-span-2" padding="none">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-base font-bold text-white">Category breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                    <th className="text-left px-5 py-3">Category</th>
                    <th className="text-right px-5 py-3">Total</th>
                    <th className="text-right px-5 py-3 hidden sm:table-cell">Count</th>
                    <th className="text-right px-5 py-3 hidden sm:table-cell">Avg</th>
                    <th className="text-right px-5 py-3">% of total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {byCategory.map((row) => (
                    <tr key={row.category} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <CategoryIconBadge category={row.category} size="sm" />
                          <span className="font-semibold text-white">{CATEGORY_META[row.category].label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-white">{formatVND(row.amount)}</td>
                      <td className="px-5 py-3 text-right text-slate-300 hidden sm:table-cell">{row.count}</td>
                      <td className="px-5 py-3 text-right text-slate-300 hidden sm:table-cell">{formatVND(row.avg)}</td>
                      <td className="px-5 py-3 text-right text-emerald-300 font-semibold">{Math.round(row.pct * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl card-elevated p-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
      <p className="text-xl font-bold text-white mt-1.5 truncate">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
    </div>
  );
}
