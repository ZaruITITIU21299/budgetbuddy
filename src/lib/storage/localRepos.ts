/**
 * LocalStorage-backed repository implementation.
 *
 * Every method returns a Promise (even though the underlying JSONTable is
 * synchronous) so the public API in `./index.ts` can swap in the Supabase
 * implementation without any caller changes.
 */

import { JSONTable } from './jsonTable';
import type {
  AIFeedbackRow,
  AIInsightRow,
  BudgetLimitRow,
  ExpenseRow,
  ExpenseSplitRow,
  GroupMemberRow,
  GroupRow,
  IncomeRow,
  NotificationRow,
  ProfileRow,
  SettlementRow,
  AuthCredential,
  AuthSession,
} from '@/types';
import { generateId, generateInviteCode, hashPassword, verifyPassword } from '@/lib/utils';

// ----------------- tables -----------------

const profiles = new JSONTable<ProfileRow>('profiles');
const credentials = new JSONTable<AuthCredential & { id: string }>('credentials');
const session = new JSONTable<AuthSession & { id: string }>('session');
const expenses = new JSONTable<ExpenseRow>('expenses');
const splits = new JSONTable<ExpenseSplitRow>('expense_splits');
const groups = new JSONTable<GroupRow>('groups');
const groupMembers = new JSONTable<GroupMemberRow>('group_members');
const settlements = new JSONTable<SettlementRow>('settlements');
const notifications = new JSONTable<NotificationRow>('notifications');
const aiInsights = new JSONTable<AIInsightRow>('ai_insights');
const aiFeedback = new JSONTable<AIFeedbackRow>('ai_feedback');
const budgetLimits = new JSONTable<BudgetLimitRow>('budget_limits');
const incomes = new JSONTable<IncomeRow>('incomes');

// ----------------- auth -----------------

function persistSession(input: { userId: string; email: string; fullName: string }): AuthSession {
  const sess: AuthSession & { id: string } = {
    id: 'current',
    userId: input.userId,
    email: input.email,
    fullName: input.fullName,
    issuedAt: new Date().toISOString(),
  };
  session.clear();
  session.insert(sess);
  return { userId: sess.userId, email: sess.email, fullName: sess.fullName, issuedAt: sess.issuedAt };
}

export const LocalAuthRepo = {
  async register(input: { email: string; password: string; fullName: string }): Promise<AuthSession> {
    const existing = credentials.find((c) => c.email === input.email);
    if (existing) throw new Error('An account with this email already exists.');

    const userId = generateId();
    const passwordHash = await hashPassword(input.password);

    credentials.insert({ id: userId, userId, email: input.email, passwordHash });

    const now = new Date().toISOString();
    profiles.insert({
      id: userId,
      full_name: input.fullName,
      email: input.email,
      monthly_income: 0,
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      onboarding_done: false,
      created_at: now,
      updated_at: now,
    });

    return persistSession({ userId, email: input.email, fullName: input.fullName });
  },

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    const cred = credentials.find((c) => c.email === input.email);
    if (!cred) throw new Error('No account found for this email.');
    const ok = await verifyPassword(input.password, cred.passwordHash);
    if (!ok) throw new Error('Incorrect password.');
    const profile = profiles.getById(cred.userId);
    if (!profile) throw new Error('Profile missing — please register again.');
    return persistSession({ userId: profile.id, email: profile.email, fullName: profile.full_name });
  },

  async current(): Promise<AuthSession | null> {
    const sess = session.getById('current');
    if (!sess) return null;
    return { userId: sess.userId, email: sess.email, fullName: sess.fullName, issuedAt: sess.issuedAt };
  },

  async logout(): Promise<void> {
    session.clear();
  },

  /** Local-only helper used by the demo seed. Supabase impl is a no-op. */
  persistSession,

  onAuthChange(_handler: (session: AuthSession | null) => void): () => void {
    // BroadcastChannel-based realtime already covers cross-tab session updates
    // for the local implementation, so we don't need an explicit listener.
    return () => {};
  },
};

// ----------------- profiles -----------------

