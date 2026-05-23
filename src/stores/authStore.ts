import { create } from 'zustand';
import { AuthRepo, ProfileRepo, STORAGE_BACKEND } from '@/lib/storage';
import type { AuthSession, ProfileRow } from '@/types';

interface AuthState {
  session: AuthSession | null;
  profile: ProfileRow | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: AuthSession | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<ProfileRow>) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Build a usable in-memory ProfileRow when we cannot read one from the DB.
 * Lets the app render past the login gate even if the `profiles` row hasn't
 * been created yet (will be backfilled the first time the user saves anything).
 */
function makeStubProfile(session: AuthSession): ProfileRow {
  const now = new Date().toISOString();
  return {
    id: session.userId,
    full_name: session.fullName,
    email: session.email,
    avatar_url: null,
    monthly_income: 0,
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh',
    onboarding_done: false,
    created_at: now,
    updated_at: now,
  } as ProfileRow;
}

/**
 * Fetch the profile row; if it doesn't exist, create one. Falls back to an
 * in-memory stub if the DB call fails (so login never gets blocked on an
 * unrelated infra hiccup).
 */
async function resolveProfile(session: AuthSession): Promise<ProfileRow> {
  try {
    const existing = await ProfileRepo.get(session.userId);
    if (existing) return existing;

    const created = await ProfileRepo.update(session.userId, {
      full_name: session.fullName,
      email: session.email,
      monthly_income: 0,
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      onboarding_done: false,
    });
    return created ?? makeStubProfile(session);
  } catch (e) {
    console.warn('[auth] resolveProfile fell back to stub', e);
    return makeStubProfile(session);
  }
}

// HMR-safe guard: Vite re-imports the store module on every edit, which would
// otherwise stack a new `onAuthChange` listener on each reload. We only want
// one global listener for the lifetime of the page.
declare global {
  // eslint-disable-next-line no-var
  var __bb_auth_listener_attached: boolean | undefined;
}

export const useAuthStore = create<AuthState>((set, get) => {
  if (typeof window !== 'undefined' && !window.__bb_auth_listener_attached) {
    window.__bb_auth_listener_attached = true;
    AuthRepo.onAuthChange?.((sess) => {
      if (!sess) {
        set({ session: null, profile: null });
        return;
      }
      // Skip if we already have this user — login() already did the work and
      // a duplicate resolveProfile() would trigger an unnecessary round-trip.
      const current = get().session;
      if (current?.userId === sess.userId) return;
      void resolveProfile(sess).then((profile) => set({ session: sess, profile }));
    });
  }

  return {
    session: null,
    profile: null,
    isHydrated: false,

    hydrate: async () => {
      // Hard safety net — never let the app sit on "Loading…" forever, even
      // if Supabase / the network completely hang. We bail to the login
      // screen after 4s and let the user retry.
      const safetyTimeout = window.setTimeout(() => {
        if (!get().isHydrated) {
          console.warn('[auth] hydrate took >4s, forcing login screen');
          set({ session: null, profile: null, isHydrated: true });
        }
      }, 4000);

      try {
        const session = await AuthRepo.current();
        if (!session) {
          set({ session: null, profile: null, isHydrated: true });
          return;
        }
        const profile = await resolveProfile(session);
        set({ session, profile, isHydrated: true });
      } catch (e) {
        console.error('[auth] hydrate failed', e);
        set({ session: null, profile: null, isHydrated: true });
      } finally {
        window.clearTimeout(safetyTimeout);
      }
    },

    setSession: async (session) => {
      if (!session) {
        set({ session: null, profile: null });
        return;
      }
      const profile = await resolveProfile(session);
      set({ session, profile });
    },

    refreshProfile: async () => {
      const { session } = get();
      if (!session) return;
      const profile = (await ProfileRepo.get(session.userId)) ?? null;
      if (profile) set({ profile });
    },

    updateProfile: async (patch) => {
      const { session, profile } = get();
      if (!session) return;
      const merged: Partial<ProfileRow> = {
        full_name: profile?.full_name,
        email: profile?.email,
        monthly_income: profile?.monthly_income,
        currency: profile?.currency,
        timezone: profile?.timezone,
        onboarding_done: profile?.onboarding_done,
        avatar_url: profile?.avatar_url,
        ...patch,
      };
      const updated = await ProfileRepo.update(session.userId, merged);
      if (updated) set({ profile: updated });
    },

    login: async (input) => {
      const session = await AuthRepo.login(input);
      await get().setSession(session);
    },

    register: async (input) => {
      const session = await AuthRepo.register(input);
      await get().setSession(session);
    },

    logout: async () => {
      await AuthRepo.logout();
      set({ session: null, profile: null });
    },
  };
});

// Expose for diagnostics + UI badges.
export const ACTIVE_AUTH_BACKEND = STORAGE_BACKEND;
