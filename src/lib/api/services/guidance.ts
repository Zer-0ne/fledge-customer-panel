/**
 * Guidance Tips API Service
 * `GET /api/v1/guidance/tips?route=&audience=&locale=` — contextual, localized
 * tips. Locale is required; backend serves `en` + `hi` only.
 * Reference: backend guidance module (active tips, ordered by sortOrder, key).
 */

import { apiFetch } from '@/lib/api/client';
import { GuidanceTip } from '@/types';

export type GuidanceAudience = 'all' | 'customer' | 'partner';

export interface FetchGuidanceTipsParams {
  route?: string;
  audience?: GuidanceAudience;
  locale: string;
}

/**
 * Maps a raw guidance tip into a GuidanceTip.
 */
export function mapRawToGuidanceTip(item: unknown): GuidanceTip {
  const raw = (item || {}) as Record<string, unknown>;

  return {
    id: String(raw.id || ''),
    key: String(raw.key || ''),
    route: typeof raw.route === 'string' ? raw.route : null,
    audience:
      raw.audience === 'customer' || raw.audience === 'partner'
        ? raw.audience
        : raw.audience === 'all' || !raw.audience
          ? 'all'
          : 'all',
    title: String(raw.title || ''),
    body: String(raw.body || ''),
    locale: String(raw.locale || 'en'),
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
    isActive: raw.isActive === undefined ? true : Boolean(raw.isActive),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.createdAt || new Date().toISOString()),
  };
}

/**
 * Normalizes guidance tips responses (array or envelope).
 */
export function normalizeGuidanceTipsResponse(res: unknown): GuidanceTip[] {
  if (!res) return [];

  let items: unknown[] = [];
  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) items = obj.data;
    else if (Array.isArray(obj.items)) items = obj.items;
    else if (Array.isArray(obj.tips)) items = obj.tips;
  }

  return items.map(mapRawToGuidanceTip);
}

/**
 * Fetches guidance tips for a route/audience in the given locale.
 */
export async function fetchGuidanceTips(params: FetchGuidanceTipsParams): Promise<GuidanceTip[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/guidance/tips',
    method: 'GET',
    params: {
      route: params.route,
      audience: params.audience,
      locale: params.locale,
    },
  });

  return normalizeGuidanceTipsResponse(res);
}
