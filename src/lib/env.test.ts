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
    expect(config.NEXT_PUBLIC_IS_BETA).toBe(true);
  });

  it('defaults browser API base to the backend origin in production', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    delete process.env.BACKEND_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    const config = validateEnv();

    expect(config.BACKEND_API_BASE_URL).toBe('https://api-fledge.nearestz.com');
    expect(config.NEXT_PUBLIC_API_BASE_URL).toBe('https://api-fledge.nearestz.com');
    expect(config.NEXT_PUBLIC_SOCKET_URL).toBe('https://api-fledge.nearestz.com');
  });

  it('uses NEXT_PUBLIC_BACKEND_API_BASE_URL when the browser base is unset', () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_BACKEND_API_BASE_URL: 'https://api.flatfinder.com',
      NEXT_PUBLIC_APP_NAME: 'Custom Student Housing',
      NEXT_PUBLIC_IS_BETA: 'false',
    };
    delete process.env.BACKEND_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_SOCKET_URL;

    const config = validateEnv();

    expect(config.BACKEND_API_BASE_URL).toBe('https://api.flatfinder.com');
    expect(config.NEXT_PUBLIC_API_BASE_URL).toBe('https://api.flatfinder.com');
    expect(config.NEXT_PUBLIC_SOCKET_URL).toBe('https://api.flatfinder.com');
    expect(config.NEXT_PUBLIC_APP_NAME).toBe('Custom Student Housing');
    expect(config.NEXT_PUBLIC_IS_BETA).toBe(false);
  });

});
