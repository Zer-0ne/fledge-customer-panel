import { describe, it, expect } from 'vitest';
import { normalizeApiError, ApiError, isApiError } from './errors';

describe('normalizeApiError', () => {
  it('preserves existing ApiError instances', () => {
    const original = new ApiError({ status: 404, message: 'Not found' });
    const normalized = normalizeApiError(original);
    expect(normalized).toBe(original);
    expect(isApiError(normalized)).toBe(true);
  });

  it('normalizes object errors with statusCode and message array', () => {
    const raw = {
      statusCode: 400,
      message: ['Email is invalid', 'Password is too short'],
      error: 'Bad Request',
    };
    const normalized = normalizeApiError(raw);
    expect(normalized.status).toBe(400);
    expect(normalized.message).toBe('Email is invalid, Password is too short');
  });

  it('unwraps backend { error: { code, message } } envelopes', () => {
    const raw = {
      error: {
        code: 'HOUSING_REQUEST_VERIFICATION_REQUIRED',
        message: 'Verify your phone number before publishing a housing request',
        requestId: 'req-95',
        path: '/api/v1/housing-requests/x/publish',
        timestamp: '2026-08-04T07:57:42.754Z',
      },
    };
    const normalized = normalizeApiError(raw, 400);
    expect(normalized.status).toBe(400);
    expect(normalized.message).toBe('Verify your phone number before publishing a housing request');
    expect(normalized.code).toBe('HOUSING_REQUEST_VERIFICATION_REQUIRED');
  });

  it('keeps unwrapped error payloads working (no envelope)', () => {
    const normalized = normalizeApiError({ code: 'RATE_LIMITED', message: 'Too many attempts', status: 429 }, 500);
    expect(normalized.status).toBe(429);
    expect(normalized.code).toBe('RATE_LIMITED');
    expect(normalized.message).toBe('Too many attempts');
  });

  it('provides standard fallback messages for known HTTP status codes', () => {
    const err401 = normalizeApiError({}, 401);
    expect(err401.status).toBe(401);
    expect(err401.message).toBe('Authentication required. Please log in.');

    const err530 = normalizeApiError({}, 530);
    expect(err530.status).toBe(530);
    expect(err530.message).toBe('Database or backend service is currently unavailable.');
  });

  it('handles primitive string errors', () => {
    const normalized = normalizeApiError('Network connection failed', 500);
    expect(normalized.status).toBe(500);
    expect(normalized.message).toBe('Network connection failed');
  });
});
