/**
 * Supabase implementation of the BudgetBuddy repository layer.
 *
 * Mirrors `localRepos.ts` 1-to-1 so the two are interchangeable from the
 * consumer's perspective (see `./index.ts`).
 *
 * Every method talks to:
 *   • `supabase.auth.*`  for auth
 *   • the Postgres tables defined in `supabase/schema.sql`
 *   • `supabase.storage`  for receipt uploads
 *
 * Row Level Security policies do most of the access-control work — these
 * functions just translate query shapes.
 */

import { supabase } from '@/lib/supabase/client';
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
  AuthSession,
} from '@/types';

// ---------- shared helpers ----------

function fail(scope: string, error: { message: string } | null): never {
  throw new Error(`[supabase:${scope}] ${error?.message ?? 'unknown error'}`);
}

/**
 * Convert a Supabase auth User → our AuthSession shape.
 *
 * IMPORTANT: This is **synchronous** and makes zero DB calls. It runs from
 * inside `onAuthStateChange` callbacks, which hold Supabase's internal auth
 * lock. Any awaited supabase call (including PostgREST queries, which need
 * `auth.getSession()` to fetch the JWT) will deadlock here.
 *
 * The profile row is fetched / created separately by `authStore.setSession`,
 * which runs outside the auth-lock callback.
 */
function buildSessionFromUser(user: { id: string; email?: string | null; user_metadata?: { full_name?: string } }): AuthSession {
  const fullName =
    user.user_metadata?.full_name ??
    (user.email ?? '').split('@')[0] ??
    'New User';

  return {
    userId: user.id,
    email: user.email ?? '',
    fullName,
    issuedAt: new Date().toISOString(),
  };
}

// ---------- auth ----------

export const SupabaseAuthRepo = {
  async register(input: { email: string; password: string; fullName: string }): Promise<AuthSession> {
    const { data, error } = await supabase().auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName },
      },
    });
    if (error) throw new Error(error.message);

    // If email confirmations are enabled there is no session yet — short-circuit.
    if (!data.session) {
      throw new Error(
        'Account created — please check your inbox to confirm your email, then sign in. ' +
        '(Or disable "Confirm email" in Authentication → Settings for instant access.)',
      );
    }

    return buildSessionFromUser({
      id: data.user!.id,
      email: data.user!.email,
      user_metadata: { full_name: input.fullName },
    });
  },

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    const { data, error } = await supabase().auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) throw new Error(error.message);
    return buildSessionFromUser(data.user!);
  },

  async current(): Promise<AuthSession | null> {
    const { data } = await supabase().auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    return buildSessionFromUser(user);
  },

  async logout(): Promise<void> {
    await supabase().auth.signOut();
  },

  /** Supabase manages session persistence — this is a no-op for parity with local impl. */
  persistSession(input: { userId: string; email: string; fullName: string }): AuthSession {
    return { ...input, issuedAt: new Date().toISOString() };
  },

  onAuthChange(handler: (session: AuthSession | null) => void): () => void {
    const { data } = supabase().auth.onAuthStateChange((_evt, sess) => {
      // CRITICAL: this callback runs *inside* Supabase's auth lock. If we
      // synchronously call `handler` and `handler` awaits any supabase op,
      // it will deadlock. We defer to the next macrotask so the lock is
      // released first.
      const next: AuthSession | null = sess?.user
        ? buildSessionFromUser(sess.user)
        : null;
      setTimeout(() => handler(next), 0);
    });
    return () => data.subscription.unsubscribe();
  },
};

// ---------- profiles ----------

