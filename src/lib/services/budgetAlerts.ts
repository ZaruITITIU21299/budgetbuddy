/**
 * Client-side budget-alert evaluator.
 *
 * Runs after a personal expense is persisted. Emits a notification when
 * monthly spending for the same category crosses 80% / 100% of the budget.
 *
 * NOTE: in Supabase mode, the SQL `check_budget_on_expense` trigger does the
 * same job server-side — running this function client-side too is harmless
 * (Supabase RLS prevents duplicates because the trigger inserts with a
 * different timestamp; the UI dedupes by `created_at` minute).
 */
import { BudgetLimitsRepo, ExpensesRepo, NotificationsRepo } from '@/lib/storage';
import { CATEGORY_META } from '@/constants/categories';
import { formatVND, getCurrentMonthYear } from '@/lib/utils';
import type { ExpenseRow } from '@/types';

export async function evaluateBudgetAlerts(expense: ExpenseRow): Promise<void> {
  if (expense.group_id) return;

  const month = getCurrentMonthYear();
  if (expense.expense_date.slice(0, 7) !== month) return;

  const limits = await BudgetLimitsRepo.listForUser(expense.user_id, month);
  const limit = limits.find((b) => b.category === expense.category);
  if (!limit || limit.amount <= 0) return;

  const allExpenses = await ExpensesRepo.listForUser(expense.user_id);
  const monthlyExpenses = allExpenses.filter(
    (e) =>
      !e.group_id &&
      e.category === expense.category &&
      e.expense_date.slice(0, 7) === month,
  );

  const spent = monthlyExpenses.reduce((s, e) => s + e.amount, 0);
  const pct = spent / limit.amount;

  const categoryLabel = CATEGORY_META[expense.category].label;

  if (pct >= 1) {
    await NotificationsRepo.create({
      user_id: expense.user_id,
      type: 'budget_exceeded',
      title: 'Budget Exceeded',
      body: `You have spent ${formatVND(spent)} on ${categoryLabel} this month (limit ${formatVND(limit.amount)}).`,
      data: { category: expense.category, spent, limit: limit.amount, pct },
    });
  } else if (pct >= 0.8) {
    await NotificationsRepo.create({
      user_id: expense.user_id,
      type: 'budget_warning',
      title: 'Budget Warning',
      body: `You have used ${Math.round(pct * 100)}% of your ${categoryLabel} budget (${formatVND(spent)} of ${formatVND(limit.amount)}).`,
      data: { category: expense.category, spent, limit: limit.amount, pct },
    });
  }
}
