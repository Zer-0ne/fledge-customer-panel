/**
 * Token Extraction Adapter
 * Safely extracts access & refresh tokens from unknown API response shapes.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Extracts AuthTokens from arbitrary backend API response shapes.
 * Guaranteed zero token logging for security.
 */
export function extractAuthTokens(data: unknown): AuthTokens | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Check top-level properties
  const accessToken =
    (typeof obj.accessToken === 'string' && obj.accessToken) ||
    (typeof obj.access_token === 'string' && obj.access_token) ||
    (typeof obj.token === 'string' && obj.token);

  const refreshToken =
    (typeof obj.refreshToken === 'string' && obj.refreshToken) ||
    (typeof obj.refresh_token === 'string' && obj.refresh_token);

  if (accessToken) {
    return {
      accessToken,
      ...(refreshToken ? { refreshToken } : {}),
    };
  }

  // Check nested in data or tokens property
  if (obj.data && typeof obj.data === 'object') {
    const nestedTokens = extractAuthTokens(obj.data);
    if (nestedTokens) return nestedTokens;
  }

  if (obj.tokens && typeof obj.tokens === 'object') {
    const nestedTokens = extractAuthTokens(obj.tokens);
    if (nestedTokens) return nestedTokens;
  }

  return null;
}