export const SupabaseProfileRepo = {
  async get(userId: string): Promise<ProfileRow | undefined> {
    const { data, error } = await supabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) fail('profiles.get', error);
    return data ?? undefined;
  },

  async update(userId: string, patch: Partial<ProfileRow>): Promise<ProfileRow | undefined> {
    // Profiles are normally created by the `handle_new_user` SQL trigger the
    // moment a row appears in `auth.users`. We therefore try a real UPDATE
    // first (so partial patches like `{ onboarding_done: true }` don't wipe
    // other columns), and only fall back to INSERT if the row genuinely
    // doesn't exist — protected by the `profiles_insert_self` RLS policy.
    const now = new Date().toISOString();

    const updatePayload = stripUndefined({ ...patch, updated_at: now });
    const { data: updated, error: updateErr } = await supabase()
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (updateErr) fail('profiles.update', updateErr);
    if (updated) return updated;

    // No existing row — insert one with sensible defaults for missing fields.
    const insertPayload = {
      id: userId,
      full_name: patch.full_name ?? 'New User',
      email: patch.email ?? '',
      monthly_income: patch.monthly_income ?? 0,
      currency: patch.currency ?? 'VND',
      timezone: patch.timezone ?? 'Asia/Ho_Chi_Minh',
      onboarding_done: patch.onboarding_done ?? false,
      avatar_url: patch.avatar_url ?? null,
    };
    const { data: inserted, error: insertErr } = await supabase()
      .from('profiles')
      .insert(insertPayload)
      .select()
      .single();
    if (insertErr) fail('profiles.update.insert-fallback', insertErr);
    return inserted ?? undefined;
  },

  async list(): Promise<ProfileRow[]> {
    const { data, error } = await supabase().from('profiles').select('*');
    if (error) fail('profiles.list', error);
    return data ?? [];
  },

  async listByIds(ids: string[]): Promise<ProfileRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase().from('profiles').select('*').in('id', ids);
    if (error) fail('profiles.listByIds', error);
    return data ?? [];
  },
};

// ---------- groups ----------

export const SupabaseGroupsRepo = {
  async list(_userId: string): Promise<GroupRow[]> {
    // RLS limits results to groups where the caller is a member.
    const { data, error } = await supabase().from('groups').select('*').order('created_at', { ascending: false });
    if (error) fail('groups.list', error);
    return data ?? [];
  },

  async get(id: string): Promise<GroupRow | undefined> {
    const { data, error } = await supabase().from('groups').select('*').eq('id', id).maybeSingle();
    if (error) fail('groups.get', error);
    return data ?? undefined;
  },

  async getByInviteCode(code: string): Promise<GroupRow | undefined> {
    // Only reachable for groups the caller already belongs to — for join flow
    // use `joinByCode` which goes through the SECURITY DEFINER RPC.
    const { data, error } = await supabase()
      .from('groups')
      .select('*')
      .ilike('invite_code', code)
      .maybeSingle();
    if (error) fail('groups.getByInviteCode', error);
    return data ?? undefined;
  },

  async create(input: { name: string; description?: string; createdBy: string; avatarUrl?: string }): Promise<GroupRow> {
    // invite_code is set by the default in the schema (substr(md5(random()::text), 1, 8))
    const { data, error } = await supabase()
      .from('groups')
      .insert({
        name: input.name,
        description: input.description ?? null,
        avatar_url: input.avatarUrl ?? null,
        created_by: input.createdBy,
      })
      .select()
      .single();
    if (error) fail('groups.create', error);

    // Add the creator as an admin member.
    const { error: memberErr } = await supabase()
      .from('group_members')
      .insert({ group_id: data.id, user_id: input.createdBy, role: 'admin' });
    if (memberErr) fail('groups.create.member', memberErr);

    return data;
  },

  async update(id: string, patch: Partial<GroupRow>): Promise<GroupRow | undefined> {
    const { data, error } = await supabase()
      .from('groups')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) fail('groups.update', error);
    return data ?? undefined;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase().from('groups').delete().eq('id', id);
    if (error) fail('groups.remove', error);
    return true;
  },

  async joinByCode(code: string, _userId: string): Promise<GroupRow | null> {
    const { data: groupId, error } = await supabase().rpc('join_group_by_code', { p_code: code });
    if (error) {
      if (error.message.toLowerCase().includes('invalid')) return null;
      throw new Error(error.message);
    }
    if (!groupId) return null;
    return (await SupabaseGroupsRepo.get(groupId as string)) ?? null;
  },
};

// ---------- group members ----------

