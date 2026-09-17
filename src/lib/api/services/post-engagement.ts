/**
 * Post engagement — reveal-capped post contacts + owner-only "N views".
 *
 * A poster attaches a phone number to their own post (roommate / local service /
 * need-now). The number is never in the feed: a viewer unlocks it with an
 * explicit reveal, at most `maxReveals` distinct viewers can (default 5), and
 * the owner gets the audit — who unlocked it, how many times, and when.
 *
 * Endpoints mirror the backend module `src/post-engagement/`.
 */

import { apiFetch } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

export type PostSurface = 'ROOMMATE_POST' | 'SERVICE_PROVIDER' | 'HOUSING_REQUEST';

export interface PostRevealState {
  postId: string;
  /** A number is attached to the post (viewer-facing: no counts leaked). */
  configured: boolean;
  /** All reveal slots are used — nobody else can unlock it. */
  exhausted: boolean;
  /** This caller already unlocked it (re-opening is free). */
  alreadyRevealed: boolean;
  /** This caller owns the post (so the UI shows share/audit, not reveal). */
  ownedByCaller: boolean;
  remainingReveals: number;
  maxReveals: number | null;
}

export interface PostContactAuditViewer {
  viewerId: string;
  displayName: string;
  avatarUrl: string | null;
  viewCount: number;
  firstViewedAt: string;
  lastViewedAt: string;
}

export interface PostContactAudit {
  configured: boolean;
  maxReveals: number | null;
  totalReveals: number;
  remainingReveals: number;
  viewers: PostContactAuditViewer[];
}

