'use client';

/**
 * Navigation Progress Bar — sleek top-of-screen route progress indicator.
 * Provides immediate visual feedback on internal navigation clicks and route changes.
 *
 * Failsafe (2026-09-17): the bar used to STICK at ~88% whenever a click did
 * not actually navigate (click intercepted later in the bubble phase, same
 * route, cancelled navigation, offline). Every start now arms a timeout that
 * completes + fades the bar regardless — the bar can never sit stuck.
 */
import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** Hard cap: never let the bar remain visible longer than this. */
const STUCK_TIMEOUT_MS = 12_000;
/** How long the completed bar stays at 100% before fading out. */
const FADE_MS = 300;

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const stuckTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearTimers = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stuckTimeoutRef.current) {
      clearTimeout(stuckTimeoutRef.current);
      stuckTimeoutRef.current = null;
    }
  }, []);

  /** Complete the bar (100%) and fade it out. Idempotent. */
  const finish = React.useCallback(() => {
    setProgress(100);
    clearTimers();
    if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    cleanupTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, FADE_MS);
  }, [clearTimers]);

  /** Start the bar + arm the stuck failsafe. */
  const start = React.useCallback(
    (initial = 25) => {
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
      clearTimers();
      setVisible(true);
      setProgress(initial);
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 65) return prev + Math.random() * 12 + 6;
          if (prev < 88) return prev + Math.random() * 4 + 1;
          return prev;
        });
      }, 160);
      // Failsafe: if no route change follows, complete instead of sticking.
      stuckTimeoutRef.current = setTimeout(finish, STUCK_TIMEOUT_MS);
    },
    [clearTimers, finish],
  );

  // When pathname or searchParams change, complete the bar and fade out
  React.useEffect(() => {
    if (visible) finish();
    return () => {
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `visible` is read at change time only
  }, [pathname, searchParams]);

  // Intercept anchor clicks to start progress immediately
  React.useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Skip non-internal or special links
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.getAttribute('target') === '_blank' ||
        target.hasAttribute('download')
      ) {
        return;
      }

      // Check if target URL matches current URL exactly
      try {
        const targetUrl = new URL(href, window.location.href);
        if (
          targetUrl.pathname === window.location.pathname &&
          targetUrl.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      start();
    };

    const handlePopState = () => {
      start(40);
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
      window.removeEventListener('popstate', handlePopState);
      clearTimers();
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
  }, [start, clearTimers]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 right-0 z-[99999] h-0.5 transition-opacity duration-250 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-indigo-500 to-primary shadow-[0_0_12px_rgba(99,102,241,0.8)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
