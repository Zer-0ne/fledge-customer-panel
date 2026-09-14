/**
 * Ads API Service
 * Select placement creative + record impression/click events.
 * Reference: OpenAPI (`docs/openai.json`) ->
 *   POST /api/v1/ads/select
 *   POST /api/v1/ads/events/impression
 *   POST /api/v1/ads/events/click
 */

import { apiFetch } from '@/lib/api/client';
import { adContactType, sanitizeAdDestinationUrl } from '@/lib/ads/safe-redirect';
import {
  markImpressionRecorded,
  shouldRecordImpression,
} from '@/lib/ads/impression-tracker';
import { trackAdEventLocal, flushAdAnalytics } from '@/lib/ads/ad-analytics-client';
import { AdCreative, AdPlacement } from '@/types';

export interface SelectAdParams {
  placement: AdPlacement;
  collegeId?: string;
  campusId?: string;
  /** Restrict to specific priority tiers (each carousel receives one type) */
  tiers?: string[];
  /** Results page feeding this slot — page 1 is eligible for first-page add-ons */
  page?: number;
}

const VALID_PLACEMENTS: AdPlacement[] = ['home', 'search', 'listing'];

/**
 * Normalizes unknown select payloads into a typed creative, or null when empty/invalid.
 */
export function normalizeAdSelection(res: unknown): AdCreative | null {
  if (!res || typeof res !== 'object') return null;

  const root = res as Record<string, unknown>;

  // Unwrap common envelopes
  const payload =
    (root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null) ||
    root;

  const creativeRaw =
    (payload.creative && typeof payload.creative === 'object'
      ? (payload.creative as Record<string, unknown>)
      : null) ||
    (payload.ad && typeof payload.ad === 'object'
      ? (payload.ad as Record<string, unknown>)
      : null) ||
    (payload.id || payload.token || payload.selectionToken ? payload : null);

  if (!creativeRaw) return null;

  const token = String(
    creativeRaw.token ||
      creativeRaw.selectionToken ||
      payload.token ||
      payload.selectionToken ||
      ''
  );

  if (!token) return null;

  // Click/viewable use DEDICATED signed tokens — the backend rejects an
  // impression token on the click/viewable endpoints (signed type mismatch).
  const clickToken = String(
    creativeRaw.clickToken ||
      creativeRaw.click_token ||
      payload.clickToken ||
      payload.click_token ||
      ''
  );

  const viewableToken = String(
    creativeRaw.viewableToken ||
      creativeRaw.viewable_token ||
      payload.viewableToken ||
      payload.viewable_token ||
      ''
  );

  const destinationUrl =
    (typeof creativeRaw.destinationUrl === 'string' && creativeRaw.destinationUrl) ||
    (typeof creativeRaw.destination === 'string' && creativeRaw.destination) ||
    (typeof creativeRaw.clickUrl === 'string' && creativeRaw.clickUrl) ||
    (typeof payload.destinationUrl === 'string' && payload.destinationUrl) ||
    (typeof payload.destination === 'string' && payload.destination) ||
    null;

  const imageUrl =
    (typeof creativeRaw.imageUrl === 'string' && creativeRaw.imageUrl) ||
    (typeof creativeRaw.image === 'string' && creativeRaw.image) ||
    (typeof creativeRaw.mediaUrl === 'string' && creativeRaw.mediaUrl) ||
    (typeof creativeRaw.thumbnailUrl === 'string' && creativeRaw.thumbnailUrl) ||
    null;

  return {
    id: String(creativeRaw.id || creativeRaw.creativeId || token),
    title: String(creativeRaw.title || creativeRaw.headline || creativeRaw.name || 'Sponsored'),
    description:
      typeof creativeRaw.description === 'string'
        ? creativeRaw.description
        : typeof creativeRaw.body === 'string'
          ? creativeRaw.body
          : typeof creativeRaw.subtitle === 'string'
            ? creativeRaw.subtitle
            : undefined,
    imageUrl,
    destinationUrl,
    /** Contact action derived from the destination (wa.me → WHATSAPP, tel: → PHONE). */
    contactType: adContactType(destinationUrl),
    sponsorName:
      typeof creativeRaw.sponsorName === 'string'
        ? creativeRaw.sponsorName
        : typeof creativeRaw.advertiserName === 'string'
          ? creativeRaw.advertiserName
          : typeof creativeRaw.brand === 'string'
            ? creativeRaw.brand
            : null,
    priorityTier:
      typeof creativeRaw.priorityTier === 'string'
        ? creativeRaw.priorityTier
        : typeof creativeRaw.tier === 'string'
          ? creativeRaw.tier
          : null,
    // Add-on delivery: the backend flags the top slot and the paid partner badge.
    pinned: creativeRaw.pinned === true || payload.pinned === true,
    advertiserBadge: creativeRaw.advertiserBadge === 'PREMIUM' || payload.advertiserBadge === 'PREMIUM' ? 'PREMIUM' : null,
    featureChips: Array.isArray(creativeRaw.featureChips)
      ? creativeRaw.featureChips.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).slice(0, 6)
      : [],
    token,
    selectionToken: token,
    clickToken: clickToken || undefined,
    viewableToken: viewableToken || undefined,
  };
}

