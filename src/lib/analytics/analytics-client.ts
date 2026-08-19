/**
 * Web analytics client — offline-first with IndexedDB queue + batch upload.
 * Non-blocking: all operations are fire-and-forget.
 * Phase 4: Added acquisition tracking, Web Vitals, error capture, 30min session timeout.
 */

import { env } from '@/lib/env';
import { isKnownEvent, FORBIDDEN_PROPERTIES, type EventSpec, getEventSpec } from './analytics-event-registry';
import { AnalyticsQueue, type QueuedEvent } from './analytics-queue';
import {
  getAnonymousId,
  getSessionId,
  startSession,
  resumeSession,
  pauseSession,
  endSession,
  setUserId,
  clearUserId,
} from './analytics-session-tracker';
import { autoCaptureAcquisition, getAcquisitionData } from './analytics-acquisition';
import { initializeWebVitals } from './analytics-web-vitals';
import { initializeErrorCapture } from './analytics-error-capture';

const MAX_BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 60_000;
/** Minimum pause after a backend 5xx (load-shedding etc.) — the backend's
 * Retry-After is ~1s, but a shed window outlives it, so re-hammering every
 * interval would just pile more rejected requests onto a struggling backend.
 * The cooldown doubles on each consecutive shed (60s → 2m → 4m → …) and
 * resets on the first successful flush. */
const SHED_COOLDOWN_MS = 60_000;
const MAX_SHED_COOLDOWN_MS = 10 * 60_000;
const APP_VERSION = '1.0.0';

let queue: AnalyticsQueue | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;
// Event sending is disabled by default for now — the backend load shedder was
// blocking the batch flush (503). No events are queued or sent. Re-enable via
// setAnalyticsEnabled(true) once the backend side is sorted.
let enabled = false;
let previousScreen: string | null = null;
/** While the backend sheds (503/502/504), flushes are paused until this time. */
let nextFlushAllowedAt = 0;
/** Current shed backoff (doubles on each consecutive shed, resets on success). */
let shedCooldownMs = SHED_COOLDOWN_MS;
/** One-shot retry scheduled for the moment the shed cooldown expires. */
let shedFlushTimer: ReturnType<typeof setTimeout> | null = null;
/** Serializes flushes — visibilitychange/hidden, online, interval, init and
 * dispose all call flush(); without this lock overlapping flushes re-send the
 * same events and the backend answers every eventId as a duplicate. */
let flushing = false;

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function sanitizeProperties(props: Record<string, unknown>, spec: EventSpec): Record<string, unknown> {
  const allowed = new Set([...spec.requiredProperties, ...spec.optionalProperties]);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_PROPERTIES.has(key) || key.startsWith('gps')) continue;
    if (!allowed.has(key)) continue;
    if (typeof value === 'string' && value.length > 1024) {
      sanitized[key] = value.slice(0, 1024);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (!FORBIDDEN_PROPERTIES.has(k) && typeof v === 'string' && v.length <= 1024) {
          obj[k] = v;
        } else if (typeof v === 'number' || typeof v === 'boolean') {
          obj[k] = v;
        }
      }
      sanitized[key] = obj;
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/** Build context with acquisition data + screen info. */
function buildContext(screenName?: string): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};
  const acq = getAcquisitionData();
  if (acq) {
    if (acq.utmSource) ctx.acquisitionSource = acq.utmSource;
    if (acq.utmCampaign) ctx.utmCampaign = acq.utmCampaign;
  }
  if (screenName) ctx.screenName = screenName;
  if (previousScreen) ctx.previousScreen = previousScreen;
  return ctx;
}

