import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api/client';
import { extractAuthTokens } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/cookies';
import { ApiError } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { displayName, email, phone, password, deviceLabel } = body || {};

    if (!displayName || typeof displayName !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { error: { message: 'Display name and password are required', status: 400 } },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: { message: 'Either email or phone number is required', status: 400 } },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      displayName: displayName.trim(),
      password,
      deviceLabel: deviceLabel || 'Web Browser',
    };

    if (email) payload.email = String(email).trim().toLowerCase();
    if (phone) payload.phone = String(phone).trim();

    const backendRes = await apiFetch<Record<string, unknown>>({
      method: 'POST',
      path: '/api/v1/auth/signup',
      body: payload,
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
      { error: { message: 'An unexpected error occurred during registration', status: 500 } },
      { status: 500 }
    );
  }
}
