'use client';

import * as React from 'react';

/**
 * Returns the number of seconds left until `expiresAt`, refreshed on mount,
 * on window focus / visibility change, and every 60s. Uses the server-provided
 * `expiresAt` timestamp as the source of truth; the client only counts down.
 */
export function useRemainingSeconds(expiresAt: string | null | undefined): number | null {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!expiresAt) return;
    const update = () => setNow(Date.now());
    const onFocus = () => update();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const interval = window.setInterval(update, 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.clearInterval(interval);
    };
  }, [expiresAt]);

  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return null;
  return Math.max(0, Math.floor((expiry - now) / 1000));
}
