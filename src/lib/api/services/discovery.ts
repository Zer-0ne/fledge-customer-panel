/**
 * Discovery API Service
 * Handles data fetching for Colleges, Campuses, Listings, Properties, and Public Profiles.
 */

import { apiFetch } from '@/lib/api/client';
import {
  College,
  Campus,
  Listing,
  Property,
  PropertyAddress,
  PublicUser,
  PaginatedResponse,
  ListingFilterParams,
} from '@/types';
import { buildListingsQueryString } from '@/lib/listings/filters';

/**
 * Fetches all registered colleges.
 */
export async function fetchColleges(): Promise<College[]> {
  try {
    const res = await apiFetch<College[] | { data: College[] } | { items: College[] }>({
      path: '/api/v1/colleges',
      method: 'GET',
    });

    if (Array.isArray(res)) return res;
    if ('data' in res && Array.isArray(res.data)) return res.data;
    if ('items' in res && Array.isArray(res.items)) return res.items;
    return [];
  } catch (error) {
    console.error('Failed to fetch colleges:', error);
    return [];
  }
}

/**
 * Fetches campuses for a specific college.
 */
export async function fetchCampuses(collegeId: string): Promise<Campus[]> {
  if (!collegeId) return [];
  try {
    const res = await apiFetch<Campus[] | { data: Campus[] } | { items: Campus[] }>({
      path: `/api/v1/colleges/${collegeId}/campuses`,
      method: 'GET',
    });

    let campuses: Campus[] = [];
    if (Array.isArray(res)) campuses = res;
    else if ('data' in res && Array.isArray(res.data)) campuses = res.data;
    else if ('items' in res && Array.isArray(res.items)) campuses = res.items;

    // Normalize coordinates (may come as strings from some backends)
    return campuses.map((c) => ({
      ...c,
      latitude: c.latitude !== undefined ? Number(c.latitude) : undefined,
      longitude: c.longitude !== undefined ? Number(c.longitude) : undefined,
    }));
  } catch (error) {
    console.error(`Failed to fetch campuses for college ${collegeId}:`, error);
    return [];
  }
}

/**
 * Parses a coordinate value that may be a number or a numeric string.
 */
function parseCoordinate(val: unknown): number | undefined {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return Number(val);
  return undefined;
}

/**
 * Normalizes an approximateLocation object, handling string coordinates
 * and alternative field names (lat/lng, lat/lon).
 */
export function normalizeApproximateLocation(
  loc: unknown
): { latitude?: number; longitude?: number } | undefined {
  if (!loc || typeof loc !== 'object') return undefined;
  const obj = loc as Record<string, unknown>;

  const latitude = parseCoordinate(obj.latitude ?? obj.lat);
  const longitude = parseCoordinate(obj.longitude ?? obj.lng ?? obj.lon);

  return { latitude, longitude };
}

export function normalizeListingItem(raw: unknown): Listing {
  if (!raw || typeof raw !== "object") return raw as Listing;
  const obj = raw as Record<string, unknown>;

  let rent = 0;
  const rawRent = obj.monthlyRentPaise ?? obj.rentPaise ?? obj.rent_paise;
  if (typeof rawRent === "number" && !isNaN(rawRent)) {
    rent = rawRent;
  } else if (typeof rawRent === "string" && !isNaN(Number(rawRent)) && rawRent.trim() !== "") {
    rent = Number(rawRent);
  } else if (typeof obj.rent === "number" && !isNaN(obj.rent)) {
    rent = obj.rent * 100;
  } else if (typeof obj.rent === "string" && !isNaN(Number(obj.rent)) && obj.rent.trim() !== "") {
    rent = Number(obj.rent) * 100;
  }

  let deposit = 0;
  const rawDeposit = obj.securityDepositPaise ?? obj.depositPaise ?? obj.deposit_paise;
  if (typeof rawDeposit === "number" && !isNaN(rawDeposit)) {
    deposit = rawDeposit;
  } else if (typeof rawDeposit === "string" && !isNaN(Number(rawDeposit)) && rawDeposit.trim() !== "") {
    deposit = Number(rawDeposit);
  } else if (typeof obj.deposit === "number" && !isNaN(obj.deposit)) {
    deposit = obj.deposit * 100;
  } else if (typeof obj.deposit === "string" && !isNaN(Number(obj.deposit)) && obj.deposit.trim() !== "") {
    deposit = Number(obj.deposit) * 100;
  }

  // Normalize property.approximateLocation if embedded in the listing response
  let normalizedProperty = obj.property;
  if (obj.property && typeof obj.property === 'object') {
    const prop = { ...(obj.property as Record<string, unknown>) };
    if (prop.approximateLocation !== undefined) {
      prop.approximateLocation = normalizeApproximateLocation(prop.approximateLocation);
    }
    normalizedProperty = prop;
  }

  return {
    ...obj,
    property: normalizedProperty,
    monthlyRentPaise: rent,
    securityDepositPaise: deposit,
  } as unknown as Listing;
}