/**
 * Extracts redirect URL from click event response.
 */
export function normalizeClickRedirect(res: unknown): string | null {
  if (!res) return null;

  if (typeof res === 'string') {
    return sanitizeAdDestinationUrl(res);
  }

  if (typeof res !== 'object') return null;

  const root = res as Record<string, unknown>;
  const payload =
    (root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null) ||
    root;

  const candidates = [
    payload.redirectUrl,
    payload.url,
    payload.destinationUrl,
    payload.destination,
    payload.targetUrl,
    payload.href,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const safe = sanitizeAdDestinationUrl(candidate);
      if (safe) return safe;
    }
  }

  return null;
}

/**
 * Fetches a relevant ad for the given placement.
 * Failure isolation: returns null on any error / empty fill (never throws to callers).
 */
export async function selectAd(params: SelectAdParams): Promise<AdCreative | null> {
  if (!VALID_PLACEMENTS.includes(params.placement)) {
    return null;
  }

  try {
    const body: Record<string, string> = {
      placement: params.placement,
    };
    if (params.collegeId) body.collegeId = params.collegeId;
    if (params.campusId) body.campusId = params.campusId;

    const res = await apiFetch<unknown>({
      path: '/api/v1/ads/select',
      method: 'POST',
      body,
    });

    return normalizeAdSelection(res);
  } catch {
    // Ads must never break host pages
    return null;
  }
}

/**
 * Fetches up to `count` distinct ads for a placement (carousel support).
 * Backend returns `{ items: [...] }` when more than one ad is selected.
 * Failure isolation: returns [] on any error / empty fill.
 *
 * Requests are cached per (placement, targeting, tiers, count) for a short TTL
 * and shared between concurrent callers — the home page mounts one SponsoredAd
 * per tier and dev StrictMode remounts effects, so without this the same slot
 * fires 2x (or more) identical POSTs. Ads stay fresh enough for display use.
 */
const selectRequestCache = new Map<string, Promise<AdCreative[]>>();
const SELECT_CACHE_TTL_MS = 30_000;

export function selectAds(params: SelectAdParams & { count?: number }): Promise<AdCreative[]> {
  if (!VALID_PLACEMENTS.includes(params.placement)) {
    return Promise.resolve([]);
  }

  const key = JSON.stringify([
    params.placement,
    params.collegeId ?? null,
    params.campusId ?? null,
    params.tiers ?? null,
    params.count ?? null,
    params.page ?? null,
  ]);

  const cached = selectRequestCache.get(key);
  if (cached) return cached;

  const request = doSelectAds(params);
  selectRequestCache.set(key, request);
  request
    .finally(() => {
      setTimeout(() => {
        if (selectRequestCache.get(key) === request) selectRequestCache.delete(key);
      }, SELECT_CACHE_TTL_MS);
    })
    .catch(() => {});
  return request;
}

