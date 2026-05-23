/**
 * Supabase client singleton.
 *
 * If `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are both set, we initialise
 * the official `@supabase/supabase-js` client and the rest of the app talks
 * to Postgres + Auth + Storage + Realtime.
 *
 * If either env var is missing, `isSupabaseEnabled()` returns `false` and
 * the storage layer falls back to the localStorage repos.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL  = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

function isConfigured(): boolean {
  return !!URL && !!ANON && URL.length > 10 && ANON.length > 20;
}

if (isConfigured()) {
  client = createClient(URL!, ANON!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Required for password-recovery / magic-link flows: supabase-js parses
      // the `#access_token=...&type=recovery` fragment on page load and emits
      // a `PASSWORD_RECOVERY` event via onAuthStateChange.
      detectSessionInUrl: true,
      flowType: 'implicit',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'bb:auth',
    },
    realtime: {
      params: { eventsPerSecond: 4 },
    },
    // NOTE: We intentionally don't pass a custom `global.headers` here —
    // any non-standard header forces a CORS preflight on every request and
    // Supabase's allow-list does not always include arbitrary headers, which
    // can manifest as silent hangs in the browser.
  });
}

export function isSupabaseEnabled(): boolean {
  return client !== null;
}

export function supabase(): SupabaseClient {
  if (!client) {
    throw new Error(
      'Supabase client requested but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set in .env.local.',
    );
  }
  return client;
}

/** Convenience helper used by stores and adapters that want to short-circuit. */
export function supabaseOrNull(): SupabaseClient | null {
  return client;
}