export const LocalProfileRepo = {
  async get(userId: string): Promise<ProfileRow | undefined> {
    return profiles.getById(userId);
  },
  async update(userId: string, patch: Partial<ProfileRow>): Promise<ProfileRow | undefined> {
    return profiles.update(userId, { ...patch, updated_at: new Date().toISOString() });
  },
  async list(): Promise<ProfileRow[]> {
    return profiles.all();
  },
  async listByIds(ids: string[]): Promise<ProfileRow[]> {
    const set = new Set(ids);
    return profiles.filter((p) => set.has(p.id));
  },
};

// ----------------- groups -----------------

export const LocalGroupsRepo = {
  async list(userId: string): Promise<GroupRow[]> {
    const memberOf = new Set(
      groupMembers.filter((m) => m.user_id === userId).map((m) => m.group_id),
    );
    return groups.filter((g) => memberOf.has(g.id));
  },
  async get(id: string): Promise<GroupRow | undefined> {
    return groups.getById(id);
  },
  async getByInviteCode(code: string): Promise<GroupRow | undefined> {
    return groups.find((g) => g.invite_code.toUpperCase() === code.toUpperCase());
  },
  async create(input: { name: string; description?: string; createdBy: string; avatarUrl?: string }): Promise<GroupRow> {
    const id = generateId();
    const now = new Date().toISOString();
    const row: GroupRow = {
      id,
      name: input.name,
      description: input.description,
      avatar_url: input.avatarUrl,
      invite_code: generateInviteCode(),
      created_by: input.createdBy,
      created_at: now,
      updated_at: now,
    };
    groups.insert(row);
    groupMembers.insert({
      id: generateId(),
      group_id: id,
      user_id: input.createdBy,
      role: 'admin',
      joined_at: now,
    });
    return row;
  },
  async update(id: string, patch: Partial<GroupRow>): Promise<GroupRow | undefined> {
    return groups.update(id, { ...patch, updated_at: new Date().toISOString() });
  },
  async remove(id: string): Promise<boolean> {
    groupMembers.removeWhere((m) => m.group_id === id);
    expenses.removeWhere((e) => e.group_id === id);
    return groups.remove(id);
  },
  /** Local equivalent of the SQL `join_group_by_code` RPC. */
  async joinByCode(code: string, userId: string): Promise<GroupRow | null> {
    const grp = groups.find((g) => g.invite_code.toUpperCase() === code.toUpperCase());
    if (!grp) return null;
    const existing = groupMembers.find((m) => m.group_id === grp.id && m.user_id === userId);
    if (!existing) {
      groupMembers.insert({
        id: generateId(),
        group_id: grp.id,
        user_id: userId,
        role: 'member',
        joined_at: new Date().toISOString(),
      });
    }
    return grp;
  },
};

// ----------------- group members -----------------

export const LocalGroupMembersRepo = {
  async listByGroup(groupId: string): Promise<GroupMemberRow[]> {
    return groupMembers.filter((m) => m.group_id === groupId);
  },
  async listByUser(userId: string): Promise<GroupMemberRow[]> {
    return groupMembers.filter((m) => m.user_id === userId);
  },
  async isMember(groupId: string, userId: string): Promise<boolean> {
    return !!groupMembers.find((m) => m.group_id === groupId && m.user_id === userId);
  },
  async join(groupId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<GroupMemberRow> {
    const existing = groupMembers.find((m) => m.group_id === groupId && m.user_id === userId);
    if (existing) return existing;
    return groupMembers.insert({
      id: generateId(),
      group_id: groupId,
      user_id: userId,
      role,
      joined_at: new Date().toISOString(),
    });
  },
  async leave(groupId: string, userId: string): Promise<boolean> {
    return groupMembers.removeWhere((m) => m.group_id === groupId && m.user_id === userId) > 0;
  },
};

// ----------------- expenses -----------------

export const LocalExpensesRepo = {
  async listForUser(userId: string): Promise<ExpenseRow[]> {
    const memberGroups = new Set(
      groupMembers.filter((m) => m.user_id === userId).map((m) => m.group_id),
    );
    return expenses
      .filter((e) => e.user_id === userId || (!!e.group_id && memberGroups.has(e.group_id)))
      .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1));
  },
  async listForGroup(groupId: string): Promise<ExpenseRow[]> {
    return expenses
      .filter((e) => e.group_id === groupId)
      .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1));
  },
  async get(id: string): Promise<ExpenseRow | undefined> {
    return expenses.getById(id);
  },
  async create(payload: Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'>): Promise<ExpenseRow> {
    const id = generateId();
    const now = new Date().toISOString();
    const row: ExpenseRow = { ...payload, id, created_at: now, updated_at: now };
    expenses.insert(row);
    return row;
  },
  async update(id: string, patch: Partial<ExpenseRow>): Promise<ExpenseRow | undefined> {
    return expenses.update(id, { ...patch, updated_at: new Date().toISOString() });
  },
  async remove(id: string): Promise<boolean> {
    splits.removeWhere((s) => s.expense_id === id);
    return expenses.remove(id);
  },
};

