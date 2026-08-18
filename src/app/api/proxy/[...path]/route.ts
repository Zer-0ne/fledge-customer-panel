/**
 * API Proxy Route Handler
 * BFF Proxy route forwarding customer API requests to backend while enforcing security allowlist.
 * Browser → same-origin `/api/proxy/*` (no CORS) → Nest API at BACKEND_API_BASE_URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  isAllowedCustomerEndpoint,
  resolveProxyBackendPath,
} from '@/lib/api/allowlist';
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

  // Attach session access token cookie if present
  const accessToken = req.cookies.get('cp_access_token')?.value;
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    let body: BodyInit | undefined = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = await req.text();
    }

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

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
