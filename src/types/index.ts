/**
 * Shared TypeScript type definitions for BudgetBuddy.
 *
 * Naming convention:
 *  - Domain types (e.g. `Expense`) live in `src/models/` as classes.
 *  - DB-row shapes (e.g. `ExpenseRow`) use snake_case to mirror the Supabase schema.
 *  - View types (e.g. `View`, navigation) live here.
 */

export type View =
  | 'dashboard'
  | 'expenses'
  | 'groups'
  | 'reports'
  | 'profile'
  | 'metrics';

export const EXPENSE_CATEGORIES = [
  'food_drink',
  'transport',
  'housing',
  'utilities',
  'education',
  'health',
  'entertainment',
  'shopping',
  'personal_care',
  'travel',
  'savings',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const SPLIT_METHODS = ['equal', 'percentage', 'exact', 'shares'] as const;
export type SplitMethod = (typeof SPLIT_METHODS)[number];

export const SETTLEMENT_STATUSES = ['pending', 'settled'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'budget_warning',
  'budget_exceeded',
  'group_expense',
  'settlement_request',
  'ai_insight',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const INCOME_SOURCES = [
  'part_time',
  'scholarship',
  'family',
  'freelance',
  'other',
] as const;
export type IncomeSource = (typeof INCOME_SOURCES)[number];

// ------------------- DB row shapes (mirror Supabase schema) -------------------

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  monthly_income: number;
  currency: string;
  timezone: string;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetLimitRow {
  id: string;
  user_id: string;
  category: ExpenseCategory;
  amount: number;
  month_year: string; // 'YYYY-MM'
  is_rollover: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface ExpenseRow {
  id: string;
  user_id: string;
  group_id?: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  category_confidence?: number;
  note?: string;
  expense_date: string; // YYYY-MM-DD
  receipt_url?: string;
  ocr_raw_text?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  paid_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSplitRow {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  percentage?: number;
  shares?: number;
  split_method: SplitMethod;
  status: SettlementStatus;
  settled_at?: string;
  created_at: string;
}

export interface SettlementRow {
  id: string;
  group_id?: string;
  paid_by: string;
  paid_to: string;
  amount: number;
  note?: string;
  settled_at: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface AIInsightRow {
  id: string;
  user_id: string;
  insight: string;
  insight_type: 'spending_pattern' | 'budget_forecast' | 'saving_tip';
  metadata?: Record<string, unknown>;
  generated_at: string;
  is_dismissed: boolean;
}

export interface AIFeedbackRow {
  id: string;
  user_id: string;
  expense_id?: string;
  predicted_value: string;
  actual_value: string;
  feedback_type: 'category' | 'ocr_total' | 'budget_forecast';
  created_at: string;
}

export interface IncomeRow {
  id: string;
  user_id: string;
  source: IncomeSource;
  amount: number;
  income_date: string;
  note?: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

// ------------------- View / aggregate types -------------------

export interface MonthlySummary {
  monthYear: string;
  totalSpent: number;
  totalBudget: number;
  totalIncome: number;
  byCategory: Record<ExpenseCategory, number>;
  expenseCount: number;
  avgPerDay: number;
}

export interface MonthlyHistory {
  monthYear: string;
  totalSpent: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

export interface InsightItem {
  type: 'spending_pattern' | 'budget_forecast' | 'saving_tip';
  insight: string;
  metadata?: Record<string, unknown>;
}

export interface BudgetPrediction {
  predictedTotal: number;
  confidence: number;
  reasoning: string;
}

export interface ParsedReceipt {
  merchant: string | null;
  date: string | null;
  total: number | null;
  items: Array<{ name: string; price: number }>;
  categoryHint: ExpenseCategory | null;
}

export interface AuthSession {
  userId: string;
  email: string;
  fullName: string;
  issuedAt: string;
}

export interface AuthCredential {
  email: string;
  passwordHash: string;
  userId: string;
}
