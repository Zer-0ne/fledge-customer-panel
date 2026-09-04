/**
 * Unverified posting limits — `src/lib/limits/unverified-limits.ts`
 *
 * Caps are admin-controlled (housing_config) and MUST come from the backend
 * (`GET /api/v1/housing/limits`) — never hardcoded in the UI. The backend
 * also returns `current`/`max` inside limit errors; those win when present.
 */

import { apiFetch } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

export type LimitKind = 'posts' | 'requests' | 'contacts';

export interface PostingLimits {
  verified: boolean;
  allowed: boolean;
  maxActivePosts: number;
  maxActiveRequests: number;
  maxContactsPerDay: number;
  activePosts: number;
  activeRequests: number;
  contactsToday: number;
}

export const UNVERIFIED_LIMIT_CODES: Record<string, LimitKind> = {
  UNVERIFIED_POST_LIMIT_REACHED: 'posts',
  UNVERIFIED_POSTING_DISABLED: 'posts',
  UNVERIFIED_REQUEST_LIMIT_REACHED: 'requests',
  UNVERIFIED_CONTACT_LIMIT_REACHED: 'contacts',
  UNVERIFIED_CONTACT_DISABLED: 'contacts',
};

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Extracts a limit failure (kind + dynamic numbers) from any thrown error. */
export function parseLimitError(err: unknown): { kind: LimitKind; current: number | null; max: number | null; message: string } | null {
  if (!(err instanceof ApiError) || !err.code) return null;
  const kind = UNVERIFIED_LIMIT_CODES[err.code];
  if (!kind) return null;
  const details = (err.details ?? {}) as Record<string, unknown>;
  return {
    kind,
    current: readNumber(details.current),
    max: readNumber(details.max),
    message: err.message,
  };
}

/** Live caps + usage for the caller. Returns null when the backend is unreachable. */
export async function fetchPostingLimits(): Promise<PostingLimits | null> {
  try {
    return await apiFetch<PostingLimits>({ path: '/api/v1/housing/limits', method: 'GET' });
  } catch {
    return null;
  }
}

const KIND_COPY: Record<LimitKind, { title: string; unit: string; perDay: boolean }> = {
  posts: { title: 'Post limit reached', unit: 'active posts', perDay: false },
  requests: { title: 'Request limit reached', unit: 'active housing requests', perDay: false },
  contacts: { title: 'Daily contact limit reached', unit: 'contacts', perDay: true },
};

/**
 * Dialog copy for a limit failure. `max`/`current` prefer the error body's
 * numbers, falling back to the fetched caps. Posts/requests are standing
 * active slots (paused counts too); contacts reset every 24 hours.
 */
export function limitReachedCopy(
  kind: LimitKind,
  opts: { current?: number | null; max?: number | null; limits?: PostingLimits | null },
): { title: string; body: string } {
  const meta = KIND_COPY[kind];
  const fallbackMax =
    kind === 'posts'
      ? opts.limits?.maxActivePosts
      : kind === 'requests'
        ? opts.limits?.maxActiveRequests
        : opts.limits?.maxContactsPerDay;
  const max = opts.max ?? fallbackMax ?? null;
  const slot = max !== null ? `up to ${max} ${meta.unit}` : meta.unit;
  const window = meta.perDay ? ' per day' : '';
  const usage =
    opts.current !== null && opts.current !== undefined && max !== null
      ? ` You are using ${opts.current} of ${max}.`
      : '';
  return {
    title: meta.title,
    body: `Unverified accounts can keep ${slot}${window}.${usage} Verify your student or faculty status for unlimited posting.`,
  };
}
