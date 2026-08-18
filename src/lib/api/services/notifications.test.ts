import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchNotifications,
  markNotificationRead,
  fetchNotificationPreferences,
  updateNotificationPreference,
  normalizeNotificationsResponse,
  normalizePreferencesResponse,
  mapRawToNotification,
  preferenceKindLabel,
  fetchUnreadCount,
  markAllNotificationsRead,
  archiveNotification,
  fetchQuietHours,
  updateQuietHours,
} from './notifications';
import { apiFetch } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Notifications API Service', () => {
  const mockApiFetch = vi.mocked(apiFetch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Normalizers', () => {
    it('normalizeNotificationsResponse handles arrays and envelopes', () => {
      const raw = [
        {
          id: 'n1',
          kind: 'message_received',
          title: 'New message',
          body: 'Hello',
          isRead: false,
          createdAt: '2026-07-30T10:00:00.000Z',
        },
      ];

      expect(normalizeNotificationsResponse(raw).items).toHaveLength(1);
      expect(normalizeNotificationsResponse({ items: raw }).items).toHaveLength(1);
      expect(normalizeNotificationsResponse({ data: raw }).items).toHaveLength(1);
      expect(normalizeNotificationsResponse(null).items).toEqual([]);
    });

    it('normalizeNotificationsResponse extracts pagination via before/nextBefore', () => {
      const result = normalizeNotificationsResponse({
        items: [
          {
            id: 'n1',
            title: 'A',
            message: 'msg',
            createdAt: '2026-07-30T12:00:00.000Z',
          },
        ],
        nextBefore: '2026-07-30T11:00:00.000Z',
        hasMore: true,
      });

      expect(result.nextBefore).toBe('2026-07-30T11:00:00.000Z');
      expect(result.hasMore).toBe(true);
      expect(result.items[0].body).toBe('msg');
    });

    it('mapRawToNotification maps alternate field names', () => {
      const n = mapRawToNotification({
        id: 'x',
        type: 'system_alert',
        subject: 'Alert',
        content: 'Something happened',
        link: '/dashboard',
        read: true,
        timestamp: '2026-01-01T00:00:00.000Z',
      });

      expect(n.title).toBe('Alert');
      expect(n.body).toBe('Something happened');
      expect(n.targetUrl).toBe('/dashboard');
      expect(n.isRead).toBe(true);
      expect(n.kind).toBe('system_alert');
    });

    it('normalizePreferencesResponse fills missing kinds with defaults', () => {
      const prefs = normalizePreferencesResponse({
        preferences: [{ kind: 'message', pushEnabled: false }],
      });

      expect(prefs).toHaveLength(8);
      expect(prefs.find((p) => p.kind === 'message')?.pushEnabled).toBe(false);
      expect(prefs.find((p) => p.kind === 'listing_interest')?.pushEnabled).toBe(true);
      expect(prefs.find((p) => p.kind === 'roommate_interest')?.pushEnabled).toBe(true);
      expect(prefs.find((p) => p.kind === 'housing_match')?.pushEnabled).toBe(true);
      expect(prefs.find((p) => p.kind === 'housing_expiry')?.pushEnabled).toBe(true);
    });
  });

  describe('API Endpoints', () => {
    it('fetchNotifications passes before query param', async () => {
      mockApiFetch.mockResolvedValueOnce({ items: [], hasMore: false });

      await fetchNotifications({ before: '2026-07-30T10:00:00.000Z' });

      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/notifications',
        method: 'GET',
        params: { before: '2026-07-30T10:00:00.000Z' },
      });
    });

    it('markNotificationRead patches read endpoint', async () => {
      mockApiFetch.mockResolvedValueOnce({});

      await markNotificationRead('notif-1');

      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/notifications/notif-1/read',
        method: 'PATCH',
      });
    });

    it('markNotificationRead rejects empty id', async () => {
      await expect(markNotificationRead('')).rejects.toThrow('Notification ID is required');
    });

    it('fetchNotificationPreferences returns normalized prefs', async () => {
      mockApiFetch.mockResolvedValueOnce([
        { kind: 'listing_interest', pushEnabled: true },
        { kind: 'roommate_interest', enabled: false },
        { kind: 'message', pushEnabled: true },
      ]);

      const prefs = await fetchNotificationPreferences();
      expect(prefs).toHaveLength(8);
      expect(prefs.find((p) => p.kind === 'roommate_interest')?.pushEnabled).toBe(false);
      expect(prefs.find((p) => p.kind === 'housing_offer')?.pushEnabled).toBe(true);
    });

    it('updateNotificationPreference sends pushEnabled body', async () => {
      mockApiFetch.mockResolvedValueOnce({ kind: 'message', pushEnabled: false });

      const result = await updateNotificationPreference('message', false);

      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/notification-preferences/message',
        method: 'PUT',
        body: { pushEnabled: false },
      });
      expect(result.pushEnabled).toBe(false);
      expect(result.kind).toBe('message');
    });
  });

  describe('Labels', () => {
    it('preferenceKindLabel returns human labels', () => {
      expect(preferenceKindLabel('listing_interest')).toContain('Listing');
      expect(preferenceKindLabel('roommate_interest')).toContain('Roommate');
      expect(preferenceKindLabel('message')).toContain('Message');
    });
  });

  describe('Phase 7 — unread count, read-all, archive, quiet hours', () => {
    it('fetchUnreadCount reads the server count', async () => {
      mockApiFetch.mockResolvedValueOnce({ unreadCount: 7 });
      expect(await fetchUnreadCount()).toBe(7);
      expect(mockApiFetch).toHaveBeenCalledWith({ path: '/api/v1/notifications/unread-count', method: 'GET' });
    });

    it('fetchUnreadCount returns 0 on missing shape', async () => {
      mockApiFetch.mockResolvedValueOnce({});
      expect(await fetchUnreadCount()).toBe(0);
    });

    it('markAllNotificationsRead posts read-all', async () => {
      mockApiFetch.mockResolvedValueOnce({ updated: 12 });
      expect(await markAllNotificationsRead()).toBe(12);
      expect(mockApiFetch).toHaveBeenCalledWith({ path: '/api/v1/notifications/read-all', method: 'POST' });
    });

    it('archiveNotification patches the archive endpoint', async () => {
      mockApiFetch.mockResolvedValueOnce(undefined);
      await archiveNotification('notif-1');
      expect(mockApiFetch).toHaveBeenCalledWith({ path: '/api/v1/notifications/notif-1/archive', method: 'PATCH' });
    });

    it('fetchQuietHours parses the preferences envelope', async () => {
      mockApiFetch.mockResolvedValueOnce({
        preferences: [],
        quietHours: { enabled: true, start: '23:00', end: '07:30', timezone: 'Asia/Kolkata' },
      });
      const qh = await fetchQuietHours();
      expect(qh.enabled).toBe(true);
      expect(qh.start).toBe('23:00');
      expect(qh.end).toBe('07:30');
    });

    it('fetchQuietHours falls back to defaults', async () => {
      mockApiFetch.mockResolvedValueOnce({ preferences: [] });
      const qh = await fetchQuietHours();
      expect(qh).toEqual({ enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' });
    });

    it('updateQuietHours sends the full payload', async () => {
      mockApiFetch.mockResolvedValueOnce(undefined);
      await updateQuietHours({ enabled: true, start: '23:00', end: '07:00', timezone: 'Asia/Kolkata' });
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/notifications/preferences/quiet-hours',
        method: 'PUT',
        body: { enabled: true, start: '23:00', end: '07:00', timezone: 'Asia/Kolkata' },
      });
    });
  });
});
