import { create } from 'zustand';
import { NotificationsRepo } from '@/lib/storage';
import type { NotificationRow } from '@/types';

interface NotificationState {
  notifications: NotificationRow[];
  unreadCount: number;
  loadFor: (userId: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  loadFor: async (userId) => {
    try {
      const list = await NotificationsRepo.listForUser(userId);
      set({
        notifications: list,
        unreadCount: list.filter((n) => !n.is_read).length,
      });
    } catch (e) {
      console.error('[notifications] loadFor failed', e);
    }
  },

  markRead: async (id) => {
    await NotificationsRepo.markRead(id);
    set((state) => {
      const next = state.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      return { notifications: next, unreadCount: next.filter((n) => !n.is_read).length };
    });
  },

  markAllRead: async (userId) => {
    await NotificationsRepo.markAllRead(userId);
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  remove: async (id) => {
    await NotificationsRepo.remove(id);
    set((state) => {
      const next = state.notifications.filter((n) => n.id !== id);
      return { notifications: next, unreadCount: next.filter((n) => !n.is_read).length };
    });
  },
}));
