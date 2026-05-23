/**
 * Unified realtime event bus.
 *
 * - When Supabase is enabled, we subscribe to `postgres_changes` on every
 *   replicated table (see `supabase/schema.sql` §8 publications) and translate
 *   them into our internal `RealtimeEvent` shape.
 * - When Supabase is *not* configured, we fall back to a `BroadcastChannel`-
 *   based bus that powers cross-tab live updates against localStorage.
 *
 * Subscribers don't need to know which backend is active.
 */

import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';

export type RealtimeOp = 'insert' | 'update' | 'delete';

export interface RealtimeEvent {
  table: string;
  op: RealtimeOp;
  id: string | null;
}

type Listener = (e: RealtimeEvent) => void;

const SUPABASE_TABLES = [
  'expenses',
  'expense_splits',
  'budget_limits',
  'groups',
  'group_members',
  'notifications',
  'ai_insights',
] as const;

class RealtimeBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<Listener> = new Set();

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('bb:realtime');
      this.channel.onmessage = (event) => {
        const data = event.data as RealtimeEvent;
        for (const listener of this.listeners) listener(data);
      };
    }

    if (isSupabaseEnabled()) this.startSupabaseChannel();
  }

  private startSupabaseChannel(): void {
    try {
      const ch = supabase().channel('bb:postgres-changes');
      for (const table of SUPABASE_TABLES) {
        ch.on(
          'postgres_changes' as never,
          { event: '*', schema: 'public', table },
          (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: { id?: string }; old?: { id?: string } }) => {
            const op = payload.eventType.toLowerCase() as RealtimeOp;
            const id = payload.new?.id ?? payload.old?.id ?? null;
            const event: RealtimeEvent = { table, op, id };
            for (const listener of this.listeners) listener(event);
          },
        );
      }
      ch.subscribe();
    } catch (e) {
      console.warn('[realtime] failed to start Supabase channel', e);
    }
  }

  emit(event: RealtimeEvent): void {
    // Local-only fan-out across browser tabs. Supabase emits naturally from
    // the server, so we don't double-publish in that mode.
    if (!isSupabaseEnabled()) {
      this.channel?.postMessage(event);
    }
    for (const listener of this.listeners) listener(event);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeTo(tables: string[], listener: Listener): () => void {
    const set = new Set(tables);
    const wrapper: Listener = (e) => {
      if (set.has(e.table)) listener(e);
    };
    return this.subscribe(wrapper);
  }
}

export const realtimeBus = new RealtimeBus();
