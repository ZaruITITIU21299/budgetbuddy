import { z } from 'zod';
import {
  EXPENSE_CATEGORIES,
  INCOME_SOURCES,
  NOTIFICATION_TYPES,
  SETTLEMENT_STATUSES,
  SPLIT_METHODS,
} from '@/types';

const vndAmount = z
  .number({ message: 'Amount is required.' })
  .int('Amount must be a whole VND value (no decimals).')
  .positive('Amount must be greater than 0.');

const safeText = (max = 200) =>
  z
    .string()
    .trim()
    .min(1, 'This field is required.')
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((s) => s.replace(/<[^>]*>/g, ''));

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((s) => s.replace(/<[^>]*>/g, ''))
    .optional()
    .or(z.literal('').transform(() => undefined));

export const ExpenseSchema = z.object({
  title: safeText(120),
  amount: vndAmount,
  category: z.enum(EXPENSE_CATEGORIES),
  expenseDate: z.coerce.date(),
  note: optionalText(500),
  groupId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  isRecurring: z.boolean().default(false),
  receiptUrl: z.string().optional(),
  splitMethod: z.enum(SPLIT_METHODS).optional(),
});
export type ExpenseInput = z.infer<typeof ExpenseSchema>;

export const GroupSchema = z.object({
  name: safeText(80),
  description: optionalText(280),
});
export type GroupInput = z.infer<typeof GroupSchema>;

export const BudgetLimitSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().int().min(0, 'Budget cannot be negative.'),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM.'),
  isRollover: z.boolean().default(false),
});
export type BudgetLimitInput = z.infer<typeof BudgetLimitSchema>;

export const SettlementSchema = z.object({
  groupId: z.string().uuid().optional(),
  paidBy: z.string().uuid(),
  paidTo: z.string().uuid(),
  amount: vndAmount,
  note: optionalText(280),
});
export type SettlementInput = z.infer<typeof SettlementSchema>;

export const RegisterSchema = z
  .object({
    fullName: safeText(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ProfileUpdateSchema = z.object({
  fullName: safeText(80),
  monthlyIncome: z.number().int().min(0, 'Income cannot be negative.'),
  timezone: z.string().optional(),
  avatarUrl: z.string().optional(),
});
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

export const IncomeSchema = z.object({
  source: z.enum(INCOME_SOURCES),
  amount: vndAmount,
  incomeDate: z.coerce.date(),
  note: optionalText(280),
  isRecurring: z.boolean().default(false),
});
export type IncomeInput = z.infer<typeof IncomeSchema>;

export const NotificationFilterSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES).optional(),
  isRead: z.boolean().optional(),
});

export const SplitConfigSchema = z.object({
  method: z.enum(SPLIT_METHODS),
  values: z.record(z.string(), z.number().nonnegative()).optional(),
});

export const SettlementStatusSchema = z.enum(SETTLEMENT_STATUSES);
