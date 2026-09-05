/**
 * Server-Side Auth Cookie Management
 * Configures HttpOnly, Secure, SameSite=Lax cookies for cp_access_token and cp_refresh_token.
 */

export const ACCESS_TOKEN_COOKIE = 'cp_access_token';
export const REFRESH_TOKEN_COOKIE = 'cp_refresh_token';

// 15 minutes for access token
export const ACCESS_TOKEN_MAX_AGE = 60 * 15;
// 30 days for refresh token
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

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
}

/**
 * Clears access and refresh token cookies.
 */
export function clearAuthCookies(cookieStore: MinimalCookieStore): void {
  const sharedDomain = getSharedCookieDomain();
  cookieStore.set(ACCESS_TOKEN_COOKIE, '', getCookieConfig(0));
  cookieStore.set(REFRESH_TOKEN_COOKIE, '', getCookieConfig(0));
  if (sharedDomain) {
    cookieStore.set(ACCESS_TOKEN_COOKIE, '', getCookieConfig(0, sharedDomain));
    cookieStore.set(REFRESH_TOKEN_COOKIE, '', getCookieConfig(0, sharedDomain));
  }
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
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
