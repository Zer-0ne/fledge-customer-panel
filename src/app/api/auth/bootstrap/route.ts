import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api/client';
import { extractAuthTokens } from '@/lib/auth/tokens';
import { getAuthCookies, setAuthCookies, clearAuthCookies } from '@/lib/auth/cookies';
import { ApiError } from '@/lib/api/errors';

export async function GET() {
  const cookieStore = await cookies();
  const { refreshToken } = getAuthCookies(cookieStore);
  let { accessToken } = getAuthCookies(cookieStore);

  // If no access token but refresh token exists, attempt refresh first
  if (!accessToken && refreshToken) {
    try {
      const refreshRes = await apiFetch<Record<string, unknown>>({
        method: 'POST',
        path: '/api/v1/auth/refresh',
        body: { refreshToken },
      });
      const tokens = extractAuthTokens(refreshRes);
      if (tokens) {
        accessToken = tokens.accessToken;
        setAuthCookies(cookieStore, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || refreshToken,
        });
      }
    } catch {
      clearAuthCookies(cookieStore);
      return NextResponse.json(
        { user: null, isAuthenticated: false, error: 'Session expired' },
        { status: 401 }
      );
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { user: null, isAuthenticated: false },
      { status: 401 }
    );
  }

  try {
    const bootstrapData = await apiFetch<Record<string, unknown>>({
      method: 'GET',
      path: '/api/v1/auth/bootstrap',
      accessToken,
    });

    return NextResponse.json({
      success: true,
      data: bootstrapData,
    });
  } catch (error) {
    // Retry once if 401 and refresh token exists
    if (error instanceof ApiError && error.status === 401 && refreshToken) {
      try {
        const refreshRes = await apiFetch<Record<string, unknown>>({
          method: 'POST',
          path: '/api/v1/auth/refresh',
          body: { refreshToken },
        });
        const tokens = extractAuthTokens(refreshRes);

        if (tokens) {
          setAuthCookies(cookieStore, {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || refreshToken,
          });

          // Retry bootstrap with new access token
          const retryData = await apiFetch<Record<string, unknown>>({
            method: 'GET',
            path: '/api/v1/auth/bootstrap',
            accessToken: tokens.accessToken,
          });

          return NextResponse.json({
            success: true,
            data: retryData,
          });
        }
      } catch {
        // Refresh retry failed
      }
    }

    clearAuthCookies(cookieStore);
    return NextResponse.json(
      { user: null, isAuthenticated: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
