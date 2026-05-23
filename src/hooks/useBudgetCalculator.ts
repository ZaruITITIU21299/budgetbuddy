import { useMemo } from 'react';
import { BudgetCalculator } from '@/models';
import type { ExpenseCategory } from '@/types';
import { useBudgetStore, useExpenseStore } from '@/stores';
import { getCurrentMonthYear } from '@/lib/utils';

export function useBudgetCalculator(monthYear: string = getCurrentMonthYear()): BudgetCalculator {
  const expenses = useExpenseStore((s) => s.expenses);
  const limits = useBudgetStore((s) => s.limits);

  return useMemo(() => {
    const limitMap = new Map<ExpenseCategory, number>();
    for (const l of limits) {
      if (l.month_year === monthYear) limitMap.set(l.category, l.amount);
    }
    const monthExpenses = expenses.filter((e) => e.monthYear() === monthYear);
    return new BudgetCalculator(limitMap, monthExpenses, monthYear);
  }, [expenses, limits, monthYear]);
}
