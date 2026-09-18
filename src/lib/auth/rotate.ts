/**
 * Server-side session rotation helpers shared by the BFF auth routes.
 *
 * `probeAccessToken` asks the API whether the access JWT is still accepted;
 * `rotateRefreshToken` exchanges the refresh cookie for a fresh pair and
 * rewrites the cookies. Used by the socket-token bridge, the keep-alive ping
 * and the API proxy's 401 retry, so every surface that can outlive the 15-min
 * access token heals itself instead of bouncing the user to /login.
 */

import type { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api/client';
import { extractAuthTokens } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/cookies';
import { env } from '@/lib/env';

export type AuthCookieStore = Awaited<ReturnType<typeof cookies>>;

/** Cheap "is the access JWT still good?" probe — bootstrap is cached server-side. */
export async function probeAccessToken(accessToken: string): Promise<boolean> {
  try {
    await apiFetch({
      method: 'GET',
      path: '/api/v1/auth/bootstrap',
      accessToken,
      baseUrl: env.BACKEND_API_BASE_URL,
      timeoutMs: 8_000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Exchange the refresh cookie for a new token pair and persist the cookies.
 * Returns the fresh access token, or null when the session is dead.
 */
export async function rotateRefreshToken(
  cookieStore: AuthCookieStore,
  refreshToken: string
): Promise<string | null> {
  try {
    const backendRes = await apiFetch<Record<string, unknown>>({
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: { refreshToken },
      baseUrl: env.BACKEND_API_BASE_URL,
    });
    const tokens = extractAuthTokens(backendRes);
    if (!tokens?.accessToken) return null;
    setAuthCookies(cookieStore, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || refreshToken,
    });
    return tokens.accessToken;
  } catch {
    return null;
  }
}

/**
 * Same as `rotateRefreshToken`, but concurrent callers inside this process
 * share one rotation. Refresh tokens are single-use (rotation + reuse
 * detection); N parallel 401s from one page must not look like a replay.
 */
const inflightRotations = new Map<string, Promise<string | null>>();

export function rotateRefreshTokenSingleFlight(
  cookieStore: AuthCookieStore,
  refreshToken: string
): Promise<string | null> {
  const key = refreshToken.slice(0, 24);
  const existing = inflightRotations.get(key);
  if (existing) return existing;
  const rotation = rotateRefreshToken(cookieStore, refreshToken).finally(() => {
    inflightRotations.delete(key);
  });
  inflightRotations.set(key, rotation);
  return rotation;
}
