'use client';

import { create } from 'zustand';
import type { Notification } from '@/types';
import {
  archiveNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/services/notifications';

export interface NotificationFilters {
  /** Registry category (e.g. HOUSING) — omitted for the All/Unread chips. */
  category?: string;
  /** Server-side unread-only filter. */
  unreadOnly?: boolean;
}

interface NotificationState {
  items: Notification[];
  nextBefore: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  markingIds: Set<string>;
  archivingIds: Set<string>;
  /** Active server-side filters — loadMore reuses them. */
  filters: NotificationFilters;
  loadInitial: (filters?: NotificationFilters) => Promise<void>;
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
  filters: {},

  loadInitial: async (filters) => {
    set({ isLoading: true, error: null, filters: filters ?? {} });
    try {
      // The store keeps the requested filters so loadMore pages with the
      // same chip selection instead of silently dropping back to "All".
      const page = await fetchNotifications({
        category: filters?.category,
        unreadOnly: filters?.unreadOnly,
      });
      set({ items: page.items, nextBefore: page.nextBefore, hasMore: page.hasMore });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to load notifications.' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    const { nextBefore, isLoadingMore, filters } = get();
    if (!nextBefore || isLoadingMore) return;
    set({ isLoadingMore: true });
    try {
      const page = await fetchNotifications({
        before: nextBefore,
        category: filters.category,
        unreadOnly: filters.unreadOnly,
      });
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
