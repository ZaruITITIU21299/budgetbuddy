import { useEffect } from 'react';
import { useUIStore } from '@/stores';

export function useOnlineStatus(): boolean {
  const isOnline = useUIStore((s) => s.isOnline);
  const setIsOnline = useUIStore((s) => s.setIsOnline);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [setIsOnline]);

  return isOnline;
}
