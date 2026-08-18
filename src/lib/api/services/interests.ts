/**
 * Listing Interests API Service
 * Handles inquiry creation, interest listing, status transitions, and conversation initiation.
 * Reference: OpenAPI specification (`docs/openai.json`) -> `/api/v1/listings/{id}/interests`, `/api/v1/listing-interests`, `/api/v1/listing-interests/{id}`
 */

import { apiFetch } from '@/lib/api/client';
import { ListingInterest } from '@/types';

export interface GroupedListingInterests {
  incoming: ListingInterest[];
  outgoing: ListingInterest[];
}

/**
 * Normalizes raw API response into grouped incoming & outgoing listing interests.
 */
export function normalizeListingInterestsResponse(res: unknown): GroupedListingInterests {
  if (!res) return { incoming: [], outgoing: [] };

  if (typeof res === 'object' && res !== null && 'incoming' in res && 'outgoing' in res) {
    const obj = res as { incoming?: unknown[]; outgoing?: unknown[] };
    return {
      incoming: Array.isArray(obj.incoming) ? obj.incoming.map(mapRawToInterest) : [],
      outgoing: Array.isArray(obj.outgoing) ? obj.outgoing.map(mapRawToInterest) : [],
    };
  }

  let items: unknown[] = [];
  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    if ('data' in res && Array.isArray((res as { data: unknown[] }).data)) {
      items = (res as { data: unknown[] }).data;
    } else if ('items' in res && Array.isArray((res as { items: unknown[] }).items)) {
      items = (res as { items: unknown[] }).items;
    }
  }

  const normalized = items.map(mapRawToInterest);

  const incoming: ListingInterest[] = [];
  const outgoing: ListingInterest[] = [];

  for (const item of normalized) {
    if (item.direction === 'incoming') {
      incoming.push(item);
    } else {
      outgoing.push(item);
    }
  }

  return { incoming, outgoing };
}

function mapRawToInterest(item: unknown): ListingInterest {
  const raw = item as Record<string, unknown>;
  const status = (raw.status as ListingInterest['status']) || 'pending';
  const direction = (raw.direction as ListingInterest['direction']) || 'outgoing';

  return {
    id: String(raw.id || ''),
    listingId: String(raw.listingId || ''),
    listing: raw.listing ? (raw.listing as ListingInterest['listing']) : undefined,
    userId: String(raw.userId || ''),
    user: raw.user ? (raw.user as ListingInterest['user']) : undefined,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    status,
    direction,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
}

/**
 * Expresses interest in a rental listing with an optional custom note/message.
 */
export async function submitListingInterest(
  listingId: string,
  message?: string
): Promise<ListingInterest> {
  if (!listingId) {
    throw new Error('Listing ID is required');
  }

  const res = await apiFetch<unknown>({
    path: `/api/v1/listings/${listingId}/interests`,
    method: 'POST',
    body: {
      message: message || 'Hi! I am interested in this flat listing.',
    },
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToInterest(raw || { listingId, message, status: 'pending' });
}

/**
 * Fetches all incoming and outgoing listing interest requests for the logged-in user.
 */
export async function fetchListingInterests(): Promise<GroupedListingInterests> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/listing-interests',
      method: 'GET',
    });

    return normalizeListingInterestsResponse(res);
  } catch (error) {
    console.error('Failed to fetch listing interests:', error);
    return { incoming: [], outgoing: [] };
  }
}

/**
 * Updates the status of a listing interest request (accept, reject, or withdraw).
 */
export async function updateListingInterestStatus(
  interestId: string,
  status: 'accepted' | 'rejected' | 'withdrawn'
): Promise<ListingInterest> {
  if (!interestId) {
    throw new Error('Interest ID is required');
  }

  const res = await apiFetch<unknown>({
    path: `/api/v1/listing-interests/${interestId}`,
    method: 'PATCH',
    body: { status },
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToInterest(raw || { id: interestId, status });
}

/**
 * Initiates a conversation thread for an accepted listing interest.
 */
export async function startConversationFromInterest(
  interestId: string
): Promise<{ id: string }> {
  if (!interestId) {
    throw new Error('Interest ID is required to start conversation');
  }

  const res = await apiFetch<unknown>({
    path: '/api/v1/conversations',
    method: 'POST',
    body: {
      contextType: 'listing_interest',
      contextId: interestId,
    },
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as { id?: string };

  return { id: raw?.id || interestId };
}
