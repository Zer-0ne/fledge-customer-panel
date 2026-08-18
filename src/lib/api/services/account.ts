/**
 * Account & Sessions API Service
 * Profile (read-only), session list/revoke, and account deletion.
 * Reference: OpenAPI (`docs/openai.json`) -> `/api/v1/users/me`, `/api/v1/auth/sessions`
 */

import { apiFetch } from '@/lib/api/client';
import { AuthSession, User } from '@/types';

/**
 * Maps raw profile payloads into a User.
 */
export function mapRawToUser(item: unknown): User {
  const raw = (item || {}) as Record<string, unknown>;
  const nested =
    typeof raw.user === 'object' && raw.user !== null
      ? (raw.user as Record<string, unknown>)
      : raw;

  return {
    id: String(nested.id || ''),
    displayName: String(nested.displayName || nested.name || 'User'),
    email: typeof nested.email === 'string' ? nested.email : null,
    phone: typeof nested.phone === 'string' ? nested.phone : null,
    avatarUrl: typeof nested.avatarUrl === 'string' ? nested.avatarUrl : null,
    bio: typeof nested.bio === 'string' ? nested.bio : null,
    collegeId: typeof nested.collegeId === 'string' ? nested.collegeId : null,
    campusId: typeof nested.campusId === 'string' ? nested.campusId : null,
    createdAt: String(nested.createdAt || new Date().toISOString()),
    updatedAt: String(nested.updatedAt || nested.createdAt || new Date().toISOString()),
  };
}

/**
 * Normalizes session list payloads (array or envelope).
 */
export function normalizeSessionsResponse(res: unknown): AuthSession[] {
  if (!res) return [];

  let items: unknown[] = [];
  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      items = obj.data;
    } else if (Array.isArray(obj.items)) {
      items = obj.items;
    } else if (Array.isArray(obj.sessions)) {
      items = obj.sessions;
    }
  }

  return items.map(mapRawToSession);
}

export function mapRawToSession(item: unknown): AuthSession {
  const raw = (item || {}) as Record<string, unknown>;

  const deviceLabel = String(
    raw.deviceLabel ||
      raw.deviceName ||
      raw.userAgent ||
      raw.device ||
      'Unknown device'
  );

  return {
    id: String(raw.id || raw.sessionId || ''),
    deviceLabel,
    ipAddress:
      typeof raw.ipAddress === 'string'
        ? raw.ipAddress
        : typeof raw.ip === 'string'
          ? raw.ip
          : null,
    lastActiveAt: String(
      raw.lastActiveAt || raw.lastSeenAt || raw.updatedAt || raw.createdAt || new Date().toISOString()
    ),
    isCurrent: Boolean(raw.isCurrent || raw.current || raw.isThisDevice),
  };
}

/**
 * Fetches the authenticated user's profile (`GET /users/me`).
 */
export async function fetchOwnProfile(): Promise<User> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/users/me',
    method: 'GET',
  });

  const raw =
    typeof res === 'object' && res !== null && 'data' in res
      ? (res as { data: unknown }).data
      : res;

  return mapRawToUser(raw);
}

/**
 * Lists active login sessions for the current user.
 */
export async function fetchSessions(): Promise<AuthSession[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/auth/sessions',
      method: 'GET',
    });

    return normalizeSessionsResponse(res);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return [];
  }
}

/**
 * Revokes a specific session by ID (`DELETE /auth/sessions/{id}` -> 204).
 */
export async function revokeSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  await apiFetch<unknown>({
    path: `/api/v1/auth/sessions/${sessionId}`,
    method: 'DELETE',
  });
}

/**
 * Requests permanent account deletion (`DELETE /users/me` -> 204).
 */
export async function deleteAccount(): Promise<void> {
  await apiFetch<unknown>({
    path: '/api/v1/users/me',
    method: 'DELETE',
  });
}
