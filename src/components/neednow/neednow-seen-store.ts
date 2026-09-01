/**
 * Client-side seen/read tracking for Need Now story viewer.
 * Stores viewed request IDs in localStorage so previously seen items
 * show as "watched" (filled progress bar) when the viewer reopens.
 *
 * Mirrors Flutter's `NeedNowSeenStore` — no backend call, purely local.
 */

const STORAGE_KEY = 'neednow_seen_ids';

function readSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // quota exceeded — swallow
  }
}

/** Mark one or more request IDs as seen. */
export function markSeen(id: string): void {
  const ids = readSeen();
  ids.add(id);
  writeSeen(ids);
}

/** Check whether a request ID has been seen. */
export function isSeen(id: string): boolean {
  return readSeen().has(id);
}

/** Return the full set of seen IDs (for progress bar pre-fill). */
export function getSeenIds(): Set<string> {
  return readSeen();
}
