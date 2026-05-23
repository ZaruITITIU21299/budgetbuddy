import type { SplitMethod } from '@/types';
import type { GroupMember } from './Group';

/**
 * Bill splitting + debt simplification.
 *
 * `simplifyDebts` minimises the number of pay-back transactions in a group
 * using a classic greedy creditor/debtor matching algorithm. This is the same
 * trick Splitwise uses to reduce "settle up" friction.
 */
export class SplitCalculator {
  constructor(
    private totalAmount: number,
    private members: GroupMember[],
    private method: SplitMethod,
  ) {}

  calculateEqualSplit(): Map<string, number> {
    const out = new Map<string, number>();
    const n = this.members.length;
    if (n === 0) return out;
    const share = Math.floor(this.totalAmount / n);
    let remainder = this.totalAmount - share * n;
    for (const m of this.members) {
      const extra = remainder > 0 ? 1 : 0; // distribute the rounding remainder
      remainder -= extra;
      out.set(m.userId, share + extra);
    }
    return out;
  }

  calculatePercentageSplit(percentages: Map<string, number>): Map<string, number> {
    const out = new Map<string, number>();
    let allocated = 0;
    let lastId: string | null = null;
    for (const m of this.members) {
      const pct = percentages.get(m.userId) ?? 0;
      const amount = Math.floor((this.totalAmount * pct) / 100);
      out.set(m.userId, amount);
      allocated += amount;
      lastId = m.userId;
    }
    // Adjust last member for rounding so total matches
    if (lastId && allocated !== this.totalAmount) {
      out.set(lastId, (out.get(lastId) ?? 0) + (this.totalAmount - allocated));
    }
    return out;
  }

  calculateExactSplit(amounts: Map<string, number>): Map<string, number> | Error {
    let sum = 0;
    for (const v of amounts.values()) sum += v;
    if (sum !== this.totalAmount) {
      return new Error(`Exact split must sum to total (${this.totalAmount}), got ${sum}.`);
    }
    return new Map(amounts);
  }

  calculateSharesSplit(shares: Map<string, number>): Map<string, number> {
    let totalShares = 0;
    for (const v of shares.values()) totalShares += v;
    if (totalShares === 0) return this.calculateEqualSplit();

    const out = new Map<string, number>();
    let allocated = 0;
    let lastId: string | null = null;
    for (const m of this.members) {
      const s = shares.get(m.userId) ?? 0;
      const amount = Math.floor((this.totalAmount * s) / totalShares);
      out.set(m.userId, amount);
      allocated += amount;
      lastId = m.userId;
    }
    if (lastId && allocated !== this.totalAmount) {
      out.set(lastId, (out.get(lastId) ?? 0) + (this.totalAmount - allocated));
    }
    return out;
  }

  calculate(input: { percentages?: Map<string, number>; amounts?: Map<string, number>; shares?: Map<string, number> } = {}): Map<string, number> | Error {
    switch (this.method) {
      case 'equal':
        return this.calculateEqualSplit();
      case 'percentage':
        return this.calculatePercentageSplit(input.percentages ?? new Map());
      case 'exact':
        return this.calculateExactSplit(input.amounts ?? new Map());
      case 'shares':
        return this.calculateSharesSplit(input.shares ?? new Map());
    }
  }

  /**
   * Greedy debt simplification.
   * Input: { userId -> netBalance } where positive = should receive, negative = should pay.
   * Output: smallest list of payments that zeroes everyone out.
   */
  static simplifyDebts(balances: Map<string, number>): Array<{ from: string; to: string; amount: number }> {
    const creditors: Array<{ id: string; amount: number }> = [];
    const debtors: Array<{ id: string; amount: number }> = [];

    for (const [id, balance] of balances) {
      if (balance > 0) creditors.push({ id, amount: balance });
      else if (balance < 0) debtors.push({ id, amount: -balance });
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions: Array<{ from: string; to: string; amount: number }> = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amount, creditors[j].amount);
      if (pay > 0) {
        transactions.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
      }
      debtors[i].amount -= pay;
      creditors[j].amount -= pay;
      if (debtors[i].amount === 0) i++;
      if (creditors[j].amount === 0) j++;
    }
    return transactions;
  }
}
