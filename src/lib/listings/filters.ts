/**
 * Listing Filter conversion and URL serialization utilities.
 */

import { ListingFilterParams } from '@/types';

/**
 * Converts Indian Rupees (INR) to Paise.
 * Example: 15000 -> 1500000
 */
export function rupeesToPaise(rupees: number | string | null | undefined): number | undefined {
  if (rupees === null || rupees === undefined || rupees === '') return undefined;
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num) || num < 0) return undefined;
  return Math.round(num * 100);
}

/**
 * Converts Paise to Indian Rupees (INR).
 * Example: 1500000 -> 15000
 */
export function paiseToRupees(paise: number | null | undefined): number | undefined {
  if (paise === null || paise === undefined || isNaN(paise)) return undefined;
  return Math.round(paise / 100);
}

/**
 * Parses URL search parameters or query objects into standard ListingFilterParams.
 */
export function parseListingFilterParams(
  searchParams: Record<string, string | string[] | undefined>
): ListingFilterParams {
  const getSingle = (key: string): string | undefined => {
    const val = searchParams[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const collegeId = getSingle('collegeId');
  const campusId = getSingle('campusId');
  const query = getSingle('query');
  const cursor = getSingle('cursor');
  const furnishing = getSingle('furnishing');
  const genderPreference = getSingle('genderPreference');

  const minRentStr = getSingle('minRent');
  const maxRentStr = getSingle('maxRent');
  const bedroomsStr = getSingle('bedrooms');
  const bathroomsStr = getSingle('bathrooms');
  const limitStr = getSingle('limit');
  const latStr = getSingle('latitude') || getSingle('lat');
  const lngStr = getSingle('longitude') || getSingle('lng');
  const radiusStr = getSingle('radiusMeters') || getSingle('radius');

  const minRentPaise = minRentStr ? rupeesToPaise(minRentStr) : undefined;
  const maxRentPaise = maxRentStr ? rupeesToPaise(maxRentStr) : undefined;
  const bedrooms = bedroomsStr ? parseInt(bedroomsStr, 10) : undefined;
  const bathrooms = bathroomsStr ? parseInt(bathroomsStr, 10) : undefined;
  const limit = limitStr ? parseInt(limitStr, 10) : 20;
  const latitude = latStr ? parseFloat(latStr) : undefined;
  const longitude = lngStr ? parseFloat(lngStr) : undefined;
  const radiusMeters = radiusStr ? parseFloat(radiusStr) : undefined;

  return {
    collegeId: collegeId || undefined,
    campusId: campusId || undefined,
    query: query || undefined,
    cursor: cursor || undefined,
    furnishing: furnishing || undefined,
    genderPreference: genderPreference || undefined,
    minRentPaise: minRentPaise !== undefined && !isNaN(minRentPaise) ? minRentPaise : undefined,
    maxRentPaise: maxRentPaise !== undefined && !isNaN(maxRentPaise) ? maxRentPaise : undefined,
    bedrooms: bedrooms !== undefined && !isNaN(bedrooms) ? bedrooms : undefined,
    bathrooms: bathrooms !== undefined && !isNaN(bathrooms) ? bathrooms : undefined,
    latitude: latitude !== undefined && !isNaN(latitude) ? latitude : undefined,
    longitude: longitude !== undefined && !isNaN(longitude) ? longitude : undefined,
    radiusMeters: radiusMeters !== undefined && !isNaN(radiusMeters) ? radiusMeters : undefined,
    limit: !isNaN(limit) && limit > 0 ? limit : 20,
  };
}

/**
 * Serializes ListingFilterParams into URL query parameters (rupees instead of paise for user clarity).
 */
export function serializeListingFilterParams(params: ListingFilterParams): Record<string, string> {
  const result: Record<string, string> = {};

  if (params.collegeId) result.collegeId = params.collegeId;
  if (params.campusId) result.campusId = params.campusId;
  if (params.query) result.query = params.query;
  if (params.cursor) result.cursor = params.cursor;
  if (params.furnishing) result.furnishing = params.furnishing;
  if (params.genderPreference) result.genderPreference = params.genderPreference;

  if (params.minRentPaise !== undefined) {
    const minRupees = paiseToRupees(params.minRentPaise);
    if (minRupees !== undefined) result.minRent = String(minRupees);
  }

  if (params.maxRentPaise !== undefined) {
    const maxRupees = paiseToRupees(params.maxRentPaise);
    if (maxRupees !== undefined) result.maxRent = String(maxRupees);
  }

  if (params.bedrooms !== undefined) result.bedrooms = String(params.bedrooms);
  if (params.bathrooms !== undefined) result.bathrooms = String(params.bathrooms);
  if (params.latitude !== undefined) result.latitude = String(params.latitude);
  if (params.longitude !== undefined) result.longitude = String(params.longitude);
  if (params.radiusMeters !== undefined) result.radiusMeters = String(params.radiusMeters);
  if (params.limit !== undefined && params.limit !== 20) result.limit = String(params.limit);

  return result;
}

/**
 * Builds a query string for backend/BFF listing search request.
 */
export function buildListingsQueryString(params: ListingFilterParams): string {
  const searchParams = new URLSearchParams();

  if (params.collegeId) searchParams.append('collegeId', params.collegeId);
  if (params.campusId) searchParams.append('campusId', params.campusId);
  if (params.query) searchParams.append('query', params.query);
  if (params.cursor) searchParams.append('cursor', params.cursor);
  if (params.furnishing) searchParams.append('furnishing', params.furnishing);
  if (params.genderPreference) searchParams.append('genderPreference', params.genderPreference);
  if (params.minRentPaise !== undefined) searchParams.append('minRentPaise', String(params.minRentPaise));
  if (params.maxRentPaise !== undefined) searchParams.append('maxRentPaise', String(params.maxRentPaise));
  if (params.bedrooms !== undefined) searchParams.append('bedrooms', String(params.bedrooms));
  if (params.bathrooms !== undefined) searchParams.append('bathrooms', String(params.bathrooms));
  if (params.latitude !== undefined) searchParams.append('latitude', String(params.latitude));
  if (params.longitude !== undefined) searchParams.append('longitude', String(params.longitude));
  if (params.radiusMeters !== undefined) searchParams.append('radiusMeters', String(params.radiusMeters));
  if (params.limit !== undefined) searchParams.append('limit', String(params.limit));

  const str = searchParams.toString();
  return str ? `?${str}` : '';
}
