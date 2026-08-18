/**
 * Error capture for analytics — catches unhandled errors and Promise rejections.
 * Reports as client_error_recorded / app_crash_recorded events.
 */

import { track } from './analytics-client';

let initialized = false;

/** Initialize error capturing. */
export function initializeErrorCapture(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Unhandled errors.
  window.addEventListener('error', (event) => {
    const error = event.error ?? event.message;
    const errorType = typeof error === 'string' ? 'error_event' : 'unhandled_error';
    const screen = typeof document !== 'undefined' ? document.title : 'unknown';

    track('client_error_recorded', {
      errorType,
      screenName: screen,
      stackFingerprint: stackFingerprint(error instanceof Error ? (error.stack ?? error.message) : String(error)),
    });
  });

  // Unhandled Promise rejections.
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const screen = typeof document !== 'undefined' ? document.title : 'unknown';

    track('app_crash_recorded', {
      errorType: 'unhandled_rejection',
      screenName: screen,
      stackFingerprint: stackFingerprint(reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)),
    });
  });
}

/** Create a stable fingerprint from stack trace. */
function stackFingerprint(stack: string): string {
  const frames = stack.split('\n').filter((l) => l.trim()).slice(0, 3).join('|');
  return frames ? hashCode(frames).toString(16) : 'empty';
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