// ----------------- expense splits -----------------

export const LocalExpenseSplitsRepo = {
  async listByExpense(expenseId: string): Promise<ExpenseSplitRow[]> {
    return splits.filter((s) => s.expense_id === expenseId);
  },
  async listForUser(userId: string): Promise<ExpenseSplitRow[]> {
    return splits.filter((s) => s.user_id === userId);
  },
  async listByGroup(groupId: string): Promise<ExpenseSplitRow[]> {
    const groupExpenseIds = new Set(expenses.filter((e) => e.group_id === groupId).map((e) => e.id));
    return splits.filter((s) => groupExpenseIds.has(s.expense_id));
  },
  async createMany(rows: Array<Omit<ExpenseSplitRow, 'id' | 'created_at'>>): Promise<ExpenseSplitRow[]> {
    const now = new Date().toISOString();
    const expanded: ExpenseSplitRow[] = rows.map((r) => ({
      ...r,
      id: generateId(),
      created_at: now,
    }));
    splits.insertMany(expanded);
    return expanded;
  },
  async markSettled(splitId: string): Promise<ExpenseSplitRow | undefined> {
    return splits.update(splitId, { status: 'settled', settled_at: new Date().toISOString() });
  },
  async removeForExpense(expenseId: string): Promise<number> {
    return splits.removeWhere((s) => s.expense_id === expenseId);
  },
};

// ----------------- settlements -----------------

export const LocalSettlementsRepo = {
  async listForUser(userId: string): Promise<SettlementRow[]> {
    return settlements.filter((s) => s.paid_by === userId || s.paid_to === userId);
  },
  async listForGroup(groupId: string): Promise<SettlementRow[]> {
    return settlements.filter((s) => s.group_id === groupId);
  },
  async create(
    input: Omit<SettlementRow, 'id' | 'created_at' | 'settled_at'> & { settledAt?: Date },
  ): Promise<SettlementRow> {
    const now = new Date().toISOString();
    const row: SettlementRow = {
      ...input,
      id: generateId(),
      settled_at: input.settledAt?.toISOString() ?? now,
      created_at: now,
    };
    settlements.insert(row);
    return row;
  },
};

// ----------------- notifications -----------------

export const LocalNotificationsRepo = {
  async listForUser(userId: string): Promise<NotificationRow[]> {
    return notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },
  async unreadCount(userId: string): Promise<number> {
    return notifications.filter((n) => n.user_id === userId && !n.is_read).length;
  },
  async create(input: Omit<NotificationRow, 'id' | 'created_at' | 'is_read'>): Promise<NotificationRow> {
    const row: NotificationRow = {
      ...input,
      id: generateId(),
      is_read: false,
      created_at: new Date().toISOString(),
    };
    notifications.insert(row);
    return row;
  },
  async markRead(id: string): Promise<NotificationRow | undefined> {
    return notifications.update(id, { is_read: true });
  },
  async markAllRead(userId: string): Promise<void> {
    for (const n of notifications.filter((n) => n.user_id === userId && !n.is_read)) {
      notifications.update(n.id, { is_read: true });
    }
  },
  async remove(id: string): Promise<boolean> {
    return notifications.remove(id);
  },
};

