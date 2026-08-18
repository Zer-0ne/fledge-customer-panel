/**
 * Session lifecycle tracker for Next.js analytics.
 * Tracks session start, pause (visibility hidden), resume, and end.
 * 30-minute inactivity timeout — session expires if tab hidden > 30min.
 */

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MIN_ENGAGED_SESSION_MS = 10_000; // 10 seconds

let currentSessionId: string | null = null;
let anonymousId = '';
let sessionStarted: Date | null = null;
let lastActiveAt: Date | null = null;
let activeDurationMs = 0;
let isPaused = false;

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('analytics_anonymous_id');
  if (!id) {
    id = generateId();
    localStorage.setItem('analytics_anonymous_id', id);
  }
  anonymousId = id;
  return id;
}

export function getSessionId(): string {
  return currentSessionId ?? '';
}

export function startSession(): string {
  currentSessionId = generateId();
  sessionStarted = new Date();
  lastActiveAt = new Date();
  activeDurationMs = 0;
  isPaused = false;
  return currentSessionId;
}

/** Check if session expired during background (> 30min). */
function sessionExpired(): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - lastActiveAt.getTime() > INACTIVITY_TIMEOUT_MS;
}

/** Resume session. Returns inactive duration or null if no change. */
export function resumeSession(): { inactiveDurationMs: number; sessionRecreated: boolean } | null {
  if (!currentSessionId) return null;

  if (sessionExpired()) {
    // Session expired — end it and create new one.
    endSession();
    startSession();
    return { inactiveDurationMs: 0, sessionRecreated: true };
  }

  if (isPaused) {
    const now = new Date();
    const inactiveMs = lastActiveAt ? now.getTime() - lastActiveAt.getTime() : 0;
    lastActiveAt = now;
    isPaused = false;
    return { inactiveDurationMs: inactiveMs, sessionRecreated: false };
  }
  return null;
}

/** Pause session (tab hidden). */
export function pauseSession(): number | null {
  if (!currentSessionId || isPaused) return null;
  const now = new Date();
  if (lastActiveAt) {
    activeDurationMs += now.getTime() - lastActiveAt.getTime();
  }
  lastActiveAt = now;
  isPaused = true;
  return activeDurationMs;
}

/** End session. Returns session data or null. */
export function endSession(): { sessionId: string; totalDurationMs: number; activeDurationMs: number; isValid: boolean } | null {
  if (!currentSessionId) return null;
  const totalMs = sessionStarted ? Date.now() - sessionStarted.getTime() : 0;
  if (lastActiveAt && !isPaused) {
    activeDurationMs += Date.now() - lastActiveAt.getTime();
  }
  const result = {
    sessionId: currentSessionId,
    totalDurationMs: totalMs,
    activeDurationMs,
    isValid: activeDurationMs >= MIN_ENGAGED_SESSION_MS,
  };
  currentSessionId = null;
  sessionStarted = null;
  lastActiveAt = null;
  activeDurationMs = 0;
  isPaused = false;
  return result;
}

export function setUserId(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('analytics_user_id', userId);
  }
}

export function clearUserId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('analytics_user_id');
    const newId = generateId();
    localStorage.setItem('analytics_anonymous_id', newId);
    anonymousId = newId;
  }
}