/**
 * Clears the select request cache (unit tests only).
 */
export function resetSelectCache(): void {
  selectRequestCache.clear();
}

async function doSelectAds(params: SelectAdParams & { count?: number }): Promise<AdCreative[]> {
  try {
    const body: Record<string, string | number | string[]> = {
      placement: params.placement,
    };
    if (params.collegeId) body.collegeId = params.collegeId;
    if (params.campusId) body.campusId = params.campusId;
    if (params.tiers && params.tiers.length > 0) body.tiers = params.tiers;
    if (params.count) body.count = params.count;
    if (params.page) body.page = params.page;

    const res = await apiFetch<unknown>({
      path: '/api/v1/ads/select',
      method: 'POST',
      body,
    });

    if (Array.isArray(res)) return res.map(normalizeAdSelection).filter((a): a is AdCreative => a !== null);
    if (res && typeof res === 'object' && Array.isArray((res as Record<string, unknown>).items)) {
      return ((res as Record<string, unknown>).items as unknown[]).map(normalizeAdSelection).filter((a): a is AdCreative => a !== null);
    }
    const single = normalizeAdSelection(res);
    return single ? [single] : [];
  } catch {
    return [];
  }
}

/**
 * Records an impression once per token (deduplicated) — local-first, 1h bulk flush.
 * Returns true when queued locally (or already recorded). Network is deferred.
 */
export async function trackAdImpression(token: string): Promise<boolean> {
  if (!token) return false;
  if (!shouldRecordImpression(token)) return true;
  markImpressionRecorded(token);
  try {
    await trackAdEventLocal(token, 'impression');
  } catch {}
  return true;
}

/**
 * Records a viewable impression (50%+ of the ad visible for ~1s) — local-first.
 * Soft-fails — never blocks the host page. Flushed hourly via bulk endpoint.
 */
export async function trackAdViewable(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await trackAdEventLocal(token, 'viewable');
  } catch {}
  return true;
}

// --- Bulk impression batching (now durable IndexedDB, 1h bulk) -----------------
// Legacy in-memory 8s batch replaced by AdAnalyticsQueue (IndexedDB flat_ads).
// This section now delegates to the durable queue so a reload / offline session
// does not lose impressions and the flush aligns with the 1-2h product analytics
// bulk window (plus hidden/online/pagehide opportunistic flush).

/**
 * Queues impression tokens for a batched send via durable IndexedDB.
 * Tokens are deduplicated page-wide (one impression per ad per page session).
 */
export function queueAdImpressions(tokens: string[]): void {
  const fresh = tokens.filter((token) => shouldRecordImpression(token));
  if (!fresh.length) return;
  for (const token of fresh) {
    markImpressionRecorded(token);
    void trackAdEventLocal(token, 'impression');
  }
}

/**
 * Forces the durable ad queue to flush now (bulk 50 per request, shed-aware).
 */
export async function flushAdImpressions(): Promise<boolean> {
  try {
    await flushAdAnalytics();
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears the pending queue (unit tests only) — no-op now that queue is durable.
 * Test should clear IndexedDB via AdAnalyticsQueue directly if needed.
 */
export function resetImpressionBatch(): void {
  // Intentionally no in-memory set to clear; durable queue persists.
}

/**
 * Records a click and returns a sanitized redirect URL when available.
 * Click queues locally for bulk resilience but also posts immediately for redirect.
 */
export async function trackAdClick(token: string): Promise<string | null> {
  if (!token) return null;
  // Queue for bulk durability (covers offline / shed cases)
  try {
    await trackAdEventLocal(token, 'click');
  } catch {}
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/ads/events/click',
      method: 'POST',
      body: { token },
    });
    return normalizeClickRedirect(res);
  } catch {
    return null;
  }
}
