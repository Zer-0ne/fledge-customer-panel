import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from './env';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('provides default fallback values when env vars are missing', () => {
    delete process.env.BACKEND_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_NAME;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    const config = validateEnv();

    expect(config.BACKEND_API_BASE_URL).toBe('http://localhost:3000');
    expect(config.NEXT_PUBLIC_APP_NAME).toBe('Fledge');
    expect(config.NEXT_PUBLIC_API_BASE_URL).toBe('/api/proxy');
    expect(config.NEXT_PUBLIC_SOCKET_URL).toBe('http://localhost:3000');
  });

  it('uses environment variables when provided', () => {
    process.env.BACKEND_API_BASE_URL = 'https://api.flatfinder.com';
    process.env.NEXT_PUBLIC_APP_NAME = 'Custom Student Housing';
    process.env.NEXT_PUBLIC_API_BASE_URL = '/custom-api';
    process.env.NEXT_PUBLIC_SOCKET_URL = 'https://api.flatfinder.com';

    const config = validateEnv();

    expect(config.BACKEND_API_BASE_URL).toBe('https://api.flatfinder.com');
    expect(config.NEXT_PUBLIC_APP_NAME).toBe('Custom Student Housing');
    expect(config.NEXT_PUBLIC_API_BASE_URL).toBe('/custom-api');
    expect(config.NEXT_PUBLIC_SOCKET_URL).toBe('https://api.flatfinder.com');
  });
});
