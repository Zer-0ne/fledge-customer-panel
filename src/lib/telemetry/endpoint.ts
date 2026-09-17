/**
 * Telemetry endpoint resolution + auth-failure policy.
 *
 * Telemetry posts (analytics / ads events) are fire-and-forget and run OUTSIDE
 * the normal API client. They must therefore honour the same auth shape as the
 * app: session tokens live in HttpOnly cookies, so a same-origin BFF proxy
 * (`/api/proxy`) is the ONLY place those cookies are reliably attached.
 *
 * Production incident (2026-09-17): with an absolute API base configured, a
 * logged-in browser POSTed `/batch` straight to `api.*` where the HttpOnly
 * cookie was not accepted, got 401 on every attempt, and the flush loop kept
 * retrying forever — the UI looked "stuck loading". Rules encoded here:
 *
 * 1. Prefer the configured base; on a 401/403 fall back to the same-origin
 *    proxy for every later attempt (self-healing, no reload needed).
 * 2. A 401/403 is never retried hot: it earns a long cooldown, and three
 *    consecutive auth failures suspend the flusher until the next page load —
 *    a broken session must not become an infinite request loop.
 */
import { env } from '@/lib/env';

/** Long cooldown for auth failures (session missing/expired). */
export const AUTH_FAILURE_COOLDOWN_MS = 5 * 60_000;
/** Consecutive auth failures after which the flusher goes dormant. */
export const AUTH_FAILURE_STRIKE_LIMIT = 3;

let preferProxy = false;

/** Base URL for telemetry posts (never has a trailing slash). */
export function telemetryBase(): string {
  const direct = env.NEXT_PUBLIC_API_BASE_URL;
  const base = preferProxy || !direct ? '/api/proxy' : direct;
  return base.replace(/\/+$/, '');
}

/** True once a 401/403 forced telemetry onto the same-origin proxy. */
export function telemetryUsesProxy(): boolean {
  return preferProxy;
}

/** True when telemetry has never left the same-origin proxy. */
export function telemetryOnSameOriginProxy(): boolean {
  const direct = env.NEXT_PUBLIC_API_BASE_URL;
  return preferProxy || !direct || !/^https?:\/\//i.test(direct);
}

/**
 * Records a non-OK telemetry response. Returns true when the caller should
 * retry ONCE right away (base just switched to the proxy), false when the
 * failure was terminal for this attempt.
 */
export function noteTelemetryFailure(status: number): boolean {
  if (status !== 401 && status !== 403) return false;
  if (!preferProxy) {
    preferProxy = true;
    return true; // retry once against the same-origin proxy
  }
  return false;
}
