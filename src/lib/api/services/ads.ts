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
import { AdCreative, AdPlacement } from '@/types';

export interface SelectAdParams {
  placement: AdPlacement;
  collegeId?: string;
  campusId?: string;
  /** Restrict to specific priority tiers (each carousel receives one type) */
  tiers?: string[];
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
 * Records an impression once per token (deduplicated).
 * Returns true when the event was sent (or already recorded).
 */
export async function trackAdImpression(token: string): Promise<boolean> {
  if (!token) return false;
  if (!shouldRecordImpression(token)) return true;

  // Optimistically mark to avoid duplicate in-flight observers
  markImpressionRecorded(token);

  try {
    await apiFetch<unknown>({
      path: '/api/v1/ads/events/impression',
      method: 'POST',
      body: { token },
    });
    return true;
  } catch {
    // Soft-fail: keep marked to avoid retry storms; ads analytics is best-effort
    return false;
  }
}

/**
 * Records a viewable impression (50%+ of the ad visible for ~1s).
 * Soft-fails — never blocks the host page.
 */
export async function trackAdViewable(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    await apiFetch<unknown>({
      path: '/api/v1/ads/events/viewable',
      method: 'POST',
      body: { token },
    });
    return true;
  } catch {
    return false;
  }
}

// --- Bulk impression batching -------------------------------------------------
// Multiple slots/carousels on one page each become visible around the same
// moment. Instead of N sequential POSTs, tokens are queued and flushed together
// through the backend's bulk endpoint (one request, Promise.all fallback).

const BATCH_MAX_EVENTS = 50; // backend batch schema cap
/** Queue size that flushes immediately (a whole carousel page at once) */
const FLUSH_IMMEDIATE_MIN = 8;
/** Oldest queued token waits at most this long before the flush fires */
const FLUSH_MAX_WAIT_MS = 8000;
const pendingImpressionTokens = new Set<string>();
let impressionFlushTimer: ReturnType<typeof setTimeout> | null = null;
let pageHideBound = false;

function bindPageHideFlush(): void {
  if (pageHideBound || typeof window === 'undefined') return;
  pageHideBound = true;
  window.addEventListener('pagehide', () => {
    void flushAdImpressions();
  });
}

function scheduleImpressionFlush(): void {
  if (impressionFlushTimer) return;
  impressionFlushTimer = setTimeout(() => {
    impressionFlushTimer = null;
    void flushAdImpressions();
  }, FLUSH_MAX_WAIT_MS);
  bindPageHideFlush();
}

/**
 * Queues impression tokens for a batched send. Tokens are deduplicated
 * page-wide (one impression per ad per page session). The collector flushes
 * either when the queue hits a burst threshold (whole page visible at once)
 * or after a quiet window — so a carousel autoplaying slide-by-slide does NOT
 * produce one network call per slide.
 */
export function queueAdImpressions(tokens: string[]): void {
  const fresh = tokens.filter((token) => shouldRecordImpression(token));
  if (!fresh.length) return;
  for (const token of fresh) {
    pendingImpressionTokens.add(token);
    markImpressionRecorded(token);
  }
  scheduleImpressionFlush();
  if (pendingImpressionTokens.size >= FLUSH_IMMEDIATE_MIN) {
    void flushAdImpressions();
  }
}

/**
 * Forces the pending impression queue to flush now. Returns true when the bulk
 * request succeeded; falls back to per-token concurrent POSTs on failure.
 */
export async function flushAdImpressions(): Promise<boolean> {
  if (impressionFlushTimer) {
    clearTimeout(impressionFlushTimer);
    impressionFlushTimer = null;
  }
  const batch = [...pendingImpressionTokens];
  if (!batch.length) return true;
  pendingImpressionTokens.clear();

  const chunks: string[][] = [];
  for (let i = 0; i < batch.length; i += BATCH_MAX_EVENTS) {
    chunks.push(batch.slice(i, i + BATCH_MAX_EVENTS));
  }

  try {
    await Promise.all(
      chunks.map((chunk) =>
        apiFetch<unknown>({
          path: '/api/v1/ads/events/batch',
          method: 'POST',
          body: { events: chunk.map((token) => ({ type: 'impression', token })) },
        })
      )
    );
    return true;
  } catch {
    // Bulk endpoint unavailable → concurrent per-token posts (still one burst)
    await Promise.allSettled(
      batch.map((token) =>
        apiFetch<unknown>({
          path: '/api/v1/ads/events/impression',
          method: 'POST',
          body: { token },
        })
      )
    );
    return false;
  }
}

/**
 * Clears the pending queue (unit tests only).
 */
export function resetImpressionBatch(): void {
  if (impressionFlushTimer) {
    clearTimeout(impressionFlushTimer);
    impressionFlushTimer = null;
  }
  pendingImpressionTokens.clear();
}

/**
 * Records a click and returns a sanitized redirect URL when available.
 */
export async function trackAdClick(token: string): Promise<string | null> {
  if (!token) return null;

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
