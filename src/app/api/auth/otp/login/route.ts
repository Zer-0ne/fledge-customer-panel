import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api/client';
import { extractAuthTokens } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/cookies';
import { ApiError } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { identifier, code, deviceLabel } = body || {};

    if (!identifier || typeof identifier !== 'string' || !code || typeof code !== 'string') {
      return NextResponse.json(
        { error: { message: 'Identifier and 6-digit OTP code are required', status: 400 } },
        { status: 400 }
      );
    }

    const backendRes = await apiFetch<Record<string, unknown>>({
      method: 'POST',
      path: '/api/v1/auth/otp/login',
      body: {
        identifier: identifier.trim(),
        code: code.trim(),
        deviceLabel: deviceLabel || 'Web Browser',
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
      { error: { message: 'An unexpected error occurred during OTP login', status: 500 } },
      { status: 500 }
    );
  }
}