export const SupabaseGroupMembersRepo = {
  async listByGroup(groupId: string): Promise<GroupMemberRow[]> {
    const { data, error } = await supabase()
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);
    if (error) fail('group_members.listByGroup', error);
    return data ?? [];
  },

  async listByUser(userId: string): Promise<GroupMemberRow[]> {
    const { data, error } = await supabase()
      .from('group_members')
      .select('*')
      .eq('user_id', userId);
    if (error) fail('group_members.listByUser', error);
    return data ?? [];
  },

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase()
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) fail('group_members.isMember', error);
    return !!data;
  },

  async join(groupId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<GroupMemberRow> {
    const { data, error } = await supabase()
      .from('group_members')
      .upsert(
        { group_id: groupId, user_id: userId, role },
        { onConflict: 'group_id,user_id', ignoreDuplicates: false },
      )
      .select()
      .single();
    if (error) fail('group_members.join', error);
    return data;
  },

  async leave(groupId: string, userId: string): Promise<boolean> {
    const { error } = await supabase()
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) fail('group_members.leave', error);
    return true;
  },
};

// ---------- expenses ----------

export const SupabaseExpensesRepo = {
  async listForUser(_userId: string): Promise<ExpenseRow[]> {
    // RLS scopes the result to (own personal + member-of-group) expenses.
    const { data, error } = await supabase()
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    if (error) fail('expenses.listForUser', error);
    return data ?? [];
  },

  async listForGroup(groupId: string): Promise<ExpenseRow[]> {
    const { data, error } = await supabase()
      .from('expenses')
      .select('*')
      .eq('group_id', groupId)
      .order('expense_date', { ascending: false });
    if (error) fail('expenses.listForGroup', error);
    return data ?? [];
  },

  async get(id: string): Promise<ExpenseRow | undefined> {
    const { data, error } = await supabase().from('expenses').select('*').eq('id', id).maybeSingle();
    if (error) fail('expenses.get', error);
    return data ?? undefined;
  },

  async create(payload: Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'>): Promise<ExpenseRow> {
    const { data, error } = await supabase()
      .from('expenses')
      .insert(stripUndefined(payload))
      .select()
      .single();
    if (error) fail('expenses.create', error);
    return data;
  },

  async update(id: string, patch: Partial<ExpenseRow>): Promise<ExpenseRow | undefined> {
    const { data, error } = await supabase()
      .from('expenses')
      .update(stripUndefined({ ...patch, updated_at: new Date().toISOString() }))
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) fail('expenses.update', error);
    return data ?? undefined;
  },

  async remove(id: string): Promise<boolean> {
    // Splits cascade via ON DELETE CASCADE in the schema.
    const { error } = await supabase().from('expenses').delete().eq('id', id);
    if (error) fail('expenses.remove', error);
    return true;
  },
};

// ---------- expense splits ----------

