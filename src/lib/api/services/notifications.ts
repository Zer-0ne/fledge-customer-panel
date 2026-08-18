/**
 * Notifications API Service
 * List notifications (cursor via `before`), mark read, and manage push preferences.
 * Reference: OpenAPI (`docs/openai.json`) -> `/api/v1/notifications`, `/api/v1/notification-preferences`
 */

import { apiFetch } from '@/lib/api/client';
import {
  Notification,
  NotificationPreference,
  NotificationPreferenceKind,
} from '@/types';

export interface NotificationsPage {
  items: Notification[];
  nextBefore: string | null;
  hasMore: boolean;
}

const PREFERENCE_KINDS: NotificationPreferenceKind[] = [
  'listing_interest',
  'roommate_interest',
  'message',
  'housing_offer',
  'housing_join',
  'housing_response',
  'housing_match',
  'housing_expiry',
];

/**
 * Normalizes raw notification list payloads (array or envelope).
 * Pagination uses `before` (ISO date-time) per OpenAPI.
 */
export function normalizeNotificationsResponse(res: unknown): NotificationsPage {
  if (!res) return { items: [], nextBefore: null, hasMore: false };

  let items: unknown[] = [];
  let nextBefore: string | null = null;
  let hasMore = false;

  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      items = obj.data;
    } else if (Array.isArray(obj.items)) {
      items = obj.items;
    } else if (Array.isArray(obj.notifications)) {
      items = obj.notifications;
    }

    if (typeof obj.nextBefore === 'string') {
      nextBefore = obj.nextBefore;
    } else if (typeof obj.before === 'string') {
      nextBefore = obj.before;
    } else if (typeof obj.nextCursor === 'string') {
      nextBefore = obj.nextCursor;
    }

    if (typeof obj.hasMore === 'boolean') {
      hasMore = obj.hasMore;
    } else {
      hasMore = Boolean(nextBefore);
    }
  }

  const mapped = items.map(mapRawToNotification);

  // If API omits cursor but returned a full page, use oldest createdAt as next `before`
  if (!nextBefore && mapped.length > 0 && hasMore === false && mapped.length >= 20) {
    const oldest = mapped.reduce((min, n) =>
      n.createdAt < min.createdAt ? n : min
    );
    nextBefore = oldest.createdAt;
    hasMore = true;
  }

  return { items: mapped, nextBefore, hasMore: hasMore || Boolean(nextBefore) };
}

export function mapRawToNotification(item: unknown): Notification {
  const raw = (item || {}) as Record<string, unknown>;
  const body = String(raw.body || raw.message || raw.content || '');

  const entityType = typeof raw.entityType === 'string' ? raw.entityType : null;
  const entityId = typeof raw.entityId === 'string' ? raw.entityId : null;

  const explicitUrl =
    typeof raw.targetUrl === 'string'
      ? raw.targetUrl
      : typeof raw.url === 'string'
        ? raw.url
        : typeof raw.link === 'string'
          ? raw.link
          : null;

  // Phase 9 deep links: backend notifications carry an entity target; derive
  // the app route when the payload did not include one. Unknown/unauthorized
  // targets fall back to null (row renders without a link).
  let targetUrl = explicitUrl;
  if (!targetUrl && entityType && entityId) {
    if (entityType === 'housing_request') targetUrl = `/need-now/${entityId}`;
    else if (entityType === 'housing_response') targetUrl = '/need-now';
    else if (entityType === 'listing') targetUrl = `/listings/${entityId}`;
    else if (entityType === 'conversation') targetUrl = `/messages/${entityId}`;
  }

  return {
    id: String(raw.id || ''),
    userId: String(raw.userId || ''),
    kind: String(raw.kind || raw.type || 'system_alert'),
    title: String(raw.title || raw.subject || 'Notification'),
    body,
    message: body,
    targetUrl,
    // Backend returns read state as `readAt` (ISO timestamp / null) — not an
    // `isRead` boolean. Without this mapping every row loads as unread, so the
    // center shows a "New" badge on read notifications and the unread count
    // equals the list length (phantom badges, wrong dashboard card).
    isRead: Boolean(raw.isRead ?? raw.read ?? (typeof raw.readAt === 'string' && raw.readAt.length > 0)),
    createdAt: String(raw.createdAt || raw.timestamp || new Date().toISOString()),
  };
}

