/**
 * Telemetry endpoint resolution + auth-failure policy.
 *
 * Telemetry posts (analytics / ads events) are fire-and-forget and run OUTSIDE
 * the normal API client. They must therefore honour the same auth shape as the
 * app: session tokens live in HttpOnly cookies, so a same-origin BFF proxy
 * (`/api/proxy`) is the ONLY place those cookies are reliably attached and the
 * ONLY path with no CORS preflight.
 *
 * Production incidents (2026-09-17):
 * 1. With an absolute API base configured, a logged-in browser POSTed `/batch`
 *    straight at `api.*` where the cookie was not accepted → 401 on every
 *    attempt, retried forever, UI looked "stuck loading".
 * 2. Even after auth worked, every cross-origin POST cost an extra OPTIONS
 *    preflight and a backlog could drain as a multi-request burst — a network
 *    panel that looks like an infinite call loop.
 *
 * Rules encoded here:
 * - In the browser, telemetry ALWAYS posts to the same-origin proxy first.
 *   The configured absolute base is only a fallback if the proxy route itself
 *   rejects the request (401/403/404).
 * - A 401/403 is never retried hot: callers cooldown; the shared backoff
 *   constants live here so both clients behave identically.
 */
import { env } from '@/lib/env';

/** Long cooldown for auth failures (session missing/expired). */
export const AUTH_FAILURE_COOLDOWN_MS = 5 * 60_000;
/** Consecutive auth failures after which the flusher goes dormant. */
export const AUTH_FAILURE_STRIKE_LIMIT = 3;
/** Minimum gap between two telemetry flush attempts (burst guard). */
export const TELEMETRY_MIN_FLUSH_GAP_MS = 5_000;

/** True when the app runs in a browser (same-origin proxy available). */
function inBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.location !== 'undefined';
}

let preferAbsolute = false;

/** Base URL for telemetry posts (never has a trailing slash). */
export function telemetryBase(): string {
  const direct = env.NEXT_PUBLIC_API_BASE_URL;
  if (inBrowser()) {
    // Same-origin proxy first: no CORS preflight, cookies always attached.
    if (!preferAbsolute) return '/api/proxy';
    return (direct || '/api/proxy').replace(/\/+$/, '');
  }
  return (direct || '/api/proxy').replace(/\/+$/, '');
}

/**
 * Records a non-OK telemetry response. Returns true when the caller should
 * retry ONCE right away (the base just switched), false when the failure was
 * terminal for this attempt.
 */
export function noteTelemetryFailure(status: number): boolean {
  if (status !== 401 && status !== 403 && status !== 404) return false;
  if (inBrowser() && !preferAbsolute && status === 404) {
    // The proxy route does not exist in this deployment — use the API directly.
    preferAbsolute = true;
    return true;
  }
  if (inBrowser() && preferAbsolute) {
    // Even the absolute base failed auth — keep it there (no cheap fix left).
    return false;
  }
  return false;
}