export const SupabaseExpenseSplitsRepo = {
  async listByExpense(expenseId: string): Promise<ExpenseSplitRow[]> {
    const { data, error } = await supabase()
      .from('expense_splits')
      .select('*')
      .eq('expense_id', expenseId);
    if (error) fail('expense_splits.listByExpense', error);
    return data ?? [];
  },

  async listForUser(userId: string): Promise<ExpenseSplitRow[]> {
    const { data, error } = await supabase()
      .from('expense_splits')
      .select('*')
      .eq('user_id', userId);
    if (error) fail('expense_splits.listForUser', error);
    return data ?? [];
  },

  async listByGroup(groupId: string): Promise<ExpenseSplitRow[]> {
    // Easier in two steps because joining over RLS sometimes returns nothing
    // when one side fails — and pulling expenses first lets us reuse the
    // already-RLS-filtered ids.
    const { data: exps, error: expErr } = await supabase()
      .from('expenses')
      .select('id')
      .eq('group_id', groupId);
    if (expErr) fail('expense_splits.listByGroup.expenses', expErr);
    const ids = (exps ?? []).map((e) => e.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase()
      .from('expense_splits')
      .select('*')
      .in('expense_id', ids);
    if (error) fail('expense_splits.listByGroup', error);
    return data ?? [];
  },

  async createMany(rows: Array<Omit<ExpenseSplitRow, 'id' | 'created_at'>>): Promise<ExpenseSplitRow[]> {
    if (rows.length === 0) return [];
    const { data, error } = await supabase()
      .from('expense_splits')
      .insert(rows.map(stripUndefined))
      .select();
    if (error) fail('expense_splits.createMany', error);
    return data ?? [];
  },

  async markSettled(splitId: string): Promise<ExpenseSplitRow | undefined> {
    const { data, error } = await supabase()
      .from('expense_splits')
      .update({ status: 'settled', settled_at: new Date().toISOString() })
      .eq('id', splitId)
      .select()
      .maybeSingle();
    if (error) fail('expense_splits.markSettled', error);
    return data ?? undefined;
  },

  async removeForExpense(expenseId: string): Promise<number> {
    const { error } = await supabase()
      .from('expense_splits')
      .delete()
      .eq('expense_id', expenseId);
    if (error) fail('expense_splits.removeForExpense', error);
    return 0;
  },
};

// ---------- settlements ----------

export const SupabaseSettlementsRepo = {
  async listForUser(userId: string): Promise<SettlementRow[]> {
    const { data, error } = await supabase()
      .from('settlements')
      .select('*')
      .or(`paid_by.eq.${userId},paid_to.eq.${userId}`);
    if (error) fail('settlements.listForUser', error);
    return data ?? [];
  },

  async listForGroup(groupId: string): Promise<SettlementRow[]> {
    const { data, error } = await supabase()
      .from('settlements')
      .select('*')
      .eq('group_id', groupId);
    if (error) fail('settlements.listForGroup', error);
    return data ?? [];
  },

  async create(
    input: Omit<SettlementRow, 'id' | 'created_at' | 'settled_at'> & { settledAt?: Date },
  ): Promise<SettlementRow> {
    const { settledAt, ...rest } = input;
    const { data, error } = await supabase()
      .from('settlements')
      .insert(stripUndefined({ ...rest, settled_at: (settledAt ?? new Date()).toISOString() }))
      .select()
      .single();
    if (error) fail('settlements.create', error);
    return data;
  },
};

// ---------- notifications ----------

export const SupabaseNotificationsRepo = {
  async listForUser(userId: string): Promise<NotificationRow[]> {
    const { data, error } = await supabase()
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) fail('notifications.listForUser', error);
    return data ?? [];
  },

  async unreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase()
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) fail('notifications.unreadCount', error);
    return count ?? 0;
  },

  async create(input: Omit<NotificationRow, 'id' | 'created_at' | 'is_read'>): Promise<NotificationRow> {
    const { data, error } = await supabase()
      .from('notifications')
      .insert(stripUndefined({ ...input, is_read: false }))
      .select()
      .single();
    if (error) fail('notifications.create', error);
    return data;
  },

  async markRead(id: string): Promise<NotificationRow | undefined> {
    const { data, error } = await supabase()
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) fail('notifications.markRead', error);
    return data ?? undefined;
  },

  async markAllRead(userId: string): Promise<void> {
    const { error } = await supabase()
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) fail('notifications.markAllRead', error);
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase().from('notifications').delete().eq('id', id);
    if (error) fail('notifications.remove', error);
    return true;
  },
};

// ---------- ai insights ----------

export const SupabaseAIInsightsRepo = {
  async listForUser(userId: string): Promise<AIInsightRow[]> {
    const { data, error } = await supabase()
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('generated_at', { ascending: false });
    if (error) fail('ai_insights.listForUser', error);
    return data ?? [];
  },

  async create(input: Omit<AIInsightRow, 'id' | 'generated_at' | 'is_dismissed'>): Promise<AIInsightRow> {
    const { data, error } = await supabase()
      .from('ai_insights')
      .insert(stripUndefined({ ...input, is_dismissed: false }))
      .select()
      .single();
    if (error) fail('ai_insights.create', error);
    return data;
  },

  async dismiss(id: string): Promise<AIInsightRow | undefined> {
    const { data, error } = await supabase()
      .from('ai_insights')
      .update({ is_dismissed: true })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) fail('ai_insights.dismiss', error);
    return data ?? undefined;
  },

  async clearForUser(userId: string): Promise<void> {
    const { error } = await supabase().from('ai_insights').delete().eq('user_id', userId);
    if (error) fail('ai_insights.clearForUser', error);
  },
};

