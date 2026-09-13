import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api/client';
import {
  clearAuthCookies,
  getAuthCookies,
  setLoggedOutMarker,
} from '@/lib/auth/cookies';
import { extractAuthTokens } from '@/lib/auth/tokens';
import { expiresInFromJwt } from '@/lib/auth/jwt';

/**
 * Resolves an access token that can actually revoke the backend session.
 *
 * WHY: a stale (expired) access token makes the backend logout fail with 401
 * and the session stays alive server-side — an in-flight socket-token refresh
 * can then mint fresh cookies after this route clears them, which the login
 * page's bootstrap happily accepts (the "logout logs me back in" bug).
 * When the access token is missing/expired we rotate once via the refresh
 * token purely to obtain a revocable token. The rotated pair is deliberately
 * NOT persisted: the backend logout revokes every refresh token of the
 * session, so a discarded rotation dies with it.
 */
async function resolveLogoutToken(
  accessToken: string | undefined,
  refreshToken: string | undefined
): Promise<string | undefined> {
  const remaining = accessToken ? expiresInFromJwt(accessToken) : null;
  if (accessToken && remaining !== null && remaining > 5) return accessToken;
  if (!refreshToken) return accessToken;

  try {
    const refreshed = await apiFetch<Record<string, unknown>>({
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: { refreshToken },
    });
    return extractAuthTokens(refreshed)?.accessToken ?? accessToken;
  } catch {
    return accessToken;
  }
}

export async function POST() {
  const cookieStore = await cookies();
  const { accessToken, refreshToken } = getAuthCookies(cookieStore);

  const logoutToken = await resolveLogoutToken(accessToken, refreshToken);

  if (logoutToken) {
    try {
      await apiFetch({
        method: 'POST',
        path: '/api/v1/auth/logout',
        accessToken: logoutToken,
      });
    } catch {
      // Ignore backend logout errors, always clear cookies on client logout
    }
  }

  clearAuthCookies(cookieStore);
  // Short-lived marker: blocks passively-minted sessions (racing socket-token
  // refreshes, reconnect retries) from re-creating the session right after
  // logout — cleared automatically when a fresh login mints cookies.
  setLoggedOutMarker(cookieStore);

  const response = NextResponse.json(
    { ok: true, success: true },
    { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );

  clearAuthCookies(response.cookies);
  setLoggedOutMarker(response.cookies);

  return response;
}
