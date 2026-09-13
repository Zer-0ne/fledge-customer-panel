/**
 * Logout guard — coordinates logout against in-flight auth refreshes.
 *
 * WHY (reproduced 2026-09-13, installed Chrome PWA):
 * Socket reconnects (freeze/thaw, network transitions) fire
 * `POST /api/auth/socket-token` from `renewAuth()`. When the user logs out
 * while such a refresh is in flight, the socket-token response can land
 * AFTER the logout response and re-mint `cp_access_token`/`cp_refresh_token`
 * — the login page's bootstrap then succeeds and the user appears to be
 * logged back in automatically.
 *
 * FIX: `beginLogout()` aborts every tracked auth-refresh fetch (an aborted
 * response is discarded, so its Set-Cookie never applies) and blocks new
 * ones until the app reloads or a fresh session is established
 * (`endLogout()` runs on a successful bootstrap).
 */

let loggingOut = false;
const inflight = new Set<AbortController>();

/** True while a logout is in progress (blocks new auth-refresh fetches). */
export function isLoggingOut(): boolean {
  return loggingOut;
}

/** Marks logout as in progress and aborts all in-flight auth-refresh fetches. */
export function beginLogout(): void {
  loggingOut = true;
  for (const controller of inflight) {
    try {
      controller.abort();
    } catch {
      /* already settled */
    }
  }
  inflight.clear();
}

/** Clears the logout guard once a fresh session is established. */
export function endLogout(): void {
  loggingOut = false;
}

/**
 * Fetch wrapper for auth-refresh endpoints (`/api/auth/socket-token`).
 * Throws immediately during logout and registers the request so an in-flight
 * call is aborted the moment logout starts — discarding its Set-Cookie.
 */
export async function guardedAuthFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  if (loggingOut) {
    const error = new Error('Auth refresh cancelled: logout in progress');
    error.name = 'AbortError';
    throw error;
  }

  const controller = new AbortController();
  inflight.add(controller);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    inflight.delete(controller);
  }
}
