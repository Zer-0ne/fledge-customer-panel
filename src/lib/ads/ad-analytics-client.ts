/**
 * Ad analytics client — local-first bulk sync (1h, shed-aware).
 * Mirrors customer-panel analytics-client pattern for ad tokens.
 */
import { AdAnalyticsQueue, type QueuedAdEvent } from './ad-analytics-queue';
import { env } from '@/lib/env';

const MAX_BATCH = 50;
const FLUSH_INTERVAL_MS = 60 * 60 * 1000; // 1h — hourly bulk (60-120m range, keep 1h for now)
const SHED_COOLDOWN_MS = 60_000;
const MAX_SHED_COOLDOWN_MS = 10 * 60_000;

let queue: AdAnalyticsQueue | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;
let nextFlushAllowedAt = 0;
let shedCooldownMs = SHED_COOLDOWN_MS;
let shedFlushTimer: ReturnType<typeof setTimeout> | null = null;

function genId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getApiBase(): string {
  try {
    const base = env.NEXT_PUBLIC_API_BASE_URL;
    if (base) return base.replace(/\/$/, '');
  } catch {}
  return '/api/proxy';
}

async function getAuthHeader(): Promise<Record<string, string>> {
  // Ads events use cookie auth via BFF proxy (same as analytics-client).
  // No bearer header needed — credentials: 'include' carries httpOnly cookies.
  return {};
}

export async function initializeAdAnalytics(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (queue) return;
  queue = new AdAnalyticsQueue();
  await queue.initialize();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushAdAnalytics();
  });
  window.addEventListener('pagehide', () => {
    void flushAdAnalytics();
  });
  window.addEventListener('online', () => {
    void flushAdAnalytics();
  });
  flushTimer = setInterval(() => {
    void flushAdAnalytics();
  }, FLUSH_INTERVAL_MS);
  // Drain previous session
  void flushAdAnalytics();
}

export async function trackAdEventLocal(token: string, type: 'impression' | 'click' | 'viewable'): Promise<void> {
  if (!token || !queue) return;
  if (await queue.isAcknowledged(token)) return;
  const ev: QueuedAdEvent = {
    id: genId(),
    token,
    type,
    occurredAt: new Date().toISOString(),
    status: 'pending',
    attemptCount: 0,
    nextRetryAt: null,
    createdAt: new Date().toISOString(),
  };
  await queue.insert(ev);
  const len = await queue.length();
  if (len >= MAX_BATCH) void flushAdAnalytics();
}

export async function flushAdAnalytics(): Promise<void> {
  if (!queue || flushing) return;
  if (Date.now() < nextFlushAllowedAt) return;
  flushing = true;
  try {
    const pending = await queue.pending();
    if (!pending.length) return;
    // Filter already-acked tokens (dedupe across reloads)
    const filtered: QueuedAdEvent[] = [];
    for (const ev of pending) {
      if (!(await queue!.isAcknowledged(ev.token))) filtered.push(ev);
      else await queue!.removeByIds([ev.id]);
    }
    if (!filtered.length) return;
    for (let i = 0; i < filtered.length; i += MAX_BATCH) {
      await sendChunk(filtered.slice(i, i + MAX_BATCH));
      if (Date.now() < nextFlushAllowedAt) break;
    }
  } finally {
    flushing = false;
  }
}

