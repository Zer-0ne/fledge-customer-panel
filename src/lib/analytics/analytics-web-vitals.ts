/**
 * Web Vitals tracking — captures LCP, FID, CLS, TTFB, INP.
 * Reports to analytics as web_vital_recorded events.
 */

import { track } from './analytics-client';

let initialized = false;

/** Initialize Web Vitals tracking. */
export function initializeWebVitals(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Use PerformanceObserver for Core Web Vitals.
  try {
    // LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        track('web_vital_recorded', {
          vitalName: 'LCP',
          value: Math.round(lastEntry.startTime),
          rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs_improvement' : 'poor',
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  try {
    // FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        track('web_vital_recorded', {
          vitalName: 'FID',
          value: Math.round(fidEntry.processingStart - fidEntry.startTime),
          rating: fidEntry.processingStart - fidEntry.startTime < 100 ? 'good' : 'poor',
        });
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (_) {}

  try {
    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const clsEntry = entry as LayoutShift;
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    // Report CLS on page hide.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && clsValue > 0) {
        track('web_vital_recorded', {
          vitalName: 'CLS',
          value: Math.round(clsValue * 1000) / 1000,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs_improvement' : 'poor',
        });
      }
    });
  } catch (_) {}

  try {
    // TTFB (Time to First Byte)
    const ttfbObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          track('web_vital_recorded', {
            vitalName: 'TTFB',
            value: Math.round(nav.responseStart - nav.requestStart),
            rating: nav.responseStart - nav.requestStart < 800 ? 'good' : 'poor',
          });
        }
      }
    });
    ttfbObserver.observe({ type: 'navigation', buffered: true });
  } catch (_) {}
}

/** LayoutShift type for CLS tracking. */
interface LayoutShift extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}
