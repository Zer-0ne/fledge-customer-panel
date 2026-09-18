/**
 * API Proxy Route Handler
 * BFF Proxy route forwarding customer API requests to backend while enforcing security allowlist.
 * Browser → same-origin `/api/proxy/*` (no CORS) → Nest API at BACKEND_API_BASE_URL.
 *
 * Also owns the 15-minute access token's silent renewal: a parked tab comes
 * back with an expired JWT, so the first upstream 401 triggers one rotation
 * (single-flight) and the request is replayed — the user never sees a
 * "session expired" wall while the refresh cookie is still valid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  isAllowedCustomerEndpoint,
  resolveProxyBackendPath,
} from '@/lib/api/allowlist';
import { rotateRefreshTokenSingleFlight } from '@/lib/auth/rotate';
import { env } from '@/lib/env';

async function handleProxy(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const { path } = await props.params;
  const pathString = resolveProxyBackendPath(path);

  // Enforce customer allowlist
  if (!isAllowedCustomerEndpoint(req.method, pathString)) {
    return NextResponse.json(
      { error: { message: 'Forbidden: Endpoint not allowed in customer panel', code: 'FORBIDDEN' } },
      { status: 403 }
    );
  }

  const targetUrl = new URL(`${env.BACKEND_API_BASE_URL}${pathString}${req.nextUrl.search}`);

  const headers = new Headers(req.headers);
  // Hop-by-hop / browser-only headers must not be forwarded to the Nest API
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('cookie');
  headers.delete('origin');
  headers.delete('referer');

  const cookieStore = await cookies();
  const readCookie = (name: string) =>
    req.cookies.get(name)?.value ?? cookieStore.get(name)?.value;

  // Attach session access token cookie if present
  const accessToken = readCookie('cp_access_token');
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    let body: BodyInit | undefined = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = await req.text();
    }

    const send = () =>
      fetch(targetUrl.toString(), {
        method: req.method,
        headers,
        body,
        redirect: 'manual',
      });

    let response = await send();

    if (response.status === 401 && accessToken) {
      const refreshToken = readCookie('cp_refresh_token');
      if (refreshToken) {
        const rotated = await rotateRefreshTokenSingleFlight(cookieStore, refreshToken);
        if (rotated) {
          headers.set('Authorization', `Bearer ${rotated}`);
          response = await send();
        }
      }
    }

    const isNullBodyStatus = [204, 205, 304].includes(response.status);
    const responseData = isNullBodyStatus ? null : await response.text();

    const responseHeaders = new Headers();
    const contentType = response.headers.get('content-type');
    if (contentType && !isNullBodyStatus) {
      responseHeaders.set('content-type', contentType);
    }

    return new NextResponse(responseData, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Backend connection failed';
    return NextResponse.json(
      { error: { message: errMessage, code: 'SERVICE_UNAVAILABLE' } },
      { status: 503 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
