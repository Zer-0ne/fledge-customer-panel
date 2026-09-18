/**
 * BFF bridge — `POST /api/auth/keepalive`
 *
 * Silent session keep-alive for parked tabs. A backgrounded tab lets the
 * 15-minute access JWT lapse; when the user comes back the first REST call
 * would 401 and the UI would show "session expired" even though the refresh
 * cookie is still perfectly valid for weeks.
 *
 * This route is cheap on purpose: it only probes the current access token and
 * rotates when it is missing, near expiry, or rejected — otherwise it answers
 * `{ refreshed: false }` without touching the database.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  clearAuthCookies,
  getAuthCookies,
  isLoggedOutMarked,
  ACCESS_TOKEN_MAX_AGE,
} from '@/lib/auth/cookies';
import { expiresInFromJwt } from '@/lib/auth/jwt';
import {
  probeAccessToken,
  rotateRefreshTokenSingleFlight,
} from '@/lib/auth/rotate';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' } as const;

function authRequired() {
  return NextResponse.json(
    { error: { message: 'Authentication required', status: 401 } },
    { status: 401, headers: NO_STORE }
  );
}

export async function POST() {
  const cookieStore = await cookies();

  // Freshly logged out: never mint a session from a racing keep-alive.
  if (isLoggedOutMarked(cookieStore)) {
    clearAuthCookies(cookieStore);
    return authRequired();
  }

  const { accessToken, refreshToken } = getAuthCookies(cookieStore);
  if (!accessToken && !refreshToken) return authRequired();

  const accessTtlSeconds = accessToken
    ? expiresInFromJwt(accessToken) ?? ACCESS_TOKEN_MAX_AGE
    : 0;

  const needsRefresh =
    !accessToken ||
    accessTtlSeconds < 60 ||
    !(await probeAccessToken(accessToken));

  if (!needsRefresh) {
    return NextResponse.json(
      { refreshed: false, expiresIn: accessTtlSeconds },
      { headers: NO_STORE }
    );
  }

  if (!refreshToken) return authRequired();

  const rotated = await rotateRefreshTokenSingleFlight(cookieStore, refreshToken);
  if (!rotated) {
    // The session is gone (revoked, past the absolute cap, or reuse detected)
    // — clear the cookies so the UI can show the sign-in screen honestly.
    clearAuthCookies(cookieStore);
    return NextResponse.json(
      { error: { message: 'Session is no longer active', status: 401 } },
      { status: 401, headers: NO_STORE }
    );
  }

  return NextResponse.json(
    { refreshed: true, expiresIn: expiresInFromJwt(rotated) ?? ACCESS_TOKEN_MAX_AGE },
    { headers: NO_STORE }
  );
}
