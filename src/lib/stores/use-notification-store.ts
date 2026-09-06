'use client';

import { create } from 'zustand';
import type { Notification } from '@/types';
import {
  archiveNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/services/notifications';

interface NotificationState {
  items: Notification[];
  nextBefore: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  markingIds: Set<string>;
  archivingIds: Set<string>;
  loadInitial: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<number>;
  archive: (id: string) => Promise<void>;
  prepend: (item: Notification) => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  items: [],
  nextBefore: null,
  hasMore: false,
  isLoading: true,
  isLoadingMore: false,
  error: null,
  markingIds: new Set(),
  archivingIds: new Set(),

  loadInitial: async () => {
    set({ isLoading: true, error: null });
    try {
      const page = await fetchNotifications();
      set({ items: page.items, nextBefore: page.nextBefore, hasMore: page.hasMore });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to load notifications.' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    const { nextBefore, isLoadingMore } = get();
    if (!nextBefore || isLoadingMore) return;
    set({ isLoadingMore: true });
    try {
      const page = await fetchNotifications({ before: nextBefore });
      set((state) => {
        const seen = new Set(state.items.map((n) => n.id));
        return {
          items: [...state.items, ...page.items.filter((n) => !seen.has(n.id))],
          nextBefore: page.nextBefore,
          hasMore: page.hasMore,
        };
      });
    } finally {
      set({ isLoadingMore: false });
    }
  },

  markRead: async (id: string) => {
    const target = get().items.find((n) => n.id === id);
    if (!target || target.isRead || get().markingIds.has(id)) return;
    set((state) => ({ markingIds: new Set(state.markingIds).add(id) }));
    set((state) => ({ items: state.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)) }));
    try {
      await markNotificationRead(id);
    } catch (err: unknown) {
      set((state) => ({ items: state.items.map((n) => (n.id === id ? { ...n, isRead: false } : n)) }));
      throw err;
    } finally {
      set((state) => {
        const next = new Set(state.markingIds);
        next.delete(id);
        return { markingIds: next };
      });
    }
  },

  markAllRead: async () => {
    const unread = get().items.filter((n) => !n.isRead);
    if (unread.length === 0) return 0;
    set((state) => ({ items: state.items.map((n) => ({ ...n, isRead: true })) }));
    try {
      await markAllNotificationsRead();
      return unread.length;
    } catch (err: unknown) {
      const ids = new Set(unread.map((n) => n.id));
      set((state) => ({ items: state.items.map((n) => (ids.has(n.id) ? { ...n, isRead: false } : n)) }));
      throw err;
    }
  },

  archive: async (id: string) => {
    if (get().archivingIds.has(id)) return;
    set((state) => ({ archivingIds: new Set(state.archivingIds).add(id) }));
    try {
      await archiveNotification(id);
      set((state) => ({ items: state.items.filter((n) => n.id !== id) }));
    } finally {
      set((state) => {
        const next = new Set(state.archivingIds);
        next.delete(id);
        return { archivingIds: next };
      });
    }
  },

  prepend: (item: Notification) => {
    set((state) => (state.items.some((n) => n.id === item.id) ? state : { items: [item, ...state.items] }));
  },

  unreadCount: () => get().items.filter((n) => !n.isRead).length,
}));
