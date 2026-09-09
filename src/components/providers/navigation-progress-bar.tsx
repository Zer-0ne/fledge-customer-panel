'use client';

/**
 * Navigation Progress Bar — sleek top-of-screen route progress indicator.
 * Provides immediate visual feedback on internal navigation clicks and route changes.
 */
import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // When pathname or searchParams change, complete the bar and fade out
  React.useEffect(() => {
    if (visible) {
      setProgress(100);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      cleanupTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }
    return () => {
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
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

      // Start progress bar
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);

      setVisible(true);
      setProgress(25);

      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 65) return prev + Math.random() * 12 + 6;
          if (prev < 88) return prev + Math.random() * 4 + 1;
          return prev;
        });
      }, 160);
    };

    const handlePopState = () => {
      setVisible(true);
      setProgress(40);
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
      window.removeEventListener('popstate', handlePopState);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
  }, []);

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
