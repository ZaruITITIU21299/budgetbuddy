import { useEffect } from 'react';
import { realtimeBus } from '@/lib/realtime/channel';
import type { RealtimeEvent } from '@/lib/realtime/channel';

export function useRealtime(tables: string[], handler: (event: RealtimeEvent) => void): void {
  useEffect(() => {
    return realtimeBus.subscribeTo(tables, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join('|')]);
}
