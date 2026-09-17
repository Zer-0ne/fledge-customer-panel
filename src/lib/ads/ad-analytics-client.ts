/**
 * Ad analytics client — local-first bulk sync (1h, shed-aware).
 * Mirrors customer-panel analytics-client pattern for ad tokens.
 */
import { AdAnalyticsQueue, type QueuedAdEvent } from './ad-analytics-queue';
import {
  AUTH_FAILURE_COOLDOWN_MS,
  AUTH_FAILURE_STRIKE_LIMIT,
  TELEMETRY_MIN_FLUSH_GAP_MS,
  noteTelemetryFailure,
  telemetryBase,
} from '@/lib/telemetry/endpoint';

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
/** Consecutive 401/403 flushes — past the limit the flusher goes dormant for
 * this page load instead of hammering a session that cannot succeed. */
let authFailureStrikes = 0;
let suspended = false;
/** Burst guard: the last flush attempt time (see TELEMETRY_MIN_FLUSH_GAP_MS). */
let lastFlushAttemptAt = 0;
/** Most chunks drained by one flush — a big backlog drains slowly, never as a burst. */
const MAX_CHUNKS_PER_FLUSH = 2;

function genId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getApiBase(): string {
  return telemetryBase();
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
  if (!queue || flushing || suspended) return;
  if (Date.now() < nextFlushAllowedAt) return;
  // Burst guard: visibilitychange + online + interval + threshold can fire back
  // to back; never open a second flush inside the minimum gap.
  if (Date.now() - lastFlushAttemptAt < TELEMETRY_MIN_FLUSH_GAP_MS) return;
  lastFlushAttemptAt = Date.now();
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
    const drainLimit = MAX_BATCH * MAX_CHUNKS_PER_FLUSH;
    for (let i = 0; i < filtered.length && i < drainLimit; i += MAX_BATCH) {
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
    const post = (base: string) => fetch(`${base}/api/v1/ads/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: tokens }),
      keepalive: true,
      credentials: 'include',
    });

    let res = await post(getApiBase());
    if ((res.status === 401 || res.status === 403) && noteTelemetryFailure(res.status)) {
      // Configured base rejected the HttpOnly session cookie — retry once
      // against the same-origin proxy, which always carries it.
      res = await post(getApiBase());
    }
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
      // Success resets shed backoff + auth strikes
      authFailureStrikes = 0;
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
    // 401/403 — session missing or expired: requeue with a long cooldown, and
    // after the strike limit stop retrying for this page load entirely. This is
    // the fix for the infinite /batch 401 loop that made the UI look stuck.
    if (res.status === 401 || res.status === 403) {
      authFailureStrikes += 1;
      if (authFailureStrikes >= AUTH_FAILURE_STRIKE_LIMIT) suspended = true;
      await queue.requeue(ids);
      nextFlushAllowedAt = Date.now() + AUTH_FAILURE_COOLDOWN_MS;
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
