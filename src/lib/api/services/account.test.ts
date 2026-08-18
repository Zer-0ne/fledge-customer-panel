import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOwnProfile,
  fetchSessions,
  revokeSession,
  deleteAccount,
  normalizeSessionsResponse,
  mapRawToUser,
  mapRawToSession,
} from './account';
import { apiFetch } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Account & Sessions API Service', () => {
  const mockApiFetch = vi.mocked(apiFetch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Normalizers', () => {
    it('mapRawToUser handles nested user envelope', () => {
      const user = mapRawToUser({
        user: {
          id: 'u1',
          displayName: 'Ada',
          email: 'ada@example.com',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      });

      expect(user.id).toBe('u1');
      expect(user.displayName).toBe('Ada');
      expect(user.email).toBe('ada@example.com');
    });

    it('normalizeSessionsResponse handles arrays and envelopes', () => {
      const raw = [
        {
          id: 's1',
          deviceLabel: 'Chrome on Linux',
          ipAddress: '1.2.3.4',
          lastActiveAt: '2026-07-30T10:00:00.000Z',
          isCurrent: true,
        },
      ];

      expect(normalizeSessionsResponse(raw)).toHaveLength(1);
      expect(normalizeSessionsResponse({ data: raw })).toHaveLength(1);
      expect(normalizeSessionsResponse({ sessions: raw })).toHaveLength(1);
      expect(normalizeSessionsResponse(null)).toEqual([]);
    });

    it('mapRawToSession maps alternate field names', () => {
      const session = mapRawToSession({
        sessionId: 'abc',
        userAgent: 'Mozilla/5.0',
        ip: '10.0.0.1',
        lastSeenAt: '2026-07-29T00:00:00.000Z',
        current: true,
      });

      expect(session.id).toBe('abc');
      expect(session.deviceLabel).toBe('Mozilla/5.0');
      expect(session.ipAddress).toBe('10.0.0.1');
      expect(session.isCurrent).toBe(true);
    });
  });

  describe('API Endpoints', () => {
    it('fetchOwnProfile calls GET /users/me', async () => {
      mockApiFetch.mockResolvedValueOnce({
        id: 'u1',
        displayName: 'Ada',
        email: 'ada@example.com',
      });

      const profile = await fetchOwnProfile();
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/users/me',
        method: 'GET',
      });
      expect(profile.displayName).toBe('Ada');
    });

    it('fetchSessions retrieves session list', async () => {
      mockApiFetch.mockResolvedValueOnce([
        { id: 's1', deviceLabel: 'Phone', isCurrent: true },
      ]);

      const sessions = await fetchSessions();
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/auth/sessions',
        method: 'GET',
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].isCurrent).toBe(true);
    });

    it('revokeSession deletes by id', async () => {
      mockApiFetch.mockResolvedValueOnce({});

      await revokeSession('session-99');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/auth/sessions/session-99',
        method: 'DELETE',
      });
    });

    it('revokeSession rejects empty id', async () => {
      await expect(revokeSession('')).rejects.toThrow('Session ID is required');
    });

    it('deleteAccount calls DELETE /users/me', async () => {
      mockApiFetch.mockResolvedValueOnce({});

      await deleteAccount();
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/users/me',
        method: 'DELETE',
      });
    });
  });
});
