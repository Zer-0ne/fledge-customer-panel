'use client';

import { useEffect } from 'react';
import { initializeAnalytics, disposeAnalytics } from '@/lib/analytics/analytics-client';

/**
 * Initializes analytics on client mount and cleans up on unmount.
 * Must be rendered inside a Client Component tree.
 */
export function AnalyticsInit() {
  useEffect(() => {
    initializeAnalytics();
    return () => {
      disposeAnalytics();
    };
  }, []);

  return null;
}
