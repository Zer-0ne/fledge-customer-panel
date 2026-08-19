/**
 * Trust Score API Service
 * `GET /api/v1/trust/me` + `GET /api/v1/trust/me/badges` — the user's trust
 * score and earned badges (computed server-side from verification state).
 * Reference: backend trust module (computeTrustScore breakdown, cap 100).
 */

import { apiFetch } from '@/lib/api/client';
import { TrustBadgesResponse, TrustScore } from '@/types';

function unwrap<T>(res: unknown): T {
  if (typeof res === 'object' && res !== null && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/**
 * Maps a raw trust score payload into a TrustScore.
 */
export function mapRawToTrustScore(item: unknown): TrustScore {
  const raw = (item || {}) as Record<string, unknown>;
  const breakdownRaw = (raw.breakdown ?? {}) as Record<string, unknown>;

  const num = (v: unknown): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

  return {
    userId: String(raw.userId || raw.id || ''),
    score: num(raw.score),
    breakdown: {
      base: num(breakdownRaw.base),
      phoneVerified: num(breakdownRaw.phoneVerified),
      emailVerified: num(breakdownRaw.emailVerified),
      profileComplete: num(breakdownRaw.profileComplete),
      tenantVerified: num(breakdownRaw.tenantVerified),
      studentVerified: num(breakdownRaw.studentVerified),
      accountAge: num(breakdownRaw.accountAge),
    },
    recomputedAt: String(raw.recomputedAt || raw.updatedAt || new Date().toISOString()),
  };
}

/**
 * Fetches the current user's trust score (`GET /trust/me`).
 */
export async function fetchTrustScore(): Promise<TrustScore> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/trust/me',
    method: 'GET',
  });
  return mapRawToTrustScore(unwrap(res));
}

/**
 * Fetches the current user's trust badges (`GET /trust/me/badges`).
 */
export async function fetchTrustBadges(): Promise<TrustBadgesResponse> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/trust/me/badges',
    method: 'GET',
  });

  const raw = unwrap<Record<string, unknown>>(res);

  return {
    userId: String(raw.userId || raw.id || ''),
    score: typeof raw.score === 'number' ? raw.score : 0,
    badges: Array.isArray(raw.badges) ? (raw.badges as unknown[]).map(String) : [],
    recomputedAt: String(raw.recomputedAt || raw.updatedAt || new Date().toISOString()),
  };
}
