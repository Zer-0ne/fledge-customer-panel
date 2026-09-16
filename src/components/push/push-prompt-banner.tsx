'use client';

import * as React from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InfoBanner } from '@/components/ui/info-banner';
import { showToast } from '@/components/ui/toast';
import {
  enableWebPush,
  isWebPushActive,
  isWebPushConfigured,
  isWebPushSupported,
} from '@/lib/push/push-notifications';

/** localStorage key holding the epoch-ms timestamp of the last dismissal. */
export const PUSH_PROMPT_DISMISS_KEY = 'push_prompt_dismissed_at';
/** Dismissed banners stay hidden for a week, then re-prompt once. */
export const PUSH_PROMPT_DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface EnableBannerState {
  /** Firebase web config present (missing env disables the whole push module). */
  configured: boolean;
  /** Browser supports service workers + Push + Notification. */
  supported: boolean;
  /** This browser already registered a token (permission granted + flag set). */
  active: boolean;
  permission: NotificationPermission;
  /** Epoch ms of the last dismissal (0 = never dismissed). */
  dismissedAt: number;
  now: number;
}

/**
 * Visibility rule for the enable-notifications prompt. Pure so it can be
 * tested without a DOM: hidden when push cannot work (unconfigured,
 * unsupported, already active), when the OS permission was denied (a denied
 * prompt cannot be re-asked from the app), and during the 7-day window after
 * the user dismissed it.
 */
export function shouldShowEnableBanner(state: EnableBannerState): boolean {
  if (!state.configured || !state.supported || state.active) return false;
  if (state.permission === 'denied') return false;
  return state.now - state.dismissedAt >= PUSH_PROMPT_DISMISS_WINDOW_MS;
}

/** Reads the dismissal timestamp; unparseable values fall back to 0 (never NaN). */
export function readPushPromptDismissedAt(storage: Pick<Storage, 'getItem'>): number {
  const raw = Number(storage.getItem(PUSH_PROMPT_DISMISS_KEY) ?? '0');
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/**
 * WhatsApp-Web-style prompt: notifications are ON by default everywhere except
 * browser permission, which legally needs a user gesture. Shown once (per 7
 * days) until push is active or the user dismisses it.
 */
export function PushPromptBanner() {
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    // Hidden on public pages — only show after login. Auth state lives in the
    // HttpOnly cp_access_token cookie (not readable from JS), so we ask the
    // lightweight bootstrap endpoint once: 200 → logged in, else public page.
    // /api/v1/auth/bootstrap is cached + cheap (<2ms on the panel side).
    void fetch('/api/v1/auth/bootstrap', { credentials: 'include', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) return;
        const supported = isWebPushSupported();
        const shouldShow = shouldShowEnableBanner({
          configured: isWebPushConfigured(),
          supported,
          active: isWebPushActive(),
          permission: supported ? Notification.permission : 'denied',
          dismissedAt: readPushPromptDismissedAt(window.localStorage),
          now: Date.now(),
        });
        if (shouldShow) setVisible(true);
      })
      .catch(() => { /* offline / CORS — silently hide */ });
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable (private mode quota) — banner simply re-appears next load.
    }
    setVisible(false);
  };

  const handleEnable = async () => {
    setBusy(true);
    // enableWebPush must run inside the click gesture — the browser only shows
    // the OS permission dialog from a user interaction.
    const result = await enableWebPush();
    setBusy(false);
    setVisible(!result.ok);
    if (!result.ok) {
      showToast({
        title: 'Could not enable push',
        description: result.message ?? 'Please check your browser settings.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
      <InfoBanner
        tone="info"
        icon={<Bell className="size-4" />}
        description="Turn on notifications to get updates about your posts, messages and requests."
        action={
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void handleEnable()}
              className="rounded-lg"
            >
              {busy ? 'Turning on…' : 'Turn on'}
            </Button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="rounded p-1 text-current/60 transition-colors hover:bg-current/10 hover:text-current"
            >
              <X className="size-3.5" />
            </button>
          </>
        }
      />
    </div>
  );
}
