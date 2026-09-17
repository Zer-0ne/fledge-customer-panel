'use client';
/**
 * Navigation Progress Bar — a PASSIVE route progress indicator.
 *
 * Hard rule (2026-09-17, user report "why are you blocking navigation because
 * of the loading bar"): this component NEVER touches navigation. It does not
 * preventDefault, it does not navigate, it does not delay anything. It only
 * observes:
 *   - a click on an internal link starts the visual,
 *   - a route change (pathname/searchParams) completes it.
 *
 * The bar also stays out of the way on fast routes: it appears only after
 * SHOW_AFTER_MS, so an instant navigation shows no loading chrome at all.
 * If a route is slow, that is the route's own work — never this component's.
 */
import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** Grace period before the bar appears (no chrome for fast routes). */
const SHOW_AFTER_MS = 150;
/** Hard cap: the bar never stays on screen longer than this. */
const STUCK_TIMEOUT_MS = 10_000;
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
  const showTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  /** True once the bar was actually surfaced for the current navigation. */
  const shownRef = React.useRef(false);

  const clearTimers = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stuckTimeoutRef.current) {
      clearTimeout(stuckTimeoutRef.current);
      stuckTimeoutRef.current = null;
    }
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  /** Complete the bar (100%) and fade it out. Idempotent, observation only. */
  const finish = React.useCallback(() => {
    clearTimers();
    if (!shownRef.current) {
      // Route changed inside the grace window — nothing was shown.
      setProgress(0);
      setVisible(false);
      return;
    }
    shownRef.current = false;
    setProgress(100);
    if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    cleanupTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, FADE_MS);
  }, [clearTimers]);

  /** Start the visual only — no navigation side effects of any kind. */
  const start = React.useCallback(
    (initial = 25) => {
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
      clearTimers();
      shownRef.current = false;

      showTimerRef.current = setTimeout(() => {
        showTimerRef.current = null;
        shownRef.current = true;
        setVisible(true);
        setProgress(initial);
        intervalRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev < 65) return prev + Math.random() * 12 + 6;
            if (prev < 88) return prev + Math.random() * 4 + 1;
            return prev;
          });
        }, 160);
      }, SHOW_AFTER_MS);

      // Failsafe: the bar itself never sticks on screen.
      stuckTimeoutRef.current = setTimeout(finish, STUCK_TIMEOUT_MS);
    },
    [clearTimers, finish],
  );

  // Route changed → complete and fade. Passive observation.
  React.useEffect(() => {
    if (visible) finish();
    return () => {
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `visible` is read at change time only
  }, [pathname, searchParams]);

  // Observe internal link clicks purely to show the bar early.
  React.useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      // Never interfere: a cancelled or modified click is simply ignored.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Skip non-internal or special links.
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

      // Skip a link that points at the page we are already on.
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

      start(25);
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
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
