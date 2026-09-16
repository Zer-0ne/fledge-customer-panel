import { describe, expect, it } from 'vitest';
import {
  PUSH_PROMPT_DISMISS_WINDOW_MS,
  readPushPromptDismissedAt,
  shouldShowEnableBanner,
} from './push-prompt-banner';

const NOW = Date.UTC(2026, 8, 16, 6, 0, 0);

const base = {
  configured: true,
  supported: true,
  active: false,
  permission: 'default' as const,
  dismissedAt: 0,
  now: NOW,
};

describe('shouldShowEnableBanner', () => {
  it('shows on a fresh browser profile (never dismissed, permission undecided)', () => {
    expect(shouldShowEnableBanner(base)).toBe(true);
  });

  it('stays hidden when the Firebase config is missing (whole push module disabled)', () => {
    expect(shouldShowEnableBanner({ ...base, configured: false })).toBe(false);
  });

  it('stays hidden when the browser cannot do push at all', () => {
    expect(shouldShowEnableBanner({ ...base, supported: false })).toBe(false);
  });

  it('stays hidden once web push is active (token registered)', () => {
    expect(shouldShowEnableBanner({ ...base, active: true })).toBe(false);
  });

  it('stays hidden after the user denied the OS permission (cannot re-ask)', () => {
    expect(shouldShowEnableBanner({ ...base, permission: 'denied' })).toBe(false);
  });

  it('still shows when permission is granted but no token is registered', () => {
    // Permission granted + subscription flag missing: "Turn on" re-registers.
    expect(shouldShowEnableBanner({ ...base, permission: 'granted' })).toBe(true);
  });

  it('hides for the dismiss window, then returns', () => {
    expect(
      shouldShowEnableBanner({ ...base, dismissedAt: NOW - 60_000 }),
    ).toBe(false);
    expect(
      shouldShowEnableBanner({
        ...base,
        dismissedAt: NOW - PUSH_PROMPT_DISMISS_WINDOW_MS + 60_000,
      }),
    ).toBe(false);
    expect(
      shouldShowEnableBanner({
        ...base,
        dismissedAt: NOW - PUSH_PROMPT_DISMISS_WINDOW_MS,
      }),
    ).toBe(true);
    expect(
      shouldShowEnableBanner({
        ...base,
        dismissedAt: NOW - PUSH_PROMPT_DISMISS_WINDOW_MS - 60_000,
      }),
    ).toBe(true);
  });
});

describe('readPushPromptDismissedAt', () => {
  it('returns 0 when nothing is stored', () => {
    expect(readPushPromptDismissedAt({ getItem: () => null })).toBe(0);
  });

  it('returns the stored epoch-ms timestamp', () => {
    expect(readPushPromptDismissedAt({ getItem: () => String(NOW) })).toBe(NOW);
  });

  it('falls back to 0 on unparseable values instead of NaN', () => {
    expect(readPushPromptDismissedAt({ getItem: () => 'not-a-number' })).toBe(0);
  });
});
