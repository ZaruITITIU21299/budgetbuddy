import { create } from 'zustand';
import { BudgetLimitsRepo } from '@/lib/storage';
import type { BudgetLimitRow, ExpenseCategory } from '@/types';
import { getCurrentMonthYear } from '@/lib/utils';

interface BudgetState {
  limits: BudgetLimitRow[];
  monthYear: string;
  loadFor: (userId: string, monthYear?: string) => Promise<void>;
  setLimit: (input: {
    userId: string;
    category: ExpenseCategory;
    amount: number;
    monthYear: string;
    isRollover?: boolean;
  }) => Promise<void>;
  setMonthYear: (monthYear: string) => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  limits: [],
  monthYear: getCurrentMonthYear(),

  loadFor: async (userId, monthYear) => {
    const target = monthYear ?? getCurrentMonthYear();
    try {
      const limits = await BudgetLimitsRepo.listForUser(userId, target);
      set({ limits, monthYear: target });
    } catch (e) {
      console.error('[budget] loadFor failed', e);
    }
  },

  setLimit: async (input) => {
    const row = await BudgetLimitsRepo.upsert({
      user_id: input.userId,
      category: input.category,
      amount: input.amount,
      month_year: input.monthYear,
      is_rollover: input.isRollover ?? false,
    });
    set((state) => {
      const exists = state.limits.find((l) => l.id === row.id);
      return {
        limits: exists
          ? state.limits.map((l) => (l.id === row.id ? row : l))
          : [...state.limits, row],
      };
    });
  },

  setMonthYear: (monthYear) => set({ monthYear }),
}));
