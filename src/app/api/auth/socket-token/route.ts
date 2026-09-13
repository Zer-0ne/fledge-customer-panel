/**
 * BFF bridge — `POST /api/auth/socket-token`
 * Exposes the current HttpOnly access token for Socket.IO handshake auth.
 *
 * Refreshes when the access JWT is missing, near expiry, or rejected by
 * bootstrap — otherwise ChatGateway rejects the handshake and the UI shows
 * the REST fallback banner.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api/client';
import { extractAuthTokens } from '@/lib/auth/tokens';
import {
  setAuthCookies,
  clearAuthCookies,
  getAuthCookies,
  isLoggedOutMarked,
  ACCESS_TOKEN_MAX_AGE,
} from '@/lib/auth/cookies';
import { expiresInFromJwt } from '@/lib/auth/jwt';
import { env } from '@/lib/env';

async function probeAccessToken(accessToken: string): Promise<boolean> {
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

async function rotate(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
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

export async function POST() {
  const cookieStore = await cookies();

  // Freshly logged out: never mint a session from a racing refresh response.
  if (isLoggedOutMarked(cookieStore)) {
    clearAuthCookies(cookieStore);
    return NextResponse.json(
      { error: { message: 'Logged out', status: 401 } },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { accessToken: initialAccessToken, refreshToken } = getAuthCookies(cookieStore);
  let accessToken = initialAccessToken;

  // Opaque/unparseable tokens fall back to the max-age probe (preserved
  // behavior); ≤ 60s remaining refreshes proactively.
  const accessTtlSeconds = accessToken
    ? expiresInFromJwt(accessToken) ?? ACCESS_TOKEN_MAX_AGE
    : 0;

  const needsRefresh =
    !accessToken ||
    accessTtlSeconds < 60 ||
    !(await probeAccessToken(accessToken));

  if (needsRefresh) {
    if (!refreshToken) {
      return NextResponse.json(
        { error: { message: 'Authentication required', status: 401 } },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const rotated = await rotate(cookieStore, refreshToken);
    if (!rotated) {
      clearAuthCookies(cookieStore);
      return NextResponse.json(
        { error: { message: 'Session is no longer active', status: 401 } },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    accessToken = rotated;
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: { message: 'Authentication required', status: 401 } },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let route: Record<string, unknown> = {};
  try {
    const routeResponse = await apiFetch<Record<string, unknown>>({
      method: 'GET',
      path: '/api/v1/realtime/route',
      accessToken,
      baseUrl: env.BACKEND_API_BASE_URL,
      timeoutMs: 8_000,
    });
    route = routeResponse.data && typeof routeResponse.data === 'object'
      ? routeResponse.data as Record<string, unknown>
      : routeResponse;
  } catch {
    return NextResponse.json(
      { error: { message: 'Realtime routing is unavailable', status: 503 } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      ...route,
      token: accessToken,
      expiresIn: Math.max(0, expiresInFromJwt(accessToken) ?? 0) || ACCESS_TOKEN_MAX_AGE,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
