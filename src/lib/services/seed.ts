/**
 * Demo seed for the "Continue as demo user" button.
 *
 * Two execution paths:
 *
 *   • LOCAL mode  — wipes localStorage and re-creates a fully populated demo
 *     account with friends, groups, splits, and insights.
 *
 *   • SUPABASE mode — tries to sign in the demo account first; if that fails,
 *     calls `supabase.auth.signUp` and waits for the on-account trigger to
 *     create the profile, then upserts budget limits + a welcome notification.
 *     Group/split seeding is skipped (real groups need real authed members).
 */
import {
  AIInsightsRepo,
  BudgetLimitsRepo,
  ExpenseSplitsRepo,
  ExpensesRepo,
  GroupMembersRepo,
  GroupsRepo,
  IncomesRepo,
  NotificationsRepo,
  ProfileRepo,
  STORAGE_BACKEND,
} from '@/lib/storage';
import {
  LocalAuthRepo,
  LocalTables,
  resetAllLocalStorage,
} from '@/lib/storage/localRepos';
import { SupabaseAuthRepo } from '@/lib/storage/supabaseRepos';
import { generateId, getCurrentMonthYear, hashPassword } from '@/lib/utils';
import type {
  AuthCredential,
  AuthSession,
  ExpenseCategory,
} from '@/types';

const DEMO_EMAIL = 'minh.demo@hcmiu.edu.vn';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'Minh Nguyen';

interface SeedExpense {
  daysAgo: number;
  title: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  groupName?: string;
}

const SEED_EXPENSES: SeedExpense[] = [
  { daysAgo: 0, title: 'Phở Bò breakfast', amount: 45000, category: 'food_drink' },
  { daysAgo: 0, title: 'Grab to campus', amount: 28000, category: 'transport' },
  { daysAgo: 1, title: 'Highlands cà phê', amount: 65000, category: 'food_drink' },
  { daysAgo: 1, title: 'Bún bò Huế dinner', amount: 55000, category: 'food_drink' },
  { daysAgo: 2, title: 'IELTS textbook', amount: 320000, category: 'education' },
  { daysAgo: 2, title: 'Cinema with roommates', amount: 320000, category: 'entertainment', groupName: 'Roommates Q302' },
  { daysAgo: 3, title: 'Wifi tháng 5', amount: 180000, category: 'utilities', groupName: 'Roommates Q302' },
  { daysAgo: 4, title: 'Shopee — bàn học', amount: 850000, category: 'shopping' },
  { daysAgo: 5, title: 'Cơm tấm chợ Bến Thành', amount: 50000, category: 'food_drink' },
  { daysAgo: 5, title: 'Grab xăng', amount: 60000, category: 'transport' },
  { daysAgo: 6, title: 'Tiền trọ tháng 5', amount: 2200000, category: 'housing', groupName: 'Roommates Q302' },
  { daysAgo: 7, title: 'Gym Elite membership', amount: 450000, category: 'health' },
  { daysAgo: 8, title: 'Trà sữa Phúc Long', amount: 55000, category: 'food_drink' },
  { daysAgo: 9, title: 'Photocopy bài giảng', amount: 25000, category: 'education' },
  { daysAgo: 10, title: 'Bus tháng', amount: 100000, category: 'transport' },
  { daysAgo: 12, title: 'Bữa tối nhóm AI', amount: 240000, category: 'food_drink', groupName: 'AI Team Project' },
  { daysAgo: 14, title: 'Điện tháng', amount: 320000, category: 'utilities', groupName: 'Roommates Q302' },
  { daysAgo: 16, title: 'Lazada — tai nghe', amount: 690000, category: 'shopping' },
  { daysAgo: 18, title: 'Cà phê + bánh ngọt', amount: 78000, category: 'food_drink' },
  { daysAgo: 20, title: 'Học phí học kỳ', amount: 7500000, category: 'education' },
  { daysAgo: 25, title: 'KFC dinner', amount: 145000, category: 'food_drink' },
  { daysAgo: 30, title: 'Tour Đà Lạt', amount: 1800000, category: 'travel', groupName: 'Roommates Q302' },
  { daysAgo: 32, title: 'Bún chả Hà Nội', amount: 60000, category: 'food_drink' },
  { daysAgo: 40, title: 'Tiền trọ tháng 4', amount: 2200000, category: 'housing', groupName: 'Roommates Q302' },
  { daysAgo: 42, title: 'Spotify Premium', amount: 59000, category: 'entertainment' },
];

