/**
 * Favorites API Service
 * Handles data fetching and mutation for Saved/Favorite Listings.
 * Reference: OpenAPI specification (`docs/openai.json`) -> `/api/v1/favorites` and `/api/v1/listings/{id}/favorite`
 */

import { apiFetch } from '@/lib/api/client';
import { Favorite, Listing } from '@/types';

/**
 * Normalizes API response payload into Favorite array.
 */

function normalizeFavoritesResponse(res: unknown): Favorite[] {
  if (!res) return [];

  let items: unknown[] = [];
  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    if ('data' in res && Array.isArray((res as { data: unknown[] }).data)) {
      items = (res as { data: unknown[] }).data;
    } else if ('items' in res && Array.isArray((res as { items: unknown[] }).items)) {
      items = (res as { items: unknown[] }).items;
    } else if ('favorites' in res && Array.isArray((res as { favorites: unknown[] }).favorites)) {
      items = (res as { favorites: unknown[] }).favorites;
    }
  }

  return items.map((item, index) => {
    const raw = item as Record<string, unknown>;
    // Handle case where item is a Listing object directly or a Favorite wrapper object
    if (raw.title && raw.monthlyRentPaise) {
      const listing = raw as unknown as Listing;
      return {
        id: `fav-${listing.id || index}`,
        userId: '',
        listingId: listing.id,
        listing,
        createdAt: listing.createdAt || new Date().toISOString(),
      };
    }

    const listing = (raw.listing || raw.listingDetails || raw) as Listing;
    return {
      id: String(raw.id || `fav-${index}`),
      userId: String(raw.userId || ''),
      listingId: String(raw.listingId || listing?.id || ''),
      listing: listing || (raw as unknown as Listing),
      createdAt: String(raw.createdAt || new Date().toISOString()),
    };
  });
}

/**
 * Fetches user's saved/favorite listings.
 */
export async function fetchFavorites(): Promise<Favorite[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/favorites',
      method: 'GET',
    });

    return normalizeFavoritesResponse(res);
  } catch (error) {
    console.error('Failed to fetch favorites:', error);
    return [];
  }
}

/**
 * Toggles favorite state of a listing (saves or removes from user favorites).
 */
export async function toggleListingFavorite(
  listingId: string,
  currentlyFavorited: boolean
): Promise<boolean> {
  if (!listingId) {
    throw new Error('Listing ID is required');
  }

  const method = currentlyFavorited ? 'DELETE' : 'POST';
  const path = `/api/v1/listings/${listingId}/favorite`;

  await apiFetch<unknown>({
    path,
    method,
  });

  return !currentlyFavorited;
}