/**
 * Fetches published listings based on filter criteria.
 */
export async function fetchListings(
  params: ListingFilterParams = {}
): Promise<PaginatedResponse<Listing>> {
  try {
    const queryString = buildListingsQueryString(params);
    const res = await apiFetch<PaginatedResponse<Listing> | Listing[] | { data: Listing[]; nextCursor?: string }>({
      path: `/api/v1/listings${queryString}`,
      method: 'GET',
    });

    let items: Listing[] = [];
    let nextCursor: string | null = null;
    let totalCount: number | undefined = undefined;

    if (Array.isArray(res)) {
      items = res.map(normalizeListingItem);
    } else if ('items' in res && Array.isArray(res.items)) {
      items = res.items.map(normalizeListingItem);
      nextCursor = res.nextCursor || null;
      totalCount = res.totalCount;
    } else if ('data' in res && Array.isArray(res.data)) {
      items = res.data.map(normalizeListingItem);
      nextCursor = res.nextCursor || null;
    }

    return { items, nextCursor, totalCount };
  } catch (error) {
    console.error('Failed to fetch listings:', error);
    return { items: [], nextCursor: null };
  }
}

/**
 * Fetches public details of a single listing.
 */
export async function fetchListingDetail(id: string): Promise<Listing | null> {
  if (!id) return null;
  try {
    const res = await apiFetch<Listing | { data: Listing }>({
      path: `/api/v1/listings/${id}`,
      method: 'GET',
    });

    const raw = 'data' in res ? res.data : res;
    return raw ? normalizeListingItem(raw) : null;
  } catch (error) {
    console.error(`Failed to fetch listing ${id}:`, error);
    return null;
  }
}

/**
 * Fetches public details of a property.
 */
export async function fetchPropertyDetail(id: string): Promise<Property | null> {
  if (!id) return null;
  try {
    const res = await apiFetch<Property | { data: Property }>({
      path: `/api/v1/properties/${id}`,
      method: 'GET',
    });

    const property = ('data' in res ? res.data : res) as Property;
    if (property && property.approximateLocation !== undefined) {
      property.approximateLocation = normalizeApproximateLocation(property.approximateLocation);
    }
    return property ?? null;
  } catch (error) {
    console.error(`Failed to fetch property ${id}:`, error);
    return null;
  }
}

/**
 * Fetches exact address of a property (requires authorization).
 */
export async function fetchExactPropertyAddress(
  id: string,
  accessToken?: string
): Promise<PropertyAddress | null> {
  if (!id) return null;
  try {
    const res = await apiFetch<PropertyAddress | { data: PropertyAddress }>({
      path: `/api/v1/properties/${id}/exact-address`,
      method: 'GET',
      accessToken,
    });

    if ('data' in res) return res.data;
    return res as PropertyAddress;
  } catch (error) {
    console.error(`Failed to fetch exact address for property ${id}:`, error);
    throw error;
  }
}

/**
 * Fetches public details of a user.
 */
export async function fetchPublicUser(userId: string): Promise<PublicUser | null> {
  if (!userId) return null;
  try {
    const res = await apiFetch<PublicUser | { data: PublicUser }>({
      path: `/api/v1/users/${userId}/public`,
      method: 'GET',
    });

    if ('data' in res) return res.data;
    return res as PublicUser;
  } catch (error) {
    console.error(`Failed to fetch public user ${userId}:`, error);
    return null;
  }
}

export { toggleListingFavorite } from './favorites';
export { submitListingInterest } from './interests';

