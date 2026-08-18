/**
 * In-memory impression deduplication.
 * Ensures each ad selection token fires at most one impression per page session.
 */

const impressedTokens = new Set<string>();

/**
 * Returns true if this token has not yet recorded an impression.
 */
export function shouldRecordImpression(token: string | null | undefined): boolean {
  if (!token) return false;
  return !impressedTokens.has(token);
}

/**
 * Marks a token as impressed so subsequent observers skip the event.
 */
export function markImpressionRecorded(token: string): void {
  if (token) {
    impressedTokens.add(token);
  }
}

/**
 * Clears tracked tokens. Intended for unit tests only.
 */
export function resetImpressionTracker(): void {
  impressedTokens.clear();
}

export function hasRecordedImpression(token: string): boolean {
  return impressedTokens.has(token);
}
