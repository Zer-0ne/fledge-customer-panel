import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api/client';
import { extractAuthTokens } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/cookies';
import { ApiError } from '@/lib/api/errors';

/**
 * Google Sign-In (web) — receives the Google ID token from the GIS button /
 * One Tap flow, forwards it to the backend `POST /api/v1/auth/google` (which
 * verifies RS256 signature, issuer, audience, expiry, email_verified), then
 * stores the returned tokens in the SAME HttpOnly cookies as password login.
 *
 * `fingerprint` = the `g_csrf_token` cookie value read client-side. When the
 * browser carries that cookie, the backend REQUIRES the submitted fingerprint
 * to match it (else 401).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { idToken, fingerprint, deviceLabel } = body || {};

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: { message: 'Google ID token is required', status: 400 } },
        { status: 400 }
      );
    }

    const backendRes = await apiFetch<Record<string, unknown>>({
      method: 'POST',
      path: '/api/v1/auth/google',
      body: {
        idToken,
        deviceLabel: deviceLabel || 'Web Browser',
        ...(typeof fingerprint === 'string' && fingerprint ? { fingerprint } : {}),
      },
    });

    const tokens = extractAuthTokens(backendRes);
    const cookieStore = await cookies();

    if (tokens) {
      setAuthCookies(cookieStore, tokens);
    }

    return NextResponse.json({
      success: true,
      data: backendRes,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { message: error.message, code: error.code, field: error.field, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: { message: 'An unexpected error occurred during Google sign-in', status: 500 } },
      { status: 500 }
    );
  }
}
