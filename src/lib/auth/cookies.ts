/**
 * Server-Side Auth Cookie Management
 * Configures HttpOnly, Secure, SameSite=Lax cookies for cp_access_token and cp_refresh_token.
 */

export const ACCESS_TOKEN_COOKIE = 'cp_access_token';
export const REFRESH_TOKEN_COOKIE = 'cp_refresh_token';
/** Short-lived logout marker: present for ~60s after a logout so passively
 * minted sessions (socket-token/bootstrap refresh) can't re-create the
 * session from an in-flight or just-triggered refresh response. */
export const LOGGED_OUT_COOKIE = 'cp_logged_out';

// 15 minutes for access token
export const ACCESS_TOKEN_MAX_AGE = 60 * 15;
// 30 days for refresh token
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;
// Logout marker lifetime — must outlive any in-flight socket-token refresh.
export const LOGGED_OUT_MAX_AGE = 60;

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  domain?: string;
  maxAge?: number;
}

function getSharedCookieDomain(): string | undefined {
  const isProd = process.env.NODE_ENV === 'production';
  return process.env.COOKIE_DOMAIN || (isProd ? '.nearestz.com' : undefined);
}

export function getCookieConfig(maxAge?: number, domain?: string): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

export interface MinimalCookieStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(name: string, value: string, options?: any): any;
  get(name: string): { name: string; value: string } | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(name: string): any;
}

/**
 * Sets access and refresh token cookies on the given cookie store (e.g. from Next.js cookies()).
 */
export function setAuthCookies(
  cookieStore: MinimalCookieStore,
  tokens: { accessToken: string; refreshToken?: string }
): void {
  const sharedDomain = getSharedCookieDomain();
  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, getCookieConfig(ACCESS_TOKEN_MAX_AGE));
  if (sharedDomain) {
    cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, getCookieConfig(ACCESS_TOKEN_MAX_AGE, sharedDomain));
  }

  if (tokens.refreshToken) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, getCookieConfig(REFRESH_TOKEN_MAX_AGE));
    if (sharedDomain) {
      cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, getCookieConfig(REFRESH_TOKEN_MAX_AGE, sharedDomain));
    }
  }

  // A fresh session supersedes any recent logout — drop the logout marker so
  // the new session's socket/bootstrap refreshes are not blocked.
  cookieStore.delete(LOGGED_OUT_COOKIE);
}

/**
 * Clears access and refresh token cookies.
 */
export function clearAuthCookies(cookieStore: MinimalCookieStore): void {
  const sharedDomain = getSharedCookieDomain();
  const clearConfig = { ...getCookieConfig(0), maxAge: 0, expires: new Date(0) };
  cookieStore.set(ACCESS_TOKEN_COOKIE, '', clearConfig);
  cookieStore.set(REFRESH_TOKEN_COOKIE, '', clearConfig);
  if (sharedDomain) {
    const sharedClearConfig = { ...getCookieConfig(0, sharedDomain), maxAge: 0, expires: new Date(0) };
    cookieStore.set(ACCESS_TOKEN_COOKIE, '', sharedClearConfig);
    cookieStore.set(REFRESH_TOKEN_COOKIE, '', sharedClearConfig);
  }
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

/**
 * Marks this browser as freshly logged out (short-lived). While present, the
 * passive session-minting routes (socket-token / bootstrap refresh / refresh)
 * refuse to re-create a session — see `LOGGED_OUT_COOKIE`.
 */
export function setLoggedOutMarker(cookieStore: MinimalCookieStore): void {
  cookieStore.set(LOGGED_OUT_COOKIE, String(Date.now()), getCookieConfig(LOGGED_OUT_MAX_AGE));
}

/** True when the logout marker cookie is present on the request. */
export function isLoggedOutMarked(cookieStore: MinimalCookieStore): boolean {
  return Boolean(cookieStore.get(LOGGED_OUT_COOKIE)?.value);
}

/**
 * Retrieves existing access and refresh tokens from cookie store.
 */
export function getAuthCookies(cookieStore: MinimalCookieStore): {
  accessToken?: string;
  refreshToken?: string;
} {
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  return {
    accessToken,
    refreshToken,
  };
}
