'use client';

/**
 * AppUpdatePrompt — the installed app's "Update" button, on every platform.
 *
 * Installed on desktop, Chrome shows its own update affordance and the new
 * build lands on the next reload. Installed on Android/iOS from the browser
 * there is nothing: the PWA (and particularly iOS Safari, which only re-checks
 * its service worker on relaunch) keeps serving the stale shell until the user
 * kills and reopens it. So the app detects the new build itself and offers the
 * same one-tap update everywhere:
 *
 *   1. `/api/version` returns the deployment's build id — a different id than
 *      the one this page booted with means a newer build is live.
 *   2. The service worker is asked to update; a waiting worker also counts.
 *   3. Tapping Update activates the new worker, drops the caches and reloads,
 *      so "everything updates" at once instead of piecemeal.
 *
 * The check runs on boot, on resume (visibilitychange/focus), when the network
 * returns, and on a 20-minute timer while the tab is visible.
 */

import * as React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHECK_INTERVAL_MS = 20 * 60 * 1000;
/** Two checks closer than this are the same "resume" — don't hammer the route. */
const MIN_RECHECK_MS = 30 * 1000;

interface VersionResponse {
  buildId?: string;
}

export function AppUpdatePrompt() {
  const [available, setAvailable] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [applying, setApplying] = React.useState(false);

  /** The build this page was served with; first response wins. */
  const bootBuildRef = React.useRef<string | null>(null);
  const lastCheckRef = React.useRef(0);
  const reloadingRef = React.useRef(false);

  const check = React.useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastCheckRef.current < MIN_RECHECK_MS) return;
    lastCheckRef.current = now;
    try {
      const res = await fetch('/api/version', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) return;
      const data = (await res.json()) as VersionResponse;
      const id = data?.buildId;
      if (!id || id === 'dev') return;
      if (bootBuildRef.current === null) {
        bootBuildRef.current = id;
        return;
      }
      if (id !== bootBuildRef.current) setAvailable(true);
    } catch {
      // Offline or the route is briefly unavailable — the next trigger retries.
    }
  }, []);

  React.useEffect(() => {
    void check(true);

    const onResume = () => {
      if (document.visibilityState !== 'visible') return;
      void check();
    };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('online', onResume);

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void check(true);
    }, CHECK_INTERVAL_MS);

    const onControllerChange = () => {
      // Only auto-reload when the user asked for the update.
      if (reloadingRef.current) window.location.reload();
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      void navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (!registration) return;
          void registration.update().catch(() => undefined);
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            installing?.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                setAvailable(true);
              }
            });
          });
        })
        .catch(() => undefined);
    }

    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('online', onResume);
      window.clearInterval(timer);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      }
    };
  }, [check]);

  const applyUpdate = async () => {
    setApplying(true);
    reloadingRef.current = true;
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }
      // A stale shell would otherwise be re-served after the reload.
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // Whatever failed, the reload below still pulls the new build.
    }
    window.location.reload();
  };

  if (!available || dismissed) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-primary/30 bg-card/95 px-3.5 py-2 shadow-lg backdrop-blur-md">
        <RefreshCw className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="text-xs font-medium text-foreground">New version available</span>
        <Button
          size="sm"
          className="h-7 rounded-full px-3 text-xs"
          onClick={() => void applyUpdate()}
          disabled={applying}
        >
          {applying ? 'Updating…' : 'Update'}
        </Button>
        <button
          type="button"
          aria-label="Dismiss update notice"
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
