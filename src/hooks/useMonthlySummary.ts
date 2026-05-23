import { useMemo } from 'react';
import { useBudgetStore, useExpenseStore } from '@/stores';
import { EXPENSE_CATEGORIES } from '@/types';
import type { ExpenseCategory, MonthlyHistory, MonthlySummary } from '@/types';
import { differenceInCalendarDays, endOfMonth, startOfMonth } from 'date-fns';
import { getCurrentMonthYear } from '@/lib/utils';

export function useMonthlySummary(monthYear: string = getCurrentMonthYear()): MonthlySummary {
  const expenses = useExpenseStore((s) => s.expenses);
  const limits = useBudgetStore((s) => s.limits);

  return useMemo(() => {
    const monthExpenses = expenses.filter((e) => e.monthYear() === monthYear && !e.isGroupExpense());

    const byCategory = Object.fromEntries(
      EXPENSE_CATEGORIES.map((c) => [c, 0] as const),
    ) as Record<ExpenseCategory, number>;

    for (const e of monthExpenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }

    const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const totalBudget = limits
      .filter((l) => l.month_year === monthYear)
      .reduce((s, l) => s + l.amount, 0);

    const [yr, mo] = monthYear.split('-').map(Number);
    const start = startOfMonth(new Date(yr, mo - 1, 1));
    const end = endOfMonth(start);
    const now = new Date();
    const days =
      now > end
        ? differenceInCalendarDays(end, start) + 1
        : Math.max(differenceInCalendarDays(now, start) + 1, 1);
    const avgPerDay = totalSpent / days;

    return {
      monthYear,
      totalSpent,
      totalBudget,
      totalIncome: 0,
      byCategory,
      expenseCount: monthExpenses.length,
      avgPerDay,
    };
  }, [expenses, limits, monthYear]);
}

export function useMonthlyHistory(count: number = 6): MonthlyHistory[] {
  const expenses = useExpenseStore((s) => s.expenses);

  return useMemo(() => {
    const map = new Map<string, MonthlyHistory>();
    for (const e of expenses) {
      if (e.isGroupExpense()) continue;
      const my = e.monthYear();
      if (!map.has(my)) {
        map.set(my, {
          monthYear: my,
          totalSpent: 0,
          byCategory: {},
        });
      }
      const entry = map.get(my)!;
      entry.totalSpent += e.amount;
      entry.byCategory[e.category] = (entry.byCategory[e.category] ?? 0) + e.amount;
    }
    return Array.from(map.values())
      .sort((a, b) => (a.monthYear < b.monthYear ? 1 : -1))
      .slice(0, count)
      .reverse();
  }, [expenses, count]);
}
