/**
 * Storage layer entry point.
 *
 * Decides at module-load time whether to use the Supabase implementation or
 * the localStorage one based on `isSupabaseEnabled()`. Either way, the public
 * shape of each `*Repo` is identical — every method returns a Promise.
 *
 * Consumers should ONLY import from `@/lib/storage` (this file). Direct
 * imports from `./localRepos` or `./supabaseRepos` are reserved for the
 * `services/seed.ts` script which needs raw table access in local mode.
 */

import { isSupabaseEnabled } from '@/lib/supabase/client';
import * as Local from './localRepos';
import * as Sup from './supabaseRepos';

// Active backend label — useful for UI badges + diagnostics.
export const STORAGE_BACKEND: 'supabase' | 'local' = isSupabaseEnabled() ? 'supabase' : 'local';

export const AuthRepo            = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseAuthRepo            : Local.LocalAuthRepo;
export const ProfileRepo         = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseProfileRepo         : Local.LocalProfileRepo;
export const GroupsRepo          = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseGroupsRepo          : Local.LocalGroupsRepo;
export const GroupMembersRepo    = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseGroupMembersRepo    : Local.LocalGroupMembersRepo;
export const ExpensesRepo        = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseExpensesRepo        : Local.LocalExpensesRepo;
export const ExpenseSplitsRepo   = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseExpenseSplitsRepo   : Local.LocalExpenseSplitsRepo;
export const SettlementsRepo     = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseSettlementsRepo     : Local.LocalSettlementsRepo;
export const NotificationsRepo   = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseNotificationsRepo   : Local.LocalNotificationsRepo;
export const AIInsightsRepo      = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseAIInsightsRepo      : Local.LocalAIInsightsRepo;
export const AIFeedbackRepo      = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseAIFeedbackRepo      : Local.LocalAIFeedbackRepo;
export const BudgetLimitsRepo    = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseBudgetLimitsRepo    : Local.LocalBudgetLimitsRepo;
export const IncomesRepo         = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseIncomesRepo         : Local.LocalIncomesRepo;
export const ReceiptStorage      = STORAGE_BACKEND === 'supabase' ? Sup.SupabaseReceiptStorage      : Local.LocalReceiptStorage;

/** Wipes data for the active backend. In Supabase mode, only the current
 *  user's rows are removed (RLS-scoped). In local mode, all tables are cleared. */
export async function resetAllStorage(userId?: string | null): Promise<void> {
  if (STORAGE_BACKEND === 'supabase') {
    if (!userId) throw new Error('resetAllStorage(userId) is required in Supabase mode.');
    await Sup.resetAllSupabaseData(userId);
  } else {
    Local.resetAllLocalStorage();
  }
}

export { JSONTable } from './jsonTable';
