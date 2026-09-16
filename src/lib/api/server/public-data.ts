import { env } from '@/lib/env';
import { normalizeListingItem } from '@/lib/api/services/discovery';
import type { College, Listing } from '@/types';

/**
 * Server-side reads for the public (signed-out) surfaces.
 *
 * These run in the RSC layer, not in the browser: the landing page must render
 * real inventory on the first paint for a visitor who has no session. The
 * backend allows anonymous reads on `/api/v1/listings` and `/api/v1/colleges`;
 * everything that touches a user (ads, interests, contact details) stays
 * behind the session cookie.
 *
 * Every call degrades to an empty result — a landing page that 500s because
 * the API is briefly down would be worse than one without a listings rail.
 */

const REVALIDATE_SECONDS = 120;

async function backendJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${env.BACKEND_API_BASE_URL}${path}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function unwrapItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

export async function fetchPublicListings(limit = 8, collegeId?: string): Promise<Listing[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (collegeId) params.set('collegeId', collegeId);
  const raw = await backendJson<unknown>(`/api/v1/listings?${params.toString()}`);
  return unwrapItems(raw)
    .map((item) => normalizeListingItem(item))
    .filter((item) => Boolean(item?.id));
}

export async function fetchPublicColleges(): Promise<College[]> {
  const raw = await backendJson<unknown>('/api/v1/colleges');
  return unwrapItems(raw).filter((c): c is College => Boolean(c && typeof c === 'object' && 'name' in c));
}