const BUDGET_LIMITS: Array<{ category: ExpenseCategory; amount: number }> = [
  { category: 'food_drink', amount: 2_000_000 },
  { category: 'transport', amount: 800_000 },
  { category: 'housing', amount: 2_500_000 },
  { category: 'utilities', amount: 600_000 },
  { category: 'education', amount: 1_000_000 },
  { category: 'entertainment', amount: 800_000 },
  { category: 'shopping', amount: 1_000_000 },
  { category: 'health', amount: 500_000 },
];

const ROOMMATE_NAMES = ['Lan Phạm', 'Khang Trần'];
const TEAM_NAMES = ['Quân Lê', 'Hà Nguyễn', 'Tú Vũ', 'My Đỗ'];

export async function seedDemoAccount(): Promise<AuthSession> {
  return STORAGE_BACKEND === 'supabase' ? seedSupabase() : seedLocal();
}

export function getDemoCredentials() {
  return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
}

/** Local (offline) seed — wipes localStorage and builds a rich demo dataset. */
async function seedLocal(): Promise<AuthSession> {
  resetAllLocalStorage();

  const userId = generateId();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  LocalTables.credentials.insert(
    { id: userId, userId, email: DEMO_EMAIL, passwordHash } as AuthCredential & { id: string },
  );

  const now = new Date().toISOString();
  LocalTables.profiles.insert({
    id: userId,
    full_name: DEMO_NAME,
    email: DEMO_EMAIL,
    avatar_url: undefined,
    monthly_income: 4_500_000,
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh',
    onboarding_done: true,
    created_at: now,
    updated_at: now,
  });

  const memberIds: Record<string, string> = {};
  for (const name of [...ROOMMATE_NAMES, ...TEAM_NAMES]) {
    const id = generateId();
    memberIds[name] = id;
    LocalTables.profiles.insert({
      id,
      full_name: name,
      email: `${id.slice(0, 6)}@hcmiu.edu.vn`,
      avatar_url: undefined,
      monthly_income: 0,
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      onboarding_done: true,
      created_at: now,
      updated_at: now,
    });
  }

  const roommatesGroup = await GroupsRepo.create({
    name: 'Roommates Q302',
    description: 'Phòng 302 ký túc xá — 3 người',
    createdBy: userId,
  });
  for (const n of ROOMMATE_NAMES) await GroupMembersRepo.join(roommatesGroup.id, memberIds[n]);

  const teamGroup = await GroupsRepo.create({
    name: 'AI Team Project',
    description: 'Group đồ án môn AI',
    createdBy: userId,
  });
  for (const n of TEAM_NAMES) await GroupMembersRepo.join(teamGroup.id, memberIds[n]);

  const monthYear = getCurrentMonthYear();
  for (const limit of BUDGET_LIMITS) {
    await BudgetLimitsRepo.upsert({
      user_id: userId,
      category: limit.category,
      amount: limit.amount,
      month_year: monthYear,
      is_rollover: false,
    });
  }

  const groupIdByName: Record<string, { id: string; members: string[] }> = {
    'Roommates Q302': { id: roommatesGroup.id, members: [userId, ...ROOMMATE_NAMES.map((n) => memberIds[n])] },
    'AI Team Project': { id: teamGroup.id, members: [userId, ...TEAM_NAMES.map((n) => memberIds[n])] },
  };

  for (const seed of SEED_EXPENSES) {
    const date = new Date();
    date.setDate(date.getDate() - seed.daysAgo);
    const dateISO = date.toISOString().slice(0, 10);

    const group = seed.groupName ? groupIdByName[seed.groupName] : undefined;

    const expense = await ExpensesRepo.create({
      user_id: userId,
      group_id: group?.id,
      title: seed.title,
      amount: seed.amount,
      category: seed.category,
      category_confidence: 0.88,
      note: seed.note,
      expense_date: dateISO,
      is_recurring: false,
      paid_by: group ? userId : undefined,
    });

    if (group) {
      const share = Math.floor(seed.amount / group.members.length);
      const remainder = seed.amount - share * group.members.length;
      await ExpenseSplitsRepo.createMany(
        group.members.map((mid, idx) => ({
          expense_id: expense.id,
          user_id: mid,
          amount_owed: idx === 0 ? share + remainder : share,
          split_method: 'equal',
          status: mid === userId ? 'settled' : 'pending',
        })),
      );
    }
  }

  await IncomesRepo.create({
    user_id: userId,
    source: 'part_time',
    amount: 3_500_000,
    income_date: new Date().toISOString().slice(0, 10),
    is_recurring: true,
    note: 'Part-time tutoring',
  });
  await IncomesRepo.create({
    user_id: userId,
    source: 'family',
    amount: 1_000_000,
    income_date: new Date(Date.now() - 5 * 86400_000).toISOString().slice(0, 10),
    is_recurring: false,
  });

  await AIInsightsRepo.create({
    user_id: userId,
    insight: 'You spent 22% more on food this week than your 4-week average. Try a 2-day meal-prep next week.',
    insight_type: 'spending_pattern',
    metadata: { category: 'food_drink', change_pct: 0.22 },
  });
  await AIInsightsRepo.create({
    user_id: userId,
    insight: 'At your current rate, you will end the month within 5% of your overall budget. Nice pace!',
    insight_type: 'budget_forecast',
    metadata: { confidence: 0.78 },
  });

  await NotificationsRepo.create({
    user_id: userId,
    type: 'ai_insight',
    title: 'Welcome to BudgetBuddy',
    body: 'We pre-loaded a demo account with realistic expenses so you can explore every feature instantly.',
  });

  return LocalAuthRepo.persistSession({ userId, email: DEMO_EMAIL, fullName: DEMO_NAME });
}