export interface PostViewer {
  viewerId: string;
  displayName: string;
  avatarUrl: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface PostViewersResponse {
  viewers: PostViewer[];
  totalViewers: number;
}

function unwrap(response: unknown): Record<string, unknown> {
  const object = (response ?? {}) as Record<string, unknown>;
  const data = object.data && typeof object.data === 'object' ? (object.data as Record<string, unknown>) : object;
  return data;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function mapRevealState(raw: unknown, postId: string): PostRevealState {
  const item = (raw ?? {}) as Record<string, unknown>;
  return {
    postId: asString(item.postId) || postId,
    configured: asBoolean(item.configured),
    exhausted: asBoolean(item.exhausted),
    alreadyRevealed: asBoolean(item.alreadyRevealed),
    ownedByCaller: asBoolean(item.ownedByCaller),
    remainingReveals: asNumber(item.remainingReveals),
    maxReveals: typeof item.maxReveals === 'number' ? item.maxReveals : null,
  };
}

/** Human-readable copy for the reveal/attach errors the API can raise. */
export function friendlyPostContactError(error: unknown): string {
  if (error instanceof ApiError) {
    const code = error.code ?? '';
    if (code === 'REVEAL_LIMIT_REACHED' || error.status === 409) return 'This number is no longer available — all reveal slots have been used.';
    if (error.status === 403) return 'You cannot change the number on this post.';
    if (error.status === 404) return 'The number or post no longer exists.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Try again.';
}

/** GET /post-contacts/state — caller-scoped reveal state for a page of posts. */
export async function fetchRevealStates(surface: PostSurface, postIds: string[]): Promise<Record<string, PostRevealState>> {
  const ids = postIds.filter((id) => typeof id === 'string' && id.length > 0).slice(0, 200);
  if (ids.length === 0) return {};
  const response = await apiFetch<unknown>({
    path: `/api/v1/post-contacts/state?surface=${encodeURIComponent(surface)}&postIds=${encodeURIComponent(ids.join(','))}`,
    method: 'GET',
  });
  const data = unwrap(response);
  const states = (data.states ?? {}) as Record<string, unknown>;
  const mapped: Record<string, PostRevealState> = {};
  for (const [postId, value] of Object.entries(states)) mapped[postId] = mapRevealState(value, postId);
  return mapped;
}

/** PUT /post-contacts/:surface/:postId — owner shares (or replaces) a number. */
export async function attachPostContact(surface: PostSurface, postId: string, phoneNumber: string): Promise<{ revealId: string; maxReveals: number }> {
  const response = await apiFetch<unknown>({
    path: `/api/v1/post-contacts/${surface}/${postId}`,
    method: 'PUT',
    body: { phoneNumber },
  });
  const data = unwrap(response);
  return { revealId: asString(data.revealId), maxReveals: asNumber(data.maxReveals, 5) };
}

/** DELETE /post-contacts/:surface/:postId — owner removes the number (audit stays). */
export async function removePostContact(surface: PostSurface, postId: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/post-contacts/${surface}/${postId}`, method: 'DELETE' });
}

/** POST /post-contacts/:surface/:postId/reveal — unlock the number (one slot per viewer). */
export async function revealPostContact(surface: PostSurface, postId: string): Promise<{ phoneNumber: string; remainingReveals: number; alreadyRevealed: boolean; viewCount: number }> {
  const response = await apiFetch<unknown>({
    path: `/api/v1/post-contacts/${surface}/${postId}/reveal`,
    method: 'POST',
    body: {},
  });
  const data = unwrap(response);
  return {
    phoneNumber: asString(data.phoneNumber),
    remainingReveals: asNumber(data.remainingReveals),
    alreadyRevealed: asBoolean(data.alreadyRevealed),
    viewCount: asNumber(data.viewCount, 1),
  };
}

/** GET /post-contacts/:surface/:postId/audit — owner-only viewers audit. */
export async function fetchPostContactAudit(surface: PostSurface, postId: string): Promise<PostContactAudit> {
  const response = await apiFetch<unknown>({ path: `/api/v1/post-contacts/${surface}/${postId}/audit`, method: 'GET' });
  const data = unwrap(response);
  const rawViewers = Array.isArray(data.viewers) ? (data.viewers as unknown[]) : [];
  return {
    configured: asBoolean(data.configured),
    maxReveals: typeof data.maxReveals === 'number' ? data.maxReveals : null,
    totalReveals: asNumber(data.totalReveals),
    remainingReveals: asNumber(data.remainingReveals),
    viewers: rawViewers.map((raw) => {
      const viewer = (raw ?? {}) as Record<string, unknown>;
      return {
        viewerId: asString(viewer.viewerId),
        displayName: asString(viewer.displayName) || 'User',
        avatarUrl: typeof viewer.avatarUrl === 'string' ? viewer.avatarUrl : null,
        viewCount: asNumber(viewer.viewCount, 1),
        firstViewedAt: asString(viewer.firstViewedAt),
        lastViewedAt: asString(viewer.lastViewedAt),
      };
    }),
  };
}

/** POST /post-views/:surface/:postId/view — record a seen-by (204, fire-and-forget). */
export async function recordPostView(surface: Exclude<PostSurface, 'HOUSING_REQUEST'>, postId: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/post-views/${surface}/${postId}/view`, method: 'POST', body: {} });
}

/** GET /post-views/:surface/:postId/viewers — owner-only seen-by list. */
export async function fetchPostViewers(surface: Exclude<PostSurface, 'HOUSING_REQUEST'>, postId: string): Promise<PostViewersResponse> {
  const response = await apiFetch<unknown>({ path: `/api/v1/post-views/${surface}/${postId}/viewers`, method: 'GET' });
  const data = unwrap(response);
  const rawViewers = Array.isArray(data.viewers) ? (data.viewers as unknown[]) : [];
  const viewers = rawViewers.map((raw) => {
    const viewer = (raw ?? {}) as Record<string, unknown>;
    return {
      viewerId: asString(viewer.viewerId),
      displayName: asString(viewer.displayName) || 'User',
      avatarUrl: typeof viewer.avatarUrl === 'string' ? viewer.avatarUrl : null,
      firstSeenAt: asString(viewer.firstSeenAt),
      lastSeenAt: asString(viewer.lastSeenAt),
    };
  }).sort((a, b) => (new Date(b.lastSeenAt).getTime() || 0) - (new Date(a.lastSeenAt).getTime() || 0));
  const totalRaw = data.totalViewers;
  return { viewers, totalViewers: typeof totalRaw === 'number' ? totalRaw : viewers.length };
}

/** Relative "2h ago" copy for the seen lists. */
export function formatSeenAt(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}