/** Initialize the analytics client. Call once on app load. */
export async function initializeAnalytics(): Promise<void> {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  queue = new AnalyticsQueue();
  await queue.initialize();

  // Auto-capture acquisition from URL params.
  autoCaptureAcquisition();

  // Listen for visibility changes (pause/resume + flush on hidden).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const pausedMs = pauseSession();
      if (pausedMs !== null) {
        track('session_paused', { activeDurationMs: pausedMs });
      }
      unawaited(flush());
    } else if (document.visibilityState === 'visible') {
      const result = resumeSession();
      if (result) {
        if (result.sessionRecreated) {
          track('session_started', { platform: 'next_web', appVersion: APP_VERSION });
        }
        track('session_resumed', { inactiveDurationMs: result.inactiveDurationMs });
      }
    }
  });

  // Listen for online.
  window.addEventListener('online', () => {
    unawaited(flush());
  });

  // Periodic flush.
  flushTimer = setInterval(() => {
    unawaited(flush());
  }, FLUSH_INTERVAL_MS);

  // Start session.
  getAnonymousId();
  startSession();

  const acq = getAcquisitionData();
  track('session_started', {
    platform: 'next_web',
    appVersion: APP_VERSION,
    ...(acq?.utmSource ? { source: acq.utmSource } : {}),
  });

  // Initialize Web Vitals and error capture.
  initializeWebVitals();
  initializeErrorCapture();

  // Flush pending from previous sessions.
  unawaited(flush());
}

function unawaited(p: Promise<unknown>): void {
  p.catch(() => {});
}

/** Track an analytics event. Non-blocking, fire-and-forget. */
export function track(
  eventName: string,
  properties: Record<string, unknown> = {},
  context: Record<string, unknown> = {},
): void {
  if (!enabled || !queue) return;
  if (!isKnownEvent(eventName)) return;

  const spec = getEventSpec(eventName);
  if (!spec || spec.backendAuthoritative) return;

  const sanitizedProps = sanitizeProperties(properties, spec);
  const mergedContext = { ...buildContext(properties['screenName'] as string | undefined), ...context };

  const event: QueuedEvent = {
    id: generateId(),
    eventId: generateId(),
    eventName,
    eventVersion: spec.version,
    sessionId: getSessionId(),
    anonymousId: getAnonymousId(),
    occurredAt: new Date().toISOString(),
    properties: sanitizedProps,
    context: mergedContext,
    priority: 'normal',
    status: 'pending',
    attemptCount: 0,
    nextRetryAt: null,
    platform: 'next_web',
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
  };

  queue.insert(event).then(async (inserted) => {
    if (inserted) {
      const len = await queue!.length();
      if (len >= MAX_BATCH_SIZE) unawaited(flush());
    }
  }).catch(() => {});
}

/** Track a page view. */
export function trackPageView(screenName: string): void {
  track('screen_viewed', { screenName });
  previousScreen = screenName;
}

/** Track a performance metric. */
export function trackPerformance(name: string, value: number): void {
  track('app_start_performance', {
    durationMs: value,
    startType: name,
  }, {});
}

/** Identify the current user (call after login). */
export function identify(userId: string): void {
  setUserId(userId);
}

/** Reset identity (call on logout). */
export function resetIdentity(): void {
  clearUserId();
}

/** Flush pending events to the backend. Serialized — concurrent callers wait
 * for the in-flight flush instead of re-sending the same batch. */
export async function flush(): Promise<void> {
  if (!enabled || !queue || flushing) return;
  if (Date.now() < nextFlushAllowedAt) return;
  flushing = true;
  try {
    const pending = await queue.pending();
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
      const batch = pending.slice(i, i + MAX_BATCH_SIZE);
      await sendBatch(batch);
    }
  } catch {
  } finally {
    flushing = false;
  }
}