// ---------- ai feedback ----------

export const SupabaseAIFeedbackRepo = {
  async listForUser(userId: string): Promise<AIFeedbackRow[]> {
    const { data, error } = await supabase().from('ai_feedback').select('*').eq('user_id', userId);
    if (error) fail('ai_feedback.listForUser', error);
    return data ?? [];
  },

  async record(input: Omit<AIFeedbackRow, 'id' | 'created_at'>): Promise<AIFeedbackRow> {
    const { data, error } = await supabase()
      .from('ai_feedback')
      .insert(stripUndefined(input))
      .select()
      .single();
    if (error) fail('ai_feedback.record', error);
    return data;
  },
};

// ---------- budget limits ----------

export const SupabaseBudgetLimitsRepo = {
  async listForUser(userId: string, monthYear?: string): Promise<BudgetLimitRow[]> {
    let q = supabase().from('budget_limits').select('*').eq('user_id', userId);
    if (monthYear) q = q.eq('month_year', monthYear);
    const { data, error } = await q;
    if (error) fail('budget_limits.listForUser', error);
    return data ?? [];
  },

  async upsert(input: Omit<BudgetLimitRow, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetLimitRow> {
    const { data, error } = await supabase()
      .from('budget_limits')
      .upsert(stripUndefined(input), { onConflict: 'user_id,category,month_year', ignoreDuplicates: false })
      .select()
      .single();
    if (error) fail('budget_limits.upsert', error);
    return data;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase().from('budget_limits').delete().eq('id', id);
    if (error) fail('budget_limits.remove', error);
    return true;
  },
};

// ---------- incomes ----------

export const SupabaseIncomesRepo = {
  async listForUser(userId: string): Promise<IncomeRow[]> {
    const { data, error } = await supabase()
      .from('incomes')
      .select('*')
      .eq('user_id', userId)
      .order('income_date', { ascending: false });
    if (error) fail('incomes.listForUser', error);
    return data ?? [];
  },

  async create(payload: Omit<IncomeRow, 'id' | 'created_at' | 'updated_at'>): Promise<IncomeRow> {
    const { data, error } = await supabase()
      .from('incomes')
      .insert(stripUndefined(payload))
      .select()
      .single();
    if (error) fail('incomes.create', error);
    return data;
  },

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase().from('incomes').delete().eq('id', id);
    if (error) fail('incomes.remove', error);
    return true;
  },
};

// ---------- receipt storage ----------

export const SupabaseReceiptStorage = {
  /** Uploads a file to the `receipts` bucket under `<userId>/<timestamp>-<rand>.<ext>`.
   * Returns a 1-year signed URL (bucket is private). */
  async upload(userId: string, file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase().storage.from('receipts').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) fail('storage.receipts.upload', error);

    const { data: signed, error: signErr } = await supabase()
      .storage
      .from('receipts')
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr) fail('storage.receipts.signedUrl', signErr);
    return signed!.signedUrl;
  },
};

// ---------- admin / dev tools ----------

export async function resetAllSupabaseData(userId: string): Promise<void> {
  // Best-effort cleanup of all rows owned by this user. Cascades clean up splits.
  await Promise.allSettled([
    supabase().from('expenses').delete().eq('user_id', userId),
    supabase().from('budget_limits').delete().eq('user_id', userId),
    supabase().from('incomes').delete().eq('user_id', userId),
    supabase().from('notifications').delete().eq('user_id', userId),
    supabase().from('ai_insights').delete().eq('user_id', userId),
    supabase().from('ai_feedback').delete().eq('user_id', userId),
    supabase().from('settlements').delete().or(`paid_by.eq.${userId},paid_to.eq.${userId}`),
    supabase().from('group_members').delete().eq('user_id', userId),
  ]);
}

// ---------- helpers ----------

/** Remove `undefined` values from an insert/update payload so Supabase doesn't
 *  send `"key": null` for fields the user didn't touch. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
