import { useMemo } from 'react';
import { useGroupStore } from '@/stores';
import { SplitCalculator } from '@/models';
import type { ProfileRow } from '@/types';

export interface MemberBalance {
  user: ProfileRow;
  net: number; // positive = should receive, negative = should pay
}

export interface GroupBalances {
  balances: MemberBalance[];
  settlements: Array<{ from: ProfileRow; to: ProfileRow; amount: number }>;
}

/**
 * Computes per-member net balances + a minimal-payment settlement list for
 * a given group. Reads everything (expenses, splits, profiles) from
 * `useGroupStore` so it works the same way against localStorage AND Supabase
 * without doing any async work in render.
 */
export function useGroupBalances(groupId: string | null): GroupBalances {
  const groupExpenses = useGroupStore((s) => s.groupExpenses);
  const groupSplits = useGroupStore((s) => s.groupSplits);
  const membersByGroup = useGroupStore((s) => s.membersByGroup);

  return useMemo<GroupBalances>(() => {
    if (!groupId) return { balances: [], settlements: [] };

    const expenses = groupExpenses[groupId] ?? [];
    const splits = groupSplits[groupId] ?? [];
    const members = membersByGroup[groupId] ?? [];
    const profileById = new Map(members.map((m) => [m.id, m]));

    const net = new Map<string, number>();
    for (const expense of expenses) {
      if (!expense.paid_by) continue;
      const expSplits = splits.filter((s) => s.expense_id === expense.id);
      for (const s of expSplits) {
        if (s.status === 'settled') continue;
        if (s.user_id === expense.paid_by) continue;
        net.set(s.user_id, (net.get(s.user_id) ?? 0) - s.amount_owed);
        net.set(expense.paid_by, (net.get(expense.paid_by) ?? 0) + s.amount_owed);
      }
    }

    const balances: MemberBalance[] = [];
    for (const [userId, value] of net) {
      const user = profileById.get(userId);
      if (user) balances.push({ user, net: value });
    }
    balances.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

    const tx = SplitCalculator.simplifyDebts(new Map(net));
    const settlements = tx
      .map((t) => {
        const from = profileById.get(t.from);
        const to = profileById.get(t.to);
        if (!from || !to) return null;
        return { from, to, amount: t.amount };
      })
      .filter((t): t is { from: ProfileRow; to: ProfileRow; amount: number } => !!t);

    return { balances, settlements };
  }, [groupId, groupExpenses, groupSplits, membersByGroup]);
}
