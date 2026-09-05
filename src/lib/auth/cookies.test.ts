import { describe, it, expect, vi } from 'vitest';
import {
  setAuthCookies,
  clearAuthCookies,
  getAuthCookies,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './cookies';

describe('Cookie Management', () => {
  it('sets access and refresh token cookies with correct flags', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new Map<string, { name: string; value: string; options?: any }>();
    const mockCookieStore = {
      set: vi.fn((name, value, options) => {
        store.set(name, { name, value, options });
      }),
      get: vi.fn((name) => store.get(name)),
      delete: vi.fn((name) => store.delete(name)),
    };

    setAuthCookies(mockCookieStore, { accessToken: 'acc_test', refreshToken: 'ref_test' });

    expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
    expect(store.get(ACCESS_TOKEN_COOKIE)?.value).toBe('acc_test');
    expect(store.get(REFRESH_TOKEN_COOKIE)?.value).toBe('ref_test');
    expect(store.get(ACCESS_TOKEN_COOKIE)?.options.httpOnly).toBe(true);
  });

  it('sets the shared nearestz cookie domain in production', () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, NODE_ENV: 'production' };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = new Map<string, { name: string; value: string; options?: any }>();
      const mockCookieStore = {
        set: vi.fn((name, value, options) => {
          store.set(name, { name, value, options });
        }),
        get: vi.fn((name) => store.get(name)),
        delete: vi.fn((name) => store.delete(name)),
      };

      setAuthCookies(mockCookieStore, { accessToken: 'acc_test' });

      expect(store.get(ACCESS_TOKEN_COOKIE)?.options.domain).toBe('.nearestz.com');
    } finally {
      process.env = originalEnv;
    }
  });

  it('reads cookies via getAuthCookies', () => {
    const store = new Map<string, { name: string; value: string }>();
    store.set(ACCESS_TOKEN_COOKIE, { name: ACCESS_TOKEN_COOKIE, value: 'token_a' });
    store.set(REFRESH_TOKEN_COOKIE, { name: REFRESH_TOKEN_COOKIE, value: 'token_r' });

    const mockCookieStore = {
      set: vi.fn(),
      get: vi.fn((name) => store.get(name)),
      delete: vi.fn(),
    };

    const cookies = getAuthCookies(mockCookieStore);
    expect(cookies).toEqual({ accessToken: 'token_a', refreshToken: 'token_r' });
  });

  it('clears cookies via clearAuthCookies', () => {
    const store = new Map<string, { name: string; value: string }>();
    store.set(ACCESS_TOKEN_COOKIE, { name: ACCESS_TOKEN_COOKIE, value: 'token_a' });
    store.set(REFRESH_TOKEN_COOKIE, { name: REFRESH_TOKEN_COOKIE, value: 'token_r' });

    const mockCookieStore = {
      set: vi.fn((name, value) => {
        if (value === '') store.delete(name);
      }),
      get: vi.fn((name) => store.get(name)),
      delete: vi.fn((name) => store.delete(name)),
    };

    clearAuthCookies(mockCookieStore);
    expect(mockCookieStore.delete).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
    expect(mockCookieStore.delete).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE);
    expect(store.has(ACCESS_TOKEN_COOKIE)).toBe(false);
  });
});
