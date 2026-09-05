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
  ACCESS_TOKEN_MAX_AGE,
} from '@/lib/auth/cookies';
import { env } from '@/lib/env';

function expiresInFromJwt(token: string): number {
  try {
    const payload = token.split('.')[1];
    if (!payload) return 0;
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
    };
    if (typeof json.exp !== 'number') return ACCESS_TOKEN_MAX_AGE;
    return Math.max(0, json.exp - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
}

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
  const { accessToken: initialAccessToken, refreshToken } = getAuthCookies(cookieStore);
  let accessToken = initialAccessToken;

  const needsRefresh =
    !accessToken ||
    expiresInFromJwt(accessToken) < 60 ||
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
      expiresIn: expiresInFromJwt(accessToken) || ACCESS_TOKEN_MAX_AGE,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
