/**
 * Server-side JWT helpers for BFF auth routes.
 */

/**
 * Seconds until the JWT `exp` claim.
 * Returns `null` when the token is missing, opaque, or unparseable so callers
 * can pick their own policy (fail-open for probes, fail-closed for logout).
 * The result may be ≤ 0 when the token is expired.
 */
export function expiresInFromJwt(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
    };
    if (typeof json.exp !== 'number') return null;
    return json.exp - Math.floor(Date.now() / 1000);
  } catch {
    return null;
  }
}
