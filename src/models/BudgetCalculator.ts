import type { ExpenseCategory } from '@/types';
import type { Expense } from './Expense';
import { EXPENSE_CATEGORIES } from '@/types';
import { differenceInCalendarDays, endOfMonth, startOfMonth } from 'date-fns';

/**
 * Pure-function budget math. Given a set of limits + expenses for a given
 * month, computes spent, remaining, usage %, risk ranking, and a linear
 * month-end forecast.
 */
export class BudgetCalculator {
  constructor(
    private limits: Map<ExpenseCategory, number>,
    private expenses: Expense[],
    private monthYear: string,
  ) {}

  getSpentByCategory(category: ExpenseCategory): number {
    return this.expenses
      .filter((e) => e.category === category && !e.isGroupExpense())
      .reduce((sum, e) => sum + e.amount, 0);
  }

  getLimitByCategory(category: ExpenseCategory): number {
    return this.limits.get(category) ?? 0;
  }

  getRemainingByCategory(category: ExpenseCategory): number {
    return Math.max(this.getLimitByCategory(category) - this.getSpentByCategory(category), 0);
  }

  getUsagePercentage(category: ExpenseCategory): number {
    const limit = this.getLimitByCategory(category);
    if (limit <= 0) return 0;
    return this.getSpentByCategory(category) / limit;
  }

  getTotalBudget(): number {
    let total = 0;
    for (const v of this.limits.values()) total += v;
    return total;
  }

  getTotalSpent(): number {
    return this.expenses
      .filter((e) => !e.isGroupExpense())
      .reduce((sum, e) => sum + e.amount, 0);
  }

  getTotalRemaining(): number {
    return Math.max(this.getTotalBudget() - this.getTotalSpent(), 0);
  }

  isOverBudget(category: ExpenseCategory): boolean {
    const limit = this.getLimitByCategory(category);
    return limit > 0 && this.getSpentByCategory(category) > limit;
  }

  /**
   * Linear projection: (total spent so far / days elapsed) * days in month.
   * Returns at least the actual total spent so far (forecast can't go down).
   */
  forecastMonthEndTotal(now: Date = new Date()): number {
    const [year, month] = this.monthYear.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(monthStart);
    const totalDaysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;
    const daysElapsed = Math.max(differenceInCalendarDays(now, monthStart) + 1, 1);

    const spent = this.getTotalSpent();
    const dailyAvg = spent / daysElapsed;
    const projected = Math.round(dailyAvg * totalDaysInMonth);
    return Math.max(projected, spent);
  }

  /**
   * Risk score per category: a combination of how close we are to the limit
   * AND how fast we are spending vs the proportional time budget.
   */
  getRiskRanking(): Array<{ category: ExpenseCategory; riskScore: number; usage: number; overBudget: boolean }> {
    return EXPENSE_CATEGORIES.map((category) => {
      const usage = this.getUsagePercentage(category);
      const limit = this.getLimitByCategory(category);
      // categories with no limit aren't ranked
      const riskScore = limit === 0 ? 0 : Math.min(usage * 1.2, 2);
      return { category, riskScore, usage, overBudget: this.isOverBudget(category) };
    })
      .filter((r) => r.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  getBreakdownByCategory(): Array<{ category: ExpenseCategory; amount: number; pct: number }> {
    const total = this.getTotalSpent();
    return EXPENSE_CATEGORIES.map((category) => {
      const amount = this.getSpentByCategory(category);
      const pct = total > 0 ? amount / total : 0;
      return { category, amount, pct };
    })
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }
}
