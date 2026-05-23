import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks';
import { AnimatePresence, motion } from 'motion/react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40 }}
          animate={{ y: 0 }}
          exit={{ y: -40 }}
          className="fixed top-0 inset-x-0 z-[120] bg-amber-500/95 text-slate-900 text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2"
        >
          <WifiOff className="size-3.5" />
          You are offline. Changes will still save locally on this device.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
