import { create } from 'zustand';
import { ExpensesRepo, ExpenseSplitsRepo } from '@/lib/storage';
import { Expense } from '@/models';
import type { ExpenseRow, ExpenseSplitRow } from '@/types';
import { evaluateBudgetAlerts } from '@/lib/services/budgetAlerts';

interface ExpenseState {
  expenses: Expense[];
  splits: ExpenseSplitRow[];
  isLoaded: boolean;
  isLoading: boolean;
  loadFor: (userId: string) => Promise<void>;
  add: (
    payload: Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'>,
    splits?: Array<Omit<ExpenseSplitRow, 'id' | 'created_at' | 'expense_id'>>,
  ) => Promise<Expense>;
  update: (id: string, patch: Partial<ExpenseRow>) => Promise<Expense | undefined>;
  remove: (id: string) => Promise<boolean>;
  reloadSplits: (userId: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  splits: [],
  isLoaded: false,
  isLoading: false,

  loadFor: async (userId) => {
    set({ isLoading: true });
    try {
      const rows = await ExpensesRepo.listForUser(userId);
      const expenses = rows.map(Expense.fromRow);
      const userSplits = await ExpenseSplitsRepo.listForUser(userId);
      set({ expenses, splits: userSplits, isLoaded: true, isLoading: false });
    } catch (e) {
      console.error('[expenses] loadFor failed', e);
      set({ isLoading: false, isLoaded: true });
      throw e;
    }
  },

  add: async (payload, splits = []) => {
    const row = await ExpensesRepo.create(payload);

    if (splits.length > 0) {
      await ExpenseSplitsRepo.createMany(splits.map((s) => ({ ...s, expense_id: row.id })));
    }

    // Run client-side budget alerts evaluation (fallback / supplement to the
    // SQL `check_budget_on_expense` trigger).
    try {
      await evaluateBudgetAlerts(row);
    } catch (e) {
      console.warn('[expenses] budget alert eval failed', e);
    }

    const expense = Expense.fromRow(row);
    set((state) => ({ expenses: [expense, ...state.expenses] }));
    await get().reloadSplits(payload.user_id);
    return expense;
  },

  update: async (id, patch) => {
    const updated = await ExpensesRepo.update(id, patch);
    if (!updated) return undefined;
    const expense = Expense.fromRow(updated);
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? expense : e)),
    }));
    return expense;
  },

  remove: async (id) => {
    const ok = await ExpensesRepo.remove(id);
    if (ok) {
      const targetUserId = get().expenses.find((e) => e.id === id)?.userId;
      set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
      if (targetUserId) await get().reloadSplits(targetUserId);
    }
    return ok;
  },

  reloadSplits: async (userId) => {
    const rows = await ExpenseSplitsRepo.listForUser(userId);
    set({ splits: rows });
  },
}));
