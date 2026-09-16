import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchNotifications } from '@/lib/api/services/notifications';
import { useNotificationStore } from './use-notification-store';

vi.mock('@/lib/api/services/notifications', () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  archiveNotification: vi.fn(),
}));

const emptyPage = { items: [], nextBefore: null, hasMore: false };

beforeEach(() => {
  vi.clearAllMocks();
  useNotificationStore.setState({
    items: [],
    nextBefore: null,
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    markingIds: new Set(),
    archivingIds: new Set(),
    filters: {},
  });
});

describe('useNotificationStore — filter pass-through', () => {
  it('forwards category + unreadOnly to the service on loadInitial', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue(emptyPage);

    await useNotificationStore.getState().loadInitial({ category: 'HOUSING', unreadOnly: true });

    expect(fetchNotifications).toHaveBeenCalledWith({ category: 'HOUSING', unreadOnly: true });
  });

  it('sends an unfiltered request for the All chip', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue(emptyPage);

    await useNotificationStore.getState().loadInitial({ category: undefined, unreadOnly: undefined });

    expect(fetchNotifications).toHaveBeenCalledWith({ category: undefined, unreadOnly: undefined });
  });

  it('keeps the active filter for loadMore (pagination must not reset the chip)', async () => {
    vi.mocked(fetchNotifications).mockResolvedValueOnce({
      items: [],
      nextBefore: '2026-09-15T00:00:00.000Z',
      hasMore: true,
    });
    await useNotificationStore.getState().loadInitial({ category: 'MODERATION' });

    vi.mocked(fetchNotifications).mockResolvedValueOnce(emptyPage);
    await useNotificationStore.getState().loadMore();

    expect(fetchNotifications).toHaveBeenLastCalledWith({
      before: '2026-09-15T00:00:00.000Z',
      category: 'MODERATION',
      unreadOnly: undefined,
    });
  });

  it('stores the page returned for the selected filter', async () => {
    const item = {
      id: 'n1',
      userId: 'u1',
      kind: 'moderation',
      title: 'Photo held',
      body: 'Review needed',
      isRead: false,
      createdAt: '2026-09-16T05:00:00.000Z',
    };
    vi.mocked(fetchNotifications).mockResolvedValue({
      items: [item],
      nextBefore: null,
      hasMore: false,
    });

    await useNotificationStore.getState().loadInitial({ category: 'MODERATION' });

    expect(useNotificationStore.getState().items).toHaveLength(1);
    expect(useNotificationStore.getState().filters).toEqual({ category: 'MODERATION', unreadOnly: undefined });
  });
});