async function sendChunk(batch: QueuedAdEvent[]): Promise<void> {
  if (!queue || !batch.length) return;
  const ids = batch.map((e) => e.id);
  const tokens = batch.map((e) => ({ type: e.type, token: e.token }));
  await queue.markInflight(ids);
  try {
    const base = getApiBase().replace(/\/$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(await getAuthHeader()),
    };
    const res = await fetch(`${base}/api/v1/ads/events/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: tokens }),
      keepalive: true,
      credentials: 'include',
    });
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        accepted?: number;
        rejected?: Array<{ token: string; reason: string }>;
        acceptedTokens?: string[];
        duplicateTokens?: string[];
      };
      const acceptedTokens: string[] = body.acceptedTokens ?? [];
      // Fallback: if acceptedTokens not present, assume all non-rejected are accepted
      let successIds: string[] = [];
      if (acceptedTokens.length) {
        const set = new Set(acceptedTokens);
        successIds = batch.filter((e) => set.has(e.token)).map((e) => e.id);
        // Also treat duplicates as success for ack
        if (body.duplicateTokens?.length) {
          const dup = new Set(body.duplicateTokens);
          const dupIds = batch.filter((e) => dup.has(e.token)).map((e) => e.id);
          successIds = [...new Set([...successIds, ...dupIds])];
        }
      } else {
        const rejectedTokens = new Set((body.rejected ?? []).map((r) => r.token));
        successIds = batch.filter((e) => !rejectedTokens.has(e.token)).map((e) => e.id);
      }
      const successTokens = batch.filter((e) => successIds.includes(e.id)).map((e) => e.token);
      if (successIds.length) {
        await queue.removeByIds(successIds);
        await queue.acknowledge(successTokens);
      }
      const rejected = (body.rejected ?? []) as Array<{ token: string; reason: string }>;
      if (rejected.length) {
        const rejectedIds = batch.filter((e) => rejected.some((r) => r.token === e.token)).map((e) => e.id);
        const retryable: string[] = [];
        const permanent: string[] = [];
        for (const r of rejected) {
          const id = batch.find((e) => e.token === r.token)?.id;
          if (!id) continue;
          const reason = (r.reason || '').toLowerCase();
          if (reason.includes('expired') || reason.includes('invalid') || reason.includes('forbidden') || reason.includes('not found')) {
            permanent.push(id);
          } else {
            retryable.push(id);
          }
        }
        // Also cover rejectedIds not in detailed list
        if (retryable.length) await queue.markFailed(retryable);
        if (permanent.length) {
          await queue.removeByIds(permanent);
          // Ack permanent failures to avoid retry loops (invalid token will never succeed)
          const permTokens = batch.filter((e) => permanent.includes(e.id)).map((e) => e.token);
          await queue.acknowledge(permTokens);
        }
        // If some rejectedIds not categorized, markFailed
        const accounted = new Set([...retryable, ...permanent, ...successIds]);
        const leftover = rejectedIds.filter((id) => !accounted.has(id));
        if (leftover.length) await queue.markFailed(leftover);
      }
      // Success resets shed backoff
      shedCooldownMs = SHED_COOLDOWN_MS;
      nextFlushAllowedAt = 0;
      if (shedFlushTimer) {
        clearTimeout(shedFlushTimer);
        shedFlushTimer = null;
      }
      return;
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      await queue.requeue(ids);
      nextFlushAllowedAt = Date.now() + shedCooldownMs;
      shedCooldownMs = Math.min(shedCooldownMs * 2, MAX_SHED_COOLDOWN_MS);
      if (shedFlushTimer) clearTimeout(shedFlushTimer);
      shedFlushTimer = setTimeout(() => {
        shedFlushTimer = null;
        void flushAdAnalytics();
      }, shedCooldownMs);
      return;
    }
    // Other 4xx — treat as permanent for now but keep retry for 429
    if (res.status === 429) {
      await queue.requeue(ids);
      nextFlushAllowedAt = Date.now() + shedCooldownMs;
      return;
    }
    // 400/401/403 — per-token permanent; remove and ack to avoid loop
    // For 401, auth may be missing — requeue to retry after refresh
    if (res.status === 401) {
      await queue.requeue(ids);
      nextFlushAllowedAt = Date.now() + 30_000;
      return;
    }
    await queue.markFailed(ids);
  } catch {
    await queue.requeue(ids);
    nextFlushAllowedAt = Date.now() + shedCooldownMs;
  }
}

export function disposeAdAnalytics(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (shedFlushTimer) {
    clearTimeout(shedFlushTimer);
    shedFlushTimer = null;
  }
  queue = null;
  flushing = false;
}

// For tests / manual inspection
export function __getQueue(): AdAnalyticsQueue | null {
  return queue;
}
export function __resetForTests(): void {
  disposeAdAnalytics();
}
