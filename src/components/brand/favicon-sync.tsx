'use client';

import * as React from 'react';

import { syncFaviconFromStorage } from '@/lib/brand/favicon';

/**
 * Re-applies the user's browser-tab icon variant on every load.
 * Renders nothing — mounted once in the root layout.
 */
export function FaviconSync() {
  React.useEffect(() => {
    syncFaviconFromStorage();
  }, []);
  return null;
}