/**
 * Normalizes preference list; fills defaults for known kinds when missing.
 */
export function normalizePreferencesResponse(res: unknown): NotificationPreference[] {
  let items: unknown[] = [];

  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      items = obj.data;
    } else if (Array.isArray(obj.items)) {
      items = obj.items;
    } else if (Array.isArray(obj.preferences)) {
      items = obj.preferences;
    }
  }

  const mapped = items.map(mapRawToPreference).filter((p) =>
    PREFERENCE_KINDS.includes(p.kind)
  );

  const byKind = new Map(mapped.map((p) => [p.kind, p]));
  return PREFERENCE_KINDS.map(
    (kind) => byKind.get(kind) || { kind, pushEnabled: true }
  );
}

export function mapRawToPreference(item: unknown): NotificationPreference {
  const raw = (item || {}) as Record<string, unknown>;
  const kind = String(raw.kind || raw.category || '') as NotificationPreferenceKind;

  let pushEnabled = true;
  if (typeof raw.pushEnabled === 'boolean') {
    pushEnabled = raw.pushEnabled;
  } else if (typeof raw.enabled === 'boolean') {
    pushEnabled = raw.enabled;
  } else if (typeof raw.inAppEnabled === 'boolean') {
    pushEnabled = raw.inAppEnabled;
  }

  return { kind, pushEnabled };
}

/**
 * Fetches notifications. Pass `cursor` (ISO date-time) to load older items.
 */
export async function fetchNotifications(options?: {
  before?: string;
  cursor?: string;
  category?: string;
  unreadOnly?: boolean;
}): Promise<NotificationsPage> {
  try {
    const params: Record<string, unknown> = {};
    if (options?.cursor) params.cursor = options.cursor;
    else if (options?.before) params.before = options.before;
    if (options?.category) params.category = options.category;
    if (options?.unreadOnly) params.unreadOnly = 'true';

    const res = await apiFetch<unknown>({
      path: '/api/v1/notifications',
      method: 'GET',
      params,
    });

    return normalizeNotificationsResponse(res);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return { items: [], nextBefore: null, hasMore: false };
  }
}

/** Server-side unread notification count (authoritative badge). */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/notifications/unread-count',
      method: 'GET',
    });
    if (typeof res === 'object' && res !== null) {
      const obj = res as Record<string, unknown>;
      if (typeof obj.unreadCount === 'number') return obj.unreadCount;
    }
    return 0;
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
    return 0;
  }
}

/** Marks EVERY unread notification as read in one server call. */
export async function markAllNotificationsRead(): Promise<number> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/notifications/read-all',
    method: 'POST',
  });
  if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (typeof obj.updated === 'number') return obj.updated;
  }
  return 0;
}

/** Archives a notification (hidden from the center, retained in history). */
export async function archiveNotification(notificationId: string): Promise<void> {
  if (!notificationId) throw new Error('Notification ID is required');
  await apiFetch<unknown>({
    path: `/api/v1/notifications/${notificationId}/archive`,
    method: 'PATCH',
  });
}

/**
 * Marks a single notification as read. Returns 204 on success per OpenAPI.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!notificationId) {
    throw new Error('Notification ID is required');
  }

  await apiFetch<unknown>({
    path: `/api/v1/notifications/${notificationId}/read`,
    method: 'PATCH',
  });
}

/**
 * Fetches push notification preferences by category.
 */