// ----------------- ai insights -----------------

export const LocalAIInsightsRepo = {
  async listForUser(userId: string): Promise<AIInsightRow[]> {
    return aiInsights
      .filter((i) => i.user_id === userId && !i.is_dismissed)
      .sort((a, b) => (a.generated_at < b.generated_at ? 1 : -1));
  },
  async create(input: Omit<AIInsightRow, 'id' | 'generated_at' | 'is_dismissed'>): Promise<AIInsightRow> {
    const row: AIInsightRow = {
      ...input,
      id: generateId(),
      is_dismissed: false,
      generated_at: new Date().toISOString(),
    };
    aiInsights.insert(row);
    return row;
  },
  async dismiss(id: string): Promise<AIInsightRow | undefined> {
    return aiInsights.update(id, { is_dismissed: true });
  },
  async clearForUser(userId: string): Promise<void> {
    aiInsights.removeWhere((i) => i.user_id === userId);
  },
};

// ----------------- ai feedback -----------------

export const LocalAIFeedbackRepo = {
  async listForUser(userId: string): Promise<AIFeedbackRow[]> {
    return aiFeedback.filter((f) => f.user_id === userId);
  },
  async record(input: Omit<AIFeedbackRow, 'id' | 'created_at'>): Promise<AIFeedbackRow> {
    const row: AIFeedbackRow = {
      ...input,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    aiFeedback.insert(row);
    return row;
  },
};

// ----------------- budget limits -----------------

export const LocalBudgetLimitsRepo = {
  async listForUser(userId: string, monthYear?: string): Promise<BudgetLimitRow[]> {
    return budgetLimits.filter(
      (b) => b.user_id === userId && (!monthYear || b.month_year === monthYear),
    );
  },
  async upsert(input: Omit<BudgetLimitRow, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetLimitRow> {
    const existing = budgetLimits.find(
      (b) =>
        b.user_id === input.user_id &&
        b.category === input.category &&
        b.month_year === input.month_year,
    );
    const now = new Date().toISOString();
    if (existing) {
      const updated = budgetLimits.update(existing.id, { ...input, updated_at: now });
      if (updated) return updated;
    }
    const row: BudgetLimitRow = {
      ...input,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    budgetLimits.insert(row);
    return row;
  },
  async remove(id: string): Promise<boolean> {
    return budgetLimits.remove(id);
  },
};

// ----------------- incomes -----------------

export const LocalIncomesRepo = {
  async listForUser(userId: string): Promise<IncomeRow[]> {
    return incomes
      .filter((i) => i.user_id === userId)
      .sort((a, b) => (a.income_date < b.income_date ? 1 : -1));
  },
  async create(payload: Omit<IncomeRow, 'id' | 'created_at' | 'updated_at'>): Promise<IncomeRow> {
    const now = new Date().toISOString();
    const row: IncomeRow = { ...payload, id: generateId(), created_at: now, updated_at: now };
    incomes.insert(row);
    return row;
  },
  async remove(id: string): Promise<boolean> {
    return incomes.remove(id);
  },
};

// ----------------- receipt storage (local fallback = data URL) -----------------

export const LocalReceiptStorage = {
  async upload(_userId: string, file: File): Promise<string> {
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },
};

// ----------------- admin / dev tools -----------------

export function resetAllLocalStorage(): void {
  profiles.clear();
  credentials.clear();
  session.clear();
  expenses.clear();
  splits.clear();
  groups.clear();
  groupMembers.clear();
  settlements.clear();
  notifications.clear();
  aiInsights.clear();
  aiFeedback.clear();
  budgetLimits.clear();
  incomes.clear();
}

/** Re-exported low-level tables for the local-only seed script. */
export const LocalTables = {
  profiles,
  credentials,
  groups,
  groupMembers,
  expenses,
  splits,
  budgetLimits,
  notifications,
  aiInsights,
  incomes,
  settlements,
};
