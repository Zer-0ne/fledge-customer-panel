import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api/client';
import { extractAuthTokens } from '@/lib/auth/tokens';
import { setAuthCookies, clearAuthCookies, getAuthCookies } from '@/lib/auth/cookies';
import { ApiError } from '@/lib/api/errors';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  let { refreshToken } = getAuthCookies(cookieStore);

  if (!refreshToken) {
    const body = await request.json().catch(() => ({}));
    if (body?.refreshToken && typeof body.refreshToken === 'string') {
      refreshToken = body.refreshToken;
    }
  }

  if (!refreshToken) {
    clearAuthCookies(cookieStore);
    return NextResponse.json(
      { error: { message: 'No refresh token available', status: 401 } },
      { status: 401 }
    );
  }

  try {
    const backendRes = await apiFetch<Record<string, unknown>>({
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: { refreshToken },
    });

    const tokens = extractAuthTokens(backendRes);

    if (tokens) {
      // Retain existing refresh token if rotated token wasn't returned
      setAuthCookies(cookieStore, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || refreshToken,
      });
    }

    return NextResponse.json({
      success: true,
      data: backendRes,
    });
  } catch (error) {
    clearAuthCookies(cookieStore);
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { message: error.message, code: error.code, field: error.field, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: { message: 'Failed to refresh authentication session', status: 401 } },
      { status: 401 }
    );
  }
}
