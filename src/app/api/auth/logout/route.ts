import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api/client';
import { clearAuthCookies, getAuthCookies } from '@/lib/auth/cookies';

export async function POST() {
  const cookieStore = await cookies();
  const { accessToken } = getAuthCookies(cookieStore);

  if (accessToken) {
    try {
      await apiFetch({
        method: 'POST',
        path: '/api/v1/auth/logout',
        accessToken,
      });
    } catch {
      // Ignore backend logout errors, always clear cookies on client logout
    }
  }

  clearAuthCookies(cookieStore);

  return new NextResponse(null, { status: 204 });
}
