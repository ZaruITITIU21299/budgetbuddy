import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, AlertTriangle, Sparkles, Users, ShieldCheck, X } from 'lucide-react';
import { useNotificationStore, useAuthStore } from '@/stores';
import { formatTimeAgo, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import type { NotificationRow, NotificationType } from '@/types';

const ICONS: Record<NotificationType, typeof AlertTriangle> = {
  budget_warning: AlertTriangle,
  budget_exceeded: AlertTriangle,
  ai_insight: Sparkles,
  group_expense: Users,
  settlement_request: ShieldCheck,
};

const COLORS: Record<NotificationType, string> = {
  budget_warning: 'text-amber-400 bg-amber-500/15',
  budget_exceeded: 'text-rose-400 bg-rose-500/15',
  ai_insight: 'text-violet-400 bg-violet-500/15',
  group_expense: 'text-sky-400 bg-sky-500/15',
  settlement_request: 'text-emerald-400 bg-emerald-500/15',
};

export function NotificationBell() {
  const session = useAuthStore((s) => s.session);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loadFor = useNotificationStore((s) => s.loadFor);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const removeOne = useNotificationStore((s) => s.remove);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session) void loadFor(session.userId);
  }, [session, loadFor]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all relative"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#060B1B]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 top-full mt-2 w-[360px] max-h-[440px] z-50 bg-[#0B1224] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Notifications</h3>
              {session && unreadCount > 0 && (
                <button
                  onClick={() => markAllRead(session.userId)}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto scrollbar-thin flex-1">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-sm text-center text-slate-500">You're all caught up 🎉</p>
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={() => markRead(n.id)}
                    onRemove={() => removeOne(n.id)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onRemove,
}: {
  notification: NotificationRow;
  onMarkRead: () => void;
  onRemove: () => void;
}) {
  const Icon = ICONS[notification.type];
  const color = COLORS[notification.type];
  return (
    <div
      className={cn(
        'p-3 border-b border-white/5 flex gap-3 group hover:bg-white/[0.02]',
        !notification.is_read && 'bg-emerald-500/[0.03]',
      )}
    >
      <div className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-sm font-bold text-white truncate">{notification.title}</h4>
          <span className="text-[10px] text-slate-500 shrink-0">{formatTimeAgo(notification.created_at)}</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notification.body}</p>
        <div className="mt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.is_read && (
            <button
              onClick={onMarkRead}
              className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Check className="size-3" /> Read
            </button>
          )}
          <button
            onClick={onRemove}
            className="text-[10px] font-semibold text-slate-500 hover:text-rose-300 flex items-center gap-1"
          >
            <X className="size-3" /> Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
