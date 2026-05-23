import type { ExpenseCategory, ExpenseRow } from '@/types';
import { formatVND, getMonthYearOf } from '@/lib/utils';

/**
 * Domain object for an expense. Keeps formatting + business rules in one place
 * so views can stay dumb.
 */
export class Expense {
  constructor(
    public id: string,
    public userId: string,
    public title: string,
    public amount: number,
    public category: ExpenseCategory,
    public expenseDate: Date,
    public groupId?: string,
    public note?: string,
    public receiptUrl?: string,
    public isRecurring: boolean = false,
    public categoryConfidence?: number,
    public paidBy?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  formatAmount(opts: { compact?: boolean; signed?: boolean } = {}): string {
    return formatVND(this.amount, opts);
  }

  isGroupExpense(): boolean {
    return !!this.groupId;
  }

  isHighConfidenceCategory(): boolean {
    return (this.categoryConfidence ?? 0) >= 0.8;
  }

  isLowConfidenceCategory(): boolean {
    return this.categoryConfidence !== undefined && this.categoryConfidence < 0.6;
  }

  monthYear(): string {
    return getMonthYearOf(this.expenseDate);
  }

  toInsertPayload(): Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: this.userId,
      group_id: this.groupId,
      title: this.title,
      amount: this.amount,
      category: this.category,
      category_confidence: this.categoryConfidence,
      note: this.note,
      expense_date: this.expenseDate.toISOString().slice(0, 10),
      receipt_url: this.receiptUrl,
      is_recurring: this.isRecurring,
      paid_by: this.paidBy,
    };
  }

  toRow(): ExpenseRow {
    return {
      id: this.id,
      ...this.toInsertPayload(),
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }

  static fromRow(row: ExpenseRow): Expense {
    return new Expense(
      row.id,
      row.user_id,
      row.title,
      row.amount,
      row.category,
      new Date(row.expense_date),
      row.group_id,
      row.note,
      row.receipt_url,
      row.is_recurring,
      row.category_confidence,
      row.paid_by,
      new Date(row.created_at),
      new Date(row.updated_at),
    );
  }
}