export async function fetchNotificationPreferences(): Promise<NotificationPreference[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/notification-preferences',
      method: 'GET',
    });

    return normalizePreferencesResponse(res);
  } catch (error) {
    console.error('Failed to fetch notification preferences:', error);
    return PREFERENCE_KINDS.map((kind) => ({ kind, pushEnabled: true }));
  }
}

/**
 * Enables or disables push for a preference kind.
 */
export async function updateNotificationPreference(
  kind: NotificationPreferenceKind,
  pushEnabled: boolean
): Promise<NotificationPreference> {
  if (!PREFERENCE_KINDS.includes(kind)) {
    throw new Error(`Invalid preference kind: ${kind}`);
  }

  const res = await apiFetch<unknown>({
    path: `/api/v1/notification-preferences/${kind}`,
    method: 'PUT',
    body: { pushEnabled },
  });

  const raw =
    typeof res === 'object' && res !== null && 'data' in res
      ? (res as { data: unknown }).data
      : res;

  if (raw && typeof raw === 'object') {
    return mapRawToPreference({ ...raw, kind });
  }

  return { kind, pushEnabled };
}

export function preferenceKindLabel(kind: NotificationPreferenceKind): string {
  switch (kind) {
    case 'listing_interest':
      return 'Listing interests';
    case 'roommate_interest':
      return 'Roommate interests';
    case 'message':
      return 'Messages';
    case 'housing_offer':
      return 'Room offers';
    case 'housing_join':
      return 'Join-search requests';
    case 'housing_response':
      return 'Response updates';
    case 'housing_match':
      return 'New matches';
    case 'housing_expiry':
      return 'Requirement expiry';
    default:
      return kind;
  }
}

export function preferenceKindDescription(kind: NotificationPreferenceKind): string {
  switch (kind) {
    case 'listing_interest':
      return 'Updates when someone shows interest in a listing or your inquiry changes status.';
    case 'roommate_interest':
      return 'Updates about roommate post interests and matching requests.';
    case 'message':
      return 'Alerts when you receive new chat messages.';
    case 'housing_offer':
      return 'Alerts when someone offers a listing for your requirement.';
    case 'housing_join':
      return 'Alerts when someone wants to join your search.';
    case 'housing_response':
      return 'Updates when a response is accepted, declined or withdrawn.';
    case 'housing_match':
      return 'Alerts when a listing matches your requirement (or a seeker matches your listing).';
    case 'housing_expiry':
      return 'Reminders when your requirement is about to expire or has expired.';
    default:
      return 'Push notifications for this category.';
  }
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

const DEFAULT_QUIET_HOURS: QuietHours = { enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' };

/** Fetches quiet hours from the preferences endpoint (falls back to defaults). */
export async function fetchQuietHours(): Promise<QuietHours> {
  try {
    const res = await apiFetch<unknown>({ path: '/api/v1/notifications/preferences', method: 'GET' });
    if (typeof res === 'object' && res !== null) {
      const obj = res as Record<string, unknown>;
      const raw = obj.quietHours as Record<string, unknown> | undefined;
      if (raw && typeof raw === 'object') {
        return {
          enabled: Boolean(raw.enabled),
          start: typeof raw.start === 'string' ? raw.start : DEFAULT_QUIET_HOURS.start,
          end: typeof raw.end === 'string' ? raw.end : DEFAULT_QUIET_HOURS.end,
          timezone: typeof raw.timezone === 'string' ? raw.timezone : DEFAULT_QUIET_HOURS.timezone,
        };
      }
    }
    return DEFAULT_QUIET_HOURS;
  } catch (error) {
    console.error('Failed to fetch quiet hours:', error);
    return DEFAULT_QUIET_HOURS;
  }
}

/** Persists quiet hours (HH:MM, IANA timezone). */
export async function updateQuietHours(input: QuietHours): Promise<void> {
  await apiFetch<unknown>({
    path: '/api/v1/notifications/preferences/quiet-hours',
    method: 'PUT',
    body: input,
  });
}