async function sendBatch(batch: QueuedEvent[]): Promise<void> {
  if (!queue) return;

  // Drop eventIds the backend already acknowledged — they must never be
  // re-posted (covers retry-after-timeout and cross-session duplicates).
  const acknowledged = await Promise.all(batch.map((e) => queue!.isAcknowledged(e.eventId)));
  const fresh = batch.filter((_, i) => !acknowledged[i]);
  const staleIds = batch.filter((_, i) => acknowledged[i]).map((e) => e.id);
  if (staleIds.length > 0) await queue.removeByIds(staleIds);
  if (fresh.length === 0) return;

  const freshIds = fresh.map((e) => e.id);
  await queue.markInflight(freshIds);

  try {
    const baseUrl = env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy';
    const response = await fetch(`${baseUrl}/api/v1/analytics/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: generateId(),
        platform: 'next_web',
        appVersion: APP_VERSION,
        events: fresh.map((e) => ({
          eventId: e.eventId,
          eventName: e.eventName,
          eventVersion: e.eventVersion,
          occurredAt: e.occurredAt,
          anonymousId: e.anonymousId,
          sessionId: e.sessionId,
          platform: e.platform,
          appVersion: e.appVersion,
          properties: e.properties,
          context: e.context,
        })),
      }),
    });

    if (response.ok) {
      // Shed window is over — reset the backoff so a later 503 starts fresh.
      shedCooldownMs = SHED_COOLDOWN_MS;
      const body = await response.json() as {
        accepted?: string[];
        duplicates?: string[];
        rejected?: Array<{ eventId: string; reason: string }>;
      };
      const accepted = body.accepted ?? [];
      const duplicates = body.duplicates ?? [];
      const removedIds = fresh
        .filter((e) => accepted.includes(e.eventId) || duplicates.includes(e.eventId))
        .map((e) => e.id);
      await queue.removeByIds(removedIds);
      // Acknowledge BOTH accepted and duplicates — duplicates are events the
      // backend already recorded, so they must not be sent a third time.
      await queue.acknowledge([...accepted, ...duplicates]);
      const rejected = (body.rejected ?? []).map((r) => r.eventId);
      if (rejected.length > 0) {
        const all = await queue.pending();
        const toFail = all.filter((e) => rejected.includes(e.eventId)).map((e) => e.id);
        await queue.markFailed(toFail);
      }
    } else if (response.status === 503 || response.status === 502 || response.status === 504) {
      // Backend is shedding / temporarily unavailable — back off exponentially
      // instead of re-hammering every interval, and keep the events pending so
      // they are retried as-is when the shed clears (a shed is not a failure).
      const retryAfterSec = Number(response.headers.get('retry-after'));
      const retryAfterMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : 0;
      nextFlushAllowedAt = Date.now() + Math.max(retryAfterMs, shedCooldownMs);
      shedCooldownMs = Math.min(shedCooldownMs * 2, MAX_SHED_COOLDOWN_MS);
      scheduleCooldownFlush();
      await queue.requeue(freshIds);
    } else {
      await queue.markFailed(freshIds);
    }
  } catch {
    await queue.markFailed(freshIds);
  }
}

/** After a shed, retry once as soon as the cooldown expires instead of waiting
 * for the next interval tick (which could add up to a full interval later).
 * A single timer is kept — a new shed while one is pending just extends the
 * cooldown, and the pending timer fires (no-op) at the old deadline. */
function scheduleCooldownFlush(): void {
  if (shedFlushTimer) return;
  const wait = Math.max(0, nextFlushAllowedAt - Date.now());
  shedFlushTimer = setTimeout(() => {
    shedFlushTimer = null;
    unawaited(flush());
  }, wait);
}

/** Cleanup old events from the queue. */
export async function cleanup(): Promise<void> {
  await queue?.cleanup();
}

/** Set enabled/disabled. */
export function setAnalyticsEnabled(value: boolean): void {
  enabled = value;
}

/** Dispose resources (call on page unload). */
export function disposeAnalytics(): void {
  if (flushTimer) clearInterval(flushTimer);
  if (shedFlushTimer) {
    clearTimeout(shedFlushTimer);
    shedFlushTimer = null;
  }
  const ended = endSession();
  if (ended?.isValid) {
    track('session_ended', {
      totalDurationMs: ended.totalDurationMs,
      activeDurationMs: ended.activeDurationMs,
    });
  }
  unawaited(flush());
}
