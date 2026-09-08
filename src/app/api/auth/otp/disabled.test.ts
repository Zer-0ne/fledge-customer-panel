import { describe, expect, it } from 'vitest';
import { POST as requestOtp } from './request/route';
import { POST as loginWithOtp } from './login/route';

describe('retired OTP login BFF routes', () => {
  const request = new Request('http://localhost/api/auth/otp', { method: 'POST' });

  it.each([
    ['request', requestOtp],
    ['login', loginWithOtp],
  ])('returns an uncacheable 404 for %s', async (_name, handler) => {
    const response = await handler(request);

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
