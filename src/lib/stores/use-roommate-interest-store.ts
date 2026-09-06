'use client';

import { create } from 'zustand';
import type { RoommateInterest } from '@/types';
import {
  fetchRoommateInterests,
  updateRoommateInterestStatus,
  type GroupedRoommateInterests,
} from '@/lib/api/services/roommates';

export type InterestTab = 'incoming' | 'outgoing';
export type InterestStatus = 'accepted' | 'rejected' | 'withdrawn';

interface RoommateInterestState {
  data: GroupedRoommateInterests;
  activeTab: InterestTab;
  isLoading: boolean;
  error: string | null;
  actionLoadingId: string | null;
  setTab: (tab: InterestTab) => void;
  setActionLoadingId: (id: string | null) => void;
  load: (userId?: string) => Promise<void>;
  updateStatus: (interest: RoommateInterest, status: InterestStatus) => Promise<void>;
}

export const useRoommateInterestStore = create<RoommateInterestState>()((set) => ({
  data: { incoming: [], outgoing: [] },
  activeTab: 'outgoing',
  isLoading: true,
  error: null,
  actionLoadingId: null,

  setTab: (tab) => set({ activeTab: tab }),

  setActionLoadingId: (id) => set({ actionLoadingId: id }),

  load: async (userId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchRoommateInterests(userId);
      set({ data: res ?? { incoming: [], outgoing: [] } });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Could not load your interests' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateStatus: async (interest, status) => {
    const listKey = interest.direction === 'incoming' ? 'incoming' : 'outgoing';
    const oldStatus = interest.status;
    set((state) => ({
      data: {
        ...state.data,
        [listKey]: state.data[listKey].map((item) =>
          item.id === interest.id ? { ...item, status } : item,
        ),
      },
      actionLoadingId: interest.id,
    }));
    try {
      await updateRoommateInterestStatus(interest.id, status);
    } catch (err: unknown) {
      set((state) => ({
        data: {
          ...state.data,
          [listKey]: state.data[listKey].map((item) =>
            item.id === interest.id ? { ...item, status: oldStatus } : item,
          ),
        },
      }));
      throw err;
    } finally {
      set({ actionLoadingId: null });
    }
  },
}));
