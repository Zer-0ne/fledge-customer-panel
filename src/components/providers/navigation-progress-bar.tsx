'use client';
/**
 * Navigation Progress Bar — route progress indicator with a no-fake-wait rule.
 *
 * Behaviour contract:
 * 1. Internal link clicks are observed in the capture phase.
 * 2. The bar appears ONLY when the navigation actually takes longer than
 *    SHOW_AFTER_MS (~150ms). Instant route changes show NO loading chrome at
 *    all — flashing a bar on a fast route reads as a fake wait and makes the
 *    app feel slower than it is.
 * 3. The bar completes only when the route really changes.
 * 4. If a clicked internal link has not navigated NAV_FALLBACK_MS later
 *    (stalled transition, stale bundle, swallowed click) the click is honoured
 *    with a real navigation — the user never has to click twice.
 */
import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** Grace period before the bar appears at all (no chrome for fast routes). */
const SHOW_AFTER_MS = 150;
/** How long a click may stay un-navigated before we navigate for real. */
const NAV_FALLBACK_MS = 5_000;
/** Hard cap: never let the bar remain visible longer than this. */
const STUCK_TIMEOUT_MS = 10_000;
/** How long the completed bar stays at 100% before fading out. */
const FADE_MS = 300;

/** True when a dialog/sheet/popper owns the click (the app intercepts some
 *  cards on purpose) — then a pending navigation must NOT be forced. */
function isOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]',
    ),
  );
}

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const stuckTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const navFallbackRef = React.useRef<NodeJS.Timeout | null>(null);
  const showTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  /** True once the bar was actually surfaced for the current navigation. */
  const shownRef = React.useRef(false);
  /** The internal href of the last click that has not navigated yet. */
  const pendingHrefRef = React.useRef<string | null>(null);

  const clearTimers = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stuckTimeoutRef.current) {
      clearTimeout(stuckTimeoutRef.current);
      stuckTimeoutRef.current = null;
    }
    if (navFallbackRef.current) {
      clearTimeout(navFallbackRef.current);
      navFallbackRef.current = null;
    }
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    pendingHrefRef.current = null;
  }, []);

  /** Complete the bar (100%) and fade it out. Idempotent. */
  const finish = React.useCallback(() => {
    clearTimers();
    if (!shownRef.current) {
      // The route changed inside the grace window — nothing was shown, so
      // nothing to animate. No fake loading chrome.
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

  /** Arm progress for a navigation; the bar surfaces only if it takes time. */
  const start = React.useCallback(
    (initial = 25, href?: string) => {
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

      if (href) {
        pendingHrefRef.current = href;
        navFallbackRef.current = setTimeout(() => {
          navFallbackRef.current = null;
          const pending = pendingHrefRef.current;
          pendingHrefRef.current = null;
          if (!pending) return;
          // A dialog/sheet owns the click — leave the user where they are.
          if (isOverlayOpen()) return;
          let target: URL;
          try {
            target = new URL(pending, window.location.href);
          } catch {
            return;
          }
          const current = `${window.location.pathname}${window.location.search}`;
          if (`${target.pathname}${target.search}` === current) return;
          // The router never moved — honour the click with a real navigation.
          window.location.assign(target.href);
        }, NAV_FALLBACK_MS);
      }

      // Failsafe: the bar itself never sticks.
      stuckTimeoutRef.current = setTimeout(finish, STUCK_TIMEOUT_MS);
    },
    [clearTimers, finish],
  );

  // When pathname or searchParams change, complete the bar and fade out.
  React.useEffect(() => {
    if (visible) finish();
    return () => {
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `visible` is read at change time only
  }, [pathname, searchParams]);

  // Intercept anchor clicks to arm progress immediately.
  React.useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
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

      start(25, href);
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