/** Supabase seed — sign in (or sign up) the demo account, then top up data
 *  if the account is empty. Idempotent: calling it on an already-seeded
 *  account just logs in. */
async function seedSupabase(): Promise<AuthSession> {
  let session: AuthSession;
  try {
    session = await SupabaseAuthRepo.login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  } catch (loginErr) {
    // Account probably doesn't exist yet — try to register it.
    try {
      session = await SupabaseAuthRepo.register({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        fullName: DEMO_NAME,
      });
    } catch (regErr) {
      const msg = regErr instanceof Error ? regErr.message : String(regErr);
      // If email confirmation is required this surfaces a helpful instruction.
      if (msg.toLowerCase().includes('confirm')) throw regErr;
      throw new Error(
        `Failed to log in or create the demo account: ${
          loginErr instanceof Error ? loginErr.message : String(loginErr)
        }`,
      );
    }
  }

  const userId = session.userId;

  // Ensure profile completion (onboarding_done = true so we don't loop the wizard).
  await ProfileRepo.update(userId, {
    full_name: DEMO_NAME,
    email: DEMO_EMAIL,
    monthly_income: 4_500_000,
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh',
    onboarding_done: true,
  });

  // Only seed if the account is empty (idempotency).
  const existing = await ExpensesRepo.listForUser(userId);
  if (existing.length > 0) {
    return session;
  }

  const monthYear = getCurrentMonthYear();
  await Promise.all(
    BUDGET_LIMITS.map((limit) =>
      BudgetLimitsRepo.upsert({
        user_id: userId,
        category: limit.category,
        amount: limit.amount,
        month_year: monthYear,
        is_rollover: false,
      }),
    ),
  );

  // Personal expenses only (group expenses need real members). We still mark
  // the would-be group ones as personal so the demo dashboard has data.
  await Promise.all(
    SEED_EXPENSES.map((seed) => {
      const date = new Date();
      date.setDate(date.getDate() - seed.daysAgo);
      return ExpensesRepo.create({
        user_id: userId,
        title: seed.title,
        amount: seed.amount,
        category: seed.category,
        category_confidence: 0.88,
        note: seed.note,
        expense_date: date.toISOString().slice(0, 10),
        is_recurring: false,
      });
    }),
  );

  await IncomesRepo.create({
    user_id: userId,
    source: 'part_time',
    amount: 3_500_000,
    income_date: new Date().toISOString().slice(0, 10),
    is_recurring: true,
    note: 'Part-time tutoring',
  });

  await AIInsightsRepo.create({
    user_id: userId,
    insight: 'You spent 22% more on food this week than your 4-week average. Try a 2-day meal-prep next week.',
    insight_type: 'spending_pattern',
    metadata: { category: 'food_drink', change_pct: 0.22 },
  });

  await NotificationsRepo.create({
    user_id: userId,
    type: 'ai_insight',
    title: 'Welcome to BudgetBuddy',
    body: 'Demo account seeded — explore your dashboard, reports, and AI insights.',
  });

  return session;
}

/** Used by registration flow to insert a profile row immediately after signup
 *  when the SQL `handle_new_user` trigger hasn't fired yet (older projects). */
export async function ensureProfile(userId: string, fullName: string, email: string): Promise<void> {
  const existing = await ProfileRepo.get(userId);
  if (!existing) {
    await ProfileRepo.update(userId, {
      full_name: fullName,
      email,
      monthly_income: 0,
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      onboarding_done: false,
    });
  }
}
