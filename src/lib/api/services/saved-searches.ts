/**
 * Saved Searches API Service
 * CRUD + run for `/api/v1/me/saved-searches` (search alert automation).
 * Reference: backend saved-searches module (savedFiltersSchema is strict).
 */

import { apiFetch } from '@/lib/api/client';
import { normalizeListingItem } from '@/lib/api/services/discovery';
import { CreateSavedSearchPayload, Listing, SavedSearch, SavedSearchRunResult, UpdateSavedSearchPayload } from '@/types';

/**
 * Maps a raw saved-search row into a SavedSearch.
 */
export function mapRawToSavedSearch(item: unknown): SavedSearch {
  const raw = (item || {}) as Record<string, unknown>;

  const filtersRaw = (raw.filters ?? {}) as Record<string, unknown>;

  return {
    id: String(raw.id || ''),
    userId: String(raw.userId || ''),
    name: String(raw.name || 'Saved search'),
    filters: {
      query: typeof filtersRaw.query === 'string' ? filtersRaw.query : undefined,
      campusId: typeof filtersRaw.campusId === 'string' ? filtersRaw.campusId : undefined,
      collegeId: typeof filtersRaw.collegeId === 'string' ? filtersRaw.collegeId : undefined,
      minRentPaise:
        typeof filtersRaw.minRentPaise === 'number' ? filtersRaw.minRentPaise : undefined,
      maxRentPaise:
        typeof filtersRaw.maxRentPaise === 'number' ? filtersRaw.maxRentPaise : undefined,
      bedrooms: typeof filtersRaw.bedrooms === 'number' ? filtersRaw.bedrooms : undefined,
      bathrooms: typeof filtersRaw.bathrooms === 'number' ? filtersRaw.bathrooms : undefined,
      furnishing: typeof filtersRaw.furnishing === 'string' ? filtersRaw.furnishing : undefined,
      genderPreference:
        typeof filtersRaw.genderPreference === 'string' ? filtersRaw.genderPreference : undefined,
      petFriendly:
        typeof filtersRaw.petFriendly === 'boolean' ? filtersRaw.petFriendly : undefined,
      minAreaSqft: typeof filtersRaw.minAreaSqft === 'number' ? filtersRaw.minAreaSqft : undefined,
      maxRentPerSqftPaise:
        typeof filtersRaw.maxRentPerSqftPaise === 'number'
          ? filtersRaw.maxRentPerSqftPaise
          : undefined,
      availableBy: typeof filtersRaw.availableBy === 'string' ? filtersRaw.availableBy : undefined,
      moveInFrom: typeof filtersRaw.moveInFrom === 'string' ? filtersRaw.moveInFrom : undefined,
      moveInTo: typeof filtersRaw.moveInTo === 'string' ? filtersRaw.moveInTo : undefined,
      amenityIds: Array.isArray(filtersRaw.amenityIds)
        ? (filtersRaw.amenityIds as unknown[]).map(String)
        : undefined,
    },
    alertEnabled: Boolean(raw.alertEnabled),
    lastMatchedAt: typeof raw.lastMatchedAt === 'string' ? raw.lastMatchedAt : null,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.createdAt || new Date().toISOString()),
  };
}

/**
 * Normalizes saved-searches list payloads (array or envelope).
 */
export function normalizeSavedSearchesResponse(res: unknown): SavedSearch[] {
  if (!res) return [];

  let items: unknown[] = [];
  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) items = obj.data;
    else if (Array.isArray(obj.items)) items = obj.items;
    else if (Array.isArray(obj.savedSearches)) items = obj.savedSearches;
  }

  return items.map(mapRawToSavedSearch);
}

function unwrap<T>(res: unknown): T {
  if (typeof res === 'object' && res !== null && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/**
 * Lists all saved searches for the current user.
 */
export async function fetchSavedSearches(): Promise<SavedSearch[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/me/saved-searches',
    method: 'GET',
  });
  return normalizeSavedSearchesResponse(res);
}

/**
 * Creates a saved search (optionally with alerts enabled).
 */
export async function createSavedSearch(payload: CreateSavedSearchPayload): Promise<SavedSearch> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/me/saved-searches',
    method: 'POST',
    body: payload,
  });
  return mapRawToSavedSearch(unwrap(res));
}

/**
 * Fetches a single saved search.
 */
export async function fetchSavedSearch(id: string): Promise<SavedSearch> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/me/saved-searches/${id}`,
    method: 'GET',
  });
  return mapRawToSavedSearch(unwrap(res));
}

/**
 * Updates a saved search (name / filters / alert toggle).
 */
export async function updateSavedSearch(
  id: string,
  payload: UpdateSavedSearchPayload
): Promise<SavedSearch> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/me/saved-searches/${id}`,
    method: 'PATCH',
    body: payload,
  });
  return mapRawToSavedSearch(unwrap(res));
}

/**
 * Deletes a saved search (204).
 */
export async function deleteSavedSearch(id: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/me/saved-searches/${id}`,
    method: 'DELETE',
  });
}

/**
 * Runs a saved search and returns fresh matching listings.
 */
export async function runSavedSearch(id: string): Promise<SavedSearchRunResult> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/me/saved-searches/${id}/run`,
    method: 'POST',
  });

  const raw = unwrap<Record<string, unknown>>(res);
  const items = normalizeRunItems(raw.items ?? raw.listings);

  return {
    items,
    nextCursor:
      typeof raw.nextCursor === 'string'
        ? raw.nextCursor
        : typeof raw.nextBefore === 'string'
          ? raw.nextBefore
          : null,
    totalCount: typeof raw.totalCount === 'number' ? raw.totalCount : undefined,
    lastMatchedAt: typeof raw.lastMatchedAt === 'string' ? raw.lastMatchedAt : null,
  };
}

function normalizeRunItems(items: unknown): Listing[] {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeListingItem);
}
