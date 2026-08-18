/**
 * Announcements client — `src/lib/api/services/announcements.ts`
 *
 * Fetches published, audience-matched announcements for the current user and
 * tracks receipt states (seen/read/acknowledged). Failure isolation: returns
 * empty lists / no-ops on error so announcements never break host pages.
 */
import { apiFetch } from '@/lib/api/client';
import type { AnnouncementItem, AnnouncementMode, AnnouncementType } from '@/types';

const ANNOUNCEMENT_TYPES = ['INFORMATION', 'MAINTENANCE', 'POLICY_UPDATE', 'URGENT', 'PROMOTIONAL', 'PAYMENT_NOTICE', 'PARTNER_NOTICE', 'SAFETY_ALERT'] as const;
const ANNOUNCEMENT_MODES = ['NOTICE_CENTER', 'TOP_BANNER', 'MODAL', 'DASHBOARD_CARD', 'PUSH_NOTIFICATION'] as const;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

function normalizeMode(v: unknown): AnnouncementMode | null {
  const s = String(v ?? '').toUpperCase();
  return (ANNOUNCEMENT_MODES as readonly string[]).includes(s) ? (s as AnnouncementMode) : null;
}

export function normalizeAnnouncement(data: unknown): AnnouncementItem | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const version = (o.currentVersion && typeof o.currentVersion === 'object' ? o.currentVersion : {}) as Record<string, unknown>;
  if (!o.id || !version.version) return null;
  const typeRaw = String(o.type ?? '').toUpperCase();
  return {
    id: String(o.id),
    type: (ANNOUNCEMENT_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as AnnouncementType) : 'INFORMATION',
    displayModes: Array.isArray(o.displayModes)
      ? o.displayModes.map(normalizeMode).filter((m): m is AnnouncementMode => m !== null)
      : [],
    requireAcknowledgement: typeof o.requireAcknowledgement === 'boolean' ? o.requireAcknowledgement : false,
    publishedAt: str(o.publishedAt) ?? null,
    expiresAt: str(o.expiresAt) ?? null,
    currentVersion: {
      version: Number(version.version),
      title: str(version.title) ?? '',
      body: str(version.body) ?? '',
      deepLink: str(version.deepLink) ?? null,
      isMaterialChange: typeof version.isMaterialChange === 'boolean' ? version.isMaterialChange : undefined,
      publishedAt: str(version.publishedAt) ?? null,
    },
    userState: o.userState && typeof o.userState === 'object' ? (o.userState as AnnouncementItem['userState']) : null,
  };
}

export function normalizeAnnouncementList(data: unknown): AnnouncementItem[] {
  if (Array.isArray(data)) return data.map(normalizeAnnouncement).filter((a): a is AnnouncementItem => a !== null);
  if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).items)) {
    return ((data as Record<string, unknown>).items as unknown[]).map(normalizeAnnouncement).filter((a): a is AnnouncementItem => a !== null);
  }
  return [];
}

export async function fetchAnnouncements(limit = 20): Promise<AnnouncementItem[]> {
  try {
    const res = await apiFetch<unknown>({ path: `/api/v1/announcements?limit=${limit}` });
    return normalizeAnnouncementList(res);
  } catch {
    return [];
  }
}

export async function markAnnouncementSeen(id: string): Promise<void> {
  try {
    await apiFetch<unknown>({ path: `/api/v1/announcements/${encodeURIComponent(id)}/seen`, method: 'POST' });
  } catch {
    // Receipt tracking is best-effort
  }
}

export async function markAnnouncementRead(id: string): Promise<void> {
  try {
    await apiFetch<unknown>({ path: `/api/v1/announcements/${encodeURIComponent(id)}/read`, method: 'POST' });
  } catch {
    // Receipt tracking is best-effort
  }
}

export async function acknowledgeAnnouncement(id: string): Promise<void> {
  try {
    await apiFetch<unknown>({ path: `/api/v1/announcements/${encodeURIComponent(id)}/acknowledge`, method: 'POST' });
  } catch {
    // Receipt tracking is best-effort
  }
}

export async function dismissAnnouncement(id: string): Promise<void> {
  try {
    await apiFetch<unknown>({ path: `/api/v1/announcements/${encodeURIComponent(id)}/dismiss`, method: 'POST' });
  } catch {
    // Receipt tracking is best-effort
  }
}

const DISMISSED_KEY = 'flatfinder:dismissed-announcements';

export function readDismissedAnnouncements(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function persistDismissedAnnouncement(id: string): void {
  try {
    const next = new Set(readDismissedAnnouncements());
    next.add(id);
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
  } catch {
    // localStorage unavailable — backend receipt still persists
  }
}
