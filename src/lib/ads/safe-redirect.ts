/**
 * Safe redirect helpers for ad click destinations.
 * Blocks non-http(s) schemes and malformed URLs.
 */

const BLOCKED_PROTOCOLS = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
]);

/**
 * Returns true when `url` is a safe absolute http(s) URL suitable for navigation.
 */
export function isSafeRedirectUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim();
  if (!trimmed) return false;

  // Relative same-origin paths are allowed
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return !trimmed.includes('\\') && !trimmed.toLowerCase().includes('javascript:');
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    if (BLOCKED_PROTOCOLS.has(protocol)) return false;
    if (protocol !== 'http:' && protocol !== 'https:') return false;

    // Reject credentials in URL (user:pass@host)
    if (parsed.username || parsed.password) return false;

    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Normalizes a validated redirect target for navigation.
 * Returns null when unsafe.
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string | null {
  if (!isSafeRedirectUrl(url)) return null;
  return (url as string).trim();
}
