import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

const OTP_LOGIN_API_ENABLED = false;

export async function POST(request: Request) {
  if (!OTP_LOGIN_API_ENABLED) {
    return NextResponse.json(
      { error: { message: 'Not found', status: 404 } },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { identifier } = body || {};

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { error: { message: 'Identifier (email or phone) is required', status: 400 } },
        { status: 400 }
      );
    }

    const backendRes = await apiFetch<Record<string, unknown>>({
      method: 'POST',
      path: '/api/v1/auth/otp/request',
      body: { identifier: identifier.trim() },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'OTP sent successfully',
        data: backendRes,
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { message: error.message, code: error.code, field: error.field, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: { message: 'An unexpected error occurred requesting OTP', status: 500 } },
      { status: 500 }
    );
  }
}
