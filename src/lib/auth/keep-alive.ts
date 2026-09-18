'use client';

/**
 * Client-side silent session keep-alive.
 *
 * The access JWT lives 15 minutes; the refresh cookie lives for weeks. When a
 * tab is parked in the background the JWT lapses, so on the way back in we ping
 * `/api/auth/keepalive` — which rotates only when the token is actually gone or
 * about to expire — before the page fires its own REST calls.
 *
 * Coordination matters: refresh tokens are single-use (rotation + reuse
 * detection), so two tabs rotating at the same instant must not look like a
 * replay. A per-tab single-flight, a localStorage marker and the Web Locks API
 * keep exactly one rotation in flight across the profile.
 */

const MARKER_KEY = 'cp:session-keepalive';
/** Under the 15-minute access-token lifetime, so a parked tab refreshes only
 *  when the token could plausibly be stale. Foreground tabs never rotate more
 *  often than this. */
const MIN_INTERVAL_MS = 8 * 60 * 1000;
const LOCK_NAME = 'cp:session-keepalive';

interface LockLike {
  request: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
}

let inflight: Promise<boolean> | null = null;

function readMarker(): number {
  try {
    return Number(window.localStorage.getItem(MARKER_KEY) || 0);
  } catch {
    return 0;
  }
}

function writeMarker(): void {
  try {
    window.localStorage.setItem(MARKER_KEY, String(Date.now()));
  } catch {
    // Private mode / storage disabled — the in-memory single-flight still holds.
  }
}

/** Called after a login or an explicit refresh so other tabs skip a round-trip. */
export function markSessionFresh(): void {
  if (typeof window !== 'undefined') writeMarker();
}

async function ping(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/keepalive', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.ok) {
      writeMarker();
      return true;
    }
    // 401 means the session is genuinely over (revoked, expired, reuse);
    // anything else is a transient backend problem and must not look like a
    // logout to the caller.
    return res.status !== 401;
  } catch {
    return true;
  }
}

/**
 * Refresh the session if it may be stale. Resolves `true` when the session is
 * (still) usable and `false` only when the backend said the session is gone.
 */
export function keepAlive(force = false): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!force && Date.now() - readMarker() < MIN_INTERVAL_MS) return Promise.resolve(true);
  if (inflight) return inflight;

  const run = async (): Promise<boolean> => {
    // Another tab may have rotated while we waited on the lock.
    if (!force && Date.now() - readMarker() < MIN_INTERVAL_MS) return true;
    return ping();
  };

  inflight = (async () => {
    try {
      const locks = (navigator as Navigator & { locks?: LockLike }).locks;
      if (locks?.request) return await locks.request(LOCK_NAME, run);
      return await run();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
