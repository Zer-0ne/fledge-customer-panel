/**
 * Need Now (24-hour housing requirements) API Service
 * Contract: `/api/v1/housing-requests`, `/api/v1/housing-request-responses`
 * Every request goes through `apiFetch` (BFF proxy, HttpOnly session cookie).
 */

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { normalizeListingItem } from './discovery';
import {
  CreateNeedNowDraftParams,
  CreateNeedNowResponseParams,
  NeedNowFeedPage,
  NeedNowIntentType,
  NeedNowRequest,
  NeedNowResponse,
  NeedNowResponseStatus,
  NeedNowStatus,
  NeedNowVisibility,
  PreferredRoomType,
  StayDurationType,
  UpdateNeedNowParams,
  Listing,
} from '@/types';

// ─── Human labels (enum → display string) ───────────────────────────────────

export const NEED_NOW_INTENT_LABELS: Record<NeedNowIntentType, string> = {
  SEEKING_PRIVATE_ROOM: 'Private room',
  SEEKING_SHARED_ROOM: 'Shared room',
  SEEKING_FULL_FLAT: 'Full flat',
  SEEKING_PG: 'PG',
  SEEKING_FLATMATES_TO_RENT_TOGETHER: 'Flatmates — search together',
  FLEXIBLE: 'Flexible',
};

export const NEED_NOW_VISIBILITY_LABELS: Record<NeedNowVisibility, string> = {
  EVERYONE_NEARBY: 'Everyone nearby',
  SAME_CAMPUS: 'Same campus',
  VERIFIED_USERS_ONLY: 'Verified users only',
};

export const NEED_NOW_STATUS_LABELS: Record<NeedNowStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  FULFILLED: 'Fulfilled',
  EXPIRED: 'Expired',
  REMOVED: 'Removed',
};

export const STAY_DURATION_LABELS: Record<StayDurationType, string> = {
  LESS_THAN_3_MONTHS: 'Less than 3 months',
  '3_TO_6_MONTHS': '3–6 months',
  '6_TO_12_MONTHS': '6–12 months',
  OVER_12_MONTHS: 'More than 12 months',
  FLEXIBLE: 'Flexible',
};

export const PREFERRED_ROOM_TYPE_LABELS: Record<PreferredRoomType, string> = {
  PRIVATE: 'Private',
  SHARED_2: 'Shared (2)',
  SHARED_3_PLUS: 'Shared (3+)',
  FULL_FLAT: 'Full flat',
};

export const FURNISHING_LABELS: Record<string, string> = {
  FULLY_FURNISHED: 'Fully furnished',
  SEMI_FURNISHED: 'Semi-furnished',
  UNFURNISHED: 'Unfurnished',
  ANY: 'Any',
};

export const OCCUPANCY_LABELS: Record<string, string> = {
  SINGLE: 'Single occupancy',
  DOUBLE: 'Double occupancy',
  TRIPLE_PLUS: 'Triple or more',
  ANY: 'Any',
};

export const STUDENT_WORKING_LABELS: Record<string, string> = {
  STUDENT: 'Students preferred',
  WORKING_PROFESSIONAL: 'Working professionals preferred',
  ANY: 'Any',
};

export const FOOD_PREFERENCE_LABELS: Record<string, string> = {
  VEG: 'Vegetarian',
  NON_VEG: 'Non-vegetarian',
  EGGETARIAN: 'Eggitarian',
  ANY: 'Any',
};

export const SLEEP_SCHEDULE_LABELS: Record<string, string> = {
  EARLY_BIRD: 'Early bird',
  NIGHT_OWL: 'Night owl',
  FLEXIBLE: 'Flexible',
};

export const CLEANLINESS_LABELS: Record<string, string> = {
  RELAXED: 'Relaxed',
  MODERATE: 'Moderate',
  TIDY: 'Tidy',
};

export const NEED_NOW_RESPONSE_TYPE_LABELS: Record<string, string> = {
  OFFER_LISTING: 'Offered a listing',
  JOIN_SEARCH: 'Wants to join this search',
};

export const NEED_NOW_RESPONSE_STATUS_LABELS: Record<NeedNowResponseStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
  REMOVED: 'Removed',
};

// ─── Friendly error mapping ─────────────────────────────────────────────────

const NEED_NOW_ERROR_MESSAGES: Record<string, string> = {
  HOUSING_REQUEST_ALREADY_ACTIVE: 'This requirement is already active.',
  PROFILE_INCOMPLETE: 'Complete your profile before publishing a requirement.',
  VERIFICATION_REQUIRED: 'Verify your account before doing this.',
  CONTENT_REJECTED: 'Remove phone, email, or WhatsApp details from your description.',
  HOUSING_REQUEST_CONTENT_REJECTED: 'Remove phone, email, or WhatsApp details from your description.',
  INVALID_TRANSITION: 'This action is not allowed for the current state.',
  HOUSING_REQUEST_NOT_ACTIVE: 'This requirement is no longer active and cannot be changed.',
  RATE_LIMITED: 'Too many attempts — please try again later.',
  HOUSING_REQUEST_RATE_LIMITED: 'Too many attempts — please try again later.',
  RESPONSE_DUPLICATE: 'You have already responded to this requirement.',
  RESPONSE_NOT_ALLOWED: 'You cannot respond to this requirement.',
  LISTING_INVALID: 'This listing is not valid for an offer.',
};

/**
 * Maps a backend error (ApiError with `error.code`) to a friendly message.
 * Falls back to the raw error message when the code is unknown.
 */
export function friendlyNeedNowError(error: unknown): string {
  if (isApiError(error) && error.code) {
    const mapped = NEED_NOW_ERROR_MESSAGES[error.code];
    if (mapped) return mapped;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * Formats a remaining lifetime (seconds) into a compact countdown label.
 * - status FULFILLED → 'Fulfilled'
 * - status EXPIRED or seconds <= 0 → 'Expired'
 * - 23h 0m  → '23h left'
 * - 4h 20m  → '4h 20m left'
 * - 45m     → '45m left'
 * - < 1m    → 'Less than a minute left'
 * Non-ACTIVE statuses (DRAFT/PAUSED/REMOVED) render their status label instead
 * of a countdown, because their timer is not running.
 */
export function formatRemainingTime(
  remainingSeconds: number | null | undefined,
  status?: NeedNowStatus | null
): string {
  if (status === 'FULFILLED') return 'Fulfilled';
  if (status === 'EXPIRED') return 'Expired';

  const seconds = typeof remainingSeconds === 'number' ? remainingSeconds : NaN;
  if (!Number.isFinite(seconds)) {
    return status ? NEED_NOW_STATUS_LABELS[status] : '';
  }
  if (seconds <= 0) return 'Expired';
  if (status && status !== 'ACTIVE') return NEED_NOW_STATUS_LABELS[status];

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours >= 1) return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
  if (minutes >= 1) return `${minutes}m left`;
  return 'Less than a minute left';
}

/** Formats a budget range from paise, e.g. ₹8,000 – ₹12,000 /mo. */
export function formatBudgetRangePaise(minimumPaise: number, maximumPaise: number): string {
  const min = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(minimumPaise / 100);
  const max = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(maximumPaise / 100);
  return `₹${min} – ₹${max}`;
}

/** Formats a distance in meters, e.g. '≈ 2 km away' or '≈ 400 m away'. */
export function formatDistanceMeters(distanceMeters: number | null | undefined): string {
  if (distanceMeters === null || distanceMeters === undefined) return '';
  if (distanceMeters < 1000) return `≈ ${Math.round(distanceMeters)} m away`;
  return `≈ ${(distanceMeters / 1000).toFixed(1).replace(/\.0$/, '')} km away`;
}

// ─── Normalizers ────────────────────────────────────────────────────────────

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && !isNaN(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && !isNaN(value) ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function mapRawToNeedNowRequest(item: unknown): NeedNowRequest {
  const raw = (item || {}) as Record<string, unknown>;
  const location = (raw.location || {}) as Record<string, unknown>;
  const budget = (raw.budget || {}) as Record<string, unknown>;
  const owner = (raw.owner || {}) as Record<string, unknown>;
  const viewer = (raw.viewerRelationship || {}) as Record<string, unknown>;

  return {
    id: asString(raw.id, `hr_${Math.random().toString(36).substring(2, 9)}`),
    intentType: (raw.intentType as NeedNowRequest['intentType']) || 'FLEXIBLE',
    campusId: asNullableString(raw.campusId),
    location: {
      name: asString(location.name, 'Location not specified'),
      distanceMeters: asNullableNumber(location.distanceMeters),
    },
    radiusMeters: asNumber(raw.radiusMeters, 5000),
    budget: {
      minimumPaise: asNumber(budget.minimumPaise, 0),
      maximumPaise: asNumber(budget.maximumPaise, 0),
    },
    moveInDate: asString(raw.moveInDate),
    stayDurationType: (raw.stayDurationType as NeedNowRequest['stayDurationType']) || 'FLEXIBLE',
    preferredRoomTypes: Array.isArray(raw.preferredRoomTypes)
      ? raw.preferredRoomTypes.map(String) as PreferredRoomType[]
      : [],
    description: asString(raw.description),
    visibility: (raw.visibility as NeedNowRequest['visibility']) || 'EVERYONE_NEARBY',
    allowVerifiedPartners: asBoolean(raw.allowVerifiedPartners),
    status: (raw.status as NeedNowRequest['status']) || 'DRAFT',
    expiresAt: asNullableString(raw.expiresAt),
    remainingSeconds: asNullableNumber(raw.remainingSeconds),
    createdAt: asString(raw.createdAt, new Date().toISOString()),
    owner: {
      id: asString(owner.id),
      displayName: asString(owner.displayName, 'Student'),
      avatarUrl: asNullableString(owner.avatarUrl),
      verified: asBoolean(owner.verified),
    },
    viewerRelationship: {
      isOwner: asBoolean(viewer.isOwner),
      isBlocked: asBoolean(viewer.isBlocked),
      canRespond: asBoolean(viewer.canRespond),
      canOfferListing: asBoolean(viewer.canOfferListing),
      canJoinSearch: asBoolean(viewer.canJoinSearch),
      existingResponseId: asNullableString(viewer.existingResponseId),
      existingResponseDirection: viewer.existingResponseDirection === 'received' ? 'received' : viewer.existingResponseDirection === 'sent' ? 'sent' : null,
      isSaved: asBoolean(viewer.isSaved),
    },
    areas: Array.isArray(raw.areas)
      ? (raw.areas as Array<Record<string, unknown>>).map((area) => ({
          id: asString(area.id),
          locationName: asString(area.locationName),
          radiusMeters: asNumber(area.radiusMeters, 0),
          priority: typeof area.priority === 'number' ? area.priority : undefined,
        }))
      : [],
    preferences: raw.preferences && typeof raw.preferences === 'object'
      ? (raw.preferences as NeedNowRequest['preferences'])
      : null,
  };
}

export function mapRawToNeedNowResponse(item: unknown): NeedNowResponse {
  const raw = (item || {}) as Record<string, unknown>;
  const request = (raw.request || {}) as Record<string, unknown>;
  const reqLocation = (request.location || {}) as Record<string, unknown>;
  const reqBudget = (request.budget || {}) as Record<string, unknown>;
  const responder = (raw.responder || {}) as Record<string, unknown>;
  const listing = raw.listing && typeof raw.listing === 'object'
    ? (raw.listing as Record<string, unknown>)
    : null;

  return {
    id: asString(raw.id, `hrr_${Math.random().toString(36).substring(2, 9)}`),
    housingRequestId: asString(raw.housingRequestId),
    responderId: asString(raw.responderId),
    listingId: asNullableString(raw.listingId),
    responseType: (raw.responseType as NeedNowResponse['responseType']) || 'JOIN_SEARCH',
    message: asNullableString(raw.message),
    status: (raw.status as NeedNowResponse['status']) || 'PENDING',
    acceptedAt: asNullableString(raw.acceptedAt),
    declinedAt: asNullableString(raw.declinedAt),
    withdrawnAt: asNullableString(raw.withdrawnAt),
    expiredAt: asNullableString(raw.expiredAt),
    createdAt: asString(raw.createdAt, new Date().toISOString()),
    // `direction` is COMPUTED by the backend — never inferred from labels.
    direction: raw.direction === 'received' ? 'received' : 'sent',
    canAccept: asBoolean(raw.canAccept),
    canDecline: asBoolean(raw.canDecline),
    canWithdraw: asBoolean(raw.canWithdraw),
    request: {
      id: asString(request.id),
      intentType: (request.intentType as NeedNowResponse['request']['intentType']) || 'FLEXIBLE',
      location: {
        name: asString(reqLocation.name, 'Location not specified'),
        distanceMeters: asNullableNumber(reqLocation.distanceMeters),
      },
      budget: {
        minimumPaise: asNumber(reqBudget.minimumPaise, 0),
        maximumPaise: asNumber(reqBudget.maximumPaise, 0),
      },
      moveInDate: asString(request.moveInDate),
      status: (request.status as NeedNowResponse['request']['status']) || 'ACTIVE',
      expiresAt: asNullableString(request.expiresAt),
      remainingSeconds: asNullableNumber(request.remainingSeconds),
    },
    responder: {
      id: asString(responder.id),
      displayName: asString(responder.displayName, 'Student'),
      avatarUrl: asNullableString(responder.avatarUrl),
      verified: asBoolean(responder.verified),
    },
    listing: listing
      ? {
          id: asString(listing.id),
          title: asString(listing.title, 'Listing'),
          rentPaise: asNumber(listing.rentPaise, 0),
          status: asString(listing.status),
        }
      : null,
  };
}

function unwrapData<T>(res: unknown, fallback: T): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data;
  }
  return (res as T) ?? fallback;
}

function extractItems(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

// ─── Requests ───────────────────────────────────────────────────────────────

/** POST /housing-requests — creates a DRAFT. */
export async function createDraft(params: CreateNeedNowDraftParams): Promise<NeedNowRequest> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/housing-requests',
    method: 'POST',
    body: {
      intentType: params.intentType,
      primaryLocationName: params.primaryLocationName,
      primaryLocationPoint: params.primaryLocationPoint,
      radiusMeters: params.radiusMeters,
      budgetMinPaise: params.budgetMinPaise,
      budgetMaxPaise: params.budgetMaxPaise,
      moveInDate: params.moveInDate,
      stayDurationType: params.stayDurationType,
      preferredRoomTypes: params.preferredRoomTypes,
      description: params.description,
      campusId: params.campusId,
      visibility: params.visibility,
      allowVerifiedPartners: params.allowVerifiedPartners,
      areas: params.areas,
      preferences: params.preferences,
    },
  });
  return mapRawToNeedNowRequest(unwrapData(res, {}));
}

/** POST /housing-requests/:id/publish — activates a draft. */
export async function publishRequest(id: string): Promise<NeedNowRequest> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/housing-requests/${id}/publish`,
    method: 'POST',
  });
  return mapRawToNeedNowRequest(unwrapData(res, {}));
}

/** GET /housing-requests/:id — full view. */
export async function getRequest(id: string): Promise<NeedNowRequest> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/housing-requests/${id}`,
    method: 'GET',
  });
  return mapRawToNeedNowRequest(unwrapData(res, {}));
}

/** GET /housing-requests/mine — all of the caller's requests (every status). */
export async function myRequests(): Promise<NeedNowRequest[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/housing-requests/mine',
    method: 'GET',
  });
  return extractItems(res).map(mapRawToNeedNowRequest);
}

/** PATCH /housing-requests/:id — updates allowed fields of an editable request. */
export async function updateRequest(id: string, data: UpdateNeedNowParams): Promise<NeedNowRequest> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/housing-requests/${id}`,
    method: 'PATCH',
    body: data,
  });
  return mapRawToNeedNowRequest(unwrapData(res, {}));
}

/** POST /housing-requests/:id/pause — owner only. */
export async function pauseRequest(id: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/housing-requests/${id}/pause`, method: 'POST' });
}

/** POST /housing-requests/:id/resume — owner only. */
export async function resumeRequest(id: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/housing-requests/${id}/resume`, method: 'POST' });
}

/** POST /housing-requests/:id/fulfil — owner only. */
export async function fulfilRequest(id: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/housing-requests/${id}/fulfil`, method: 'POST' });
}

/** POST /housing-requests/:id/renew — expired/fulfilled only. Returns the updated row. */
export async function renewRequest(id: string): Promise<NeedNowRequest> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/housing-requests/${id}/renew`,
    method: 'POST',
  });
  return mapRawToNeedNowRequest(unwrapData(res, {}));
}

/** POST /housing-requests/:id/remove — owner only. */
export async function removeRequest(id: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/housing-requests/${id}/remove`, method: 'POST' });
}

export interface NearbyFeedParams {
  longitude: number;
  latitude: number;
  radiusMeters?: number;
  limit?: number;
  cursor?: string;
  sort?: 'recent' | 'nearby';
  verifiedOnly?: boolean;
  forListing?: string;
}

/** GET /housing-requests/nearby — active needs around a point. */
export async function nearbyFeed(params: NearbyFeedParams): Promise<NeedNowFeedPage> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/housing-requests/nearby',
    method: 'GET',
    params: {
      longitude: params.longitude,
      latitude: params.latitude,
      radiusMeters: params.radiusMeters,
      limit: params.limit,
      cursor: params.cursor,
      sort: params.sort,
      verifiedOnly: params.verifiedOnly,
      forListing: params.forListing,
    },
  });
  const obj = (res && typeof res === 'object' ? res : {}) as Record<string, unknown>;
  return {
    items: extractItems(res).map(mapRawToNeedNowRequest),
    nextCursor: typeof obj.nextCursor === 'string' ? obj.nextCursor : null,
  };
}

export interface CampusFeedParams {
  campusId: string;
  limit?: number;
  cursor?: string;
}

/** GET /housing-requests/campus — active needs for a campus. */
export async function campusFeed(params: CampusFeedParams): Promise<NeedNowFeedPage> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/housing-requests/campus',
    method: 'GET',
    params: {
      campusId: params.campusId,
      limit: params.limit,
      cursor: params.cursor,
    },
  });
  const obj = (res && typeof res === 'object' ? res : {}) as Record<string, unknown>;
  return {
    items: extractItems(res).map(mapRawToNeedNowRequest),
    nextCursor: typeof obj.nextCursor === 'string' ? obj.nextCursor : null,
  };
}

/**
 * Fetches the caller's own published listings for the "offer a listing"
 * selector (GET /listings?owner=me).
 */
export async function fetchMyListings(): Promise<Listing[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/listings',
      method: 'GET',
      params: { owner: 'me', limit: 50 },
    });
    return extractItems(res).map(normalizeListingItem);
  } catch (error) {
    console.error('Failed to fetch my listings:', error);
    return [];
  }
}

// ─── Responses ──────────────────────────────────────────────────────────────

/** POST /housing-requests/:id/responses — respond with an offer or join request. */
export async function createResponse(
  id: string,
  params: CreateNeedNowResponseParams
): Promise<NeedNowResponse> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/housing-requests/${id}/responses`,
    method: 'POST',
    body: {
      responseType: params.responseType,
      listingId: params.listingId,
      message: params.message,
    },
  });
  return mapRawToNeedNowResponse(unwrapData(res, {}));
}

/** GET /housing-requests/:id/responses — owner-only list of response views. */
export async function requestResponses(id: string): Promise<NeedNowResponse[]> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/housing-requests/${id}/responses`,
    method: 'GET',
  });
  return extractItems(res).map(mapRawToNeedNowResponse);
}

/** GET /housing-request-responses/sent — responses where I am the responder. */
export async function sentResponses(): Promise<NeedNowResponse[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/housing-request-responses/sent',
    method: 'GET',
  });
  return extractItems(res).map(mapRawToNeedNowResponse);
}

/** GET /housing-request-responses/received — responses where I own the request. */
export async function receivedResponses(): Promise<NeedNowResponse[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/housing-request-responses/received',
    method: 'GET',
  });
  return extractItems(res).map(mapRawToNeedNowResponse);
}

async function respondToResponse(
  id: string,
  action: 'accept' | 'decline' | 'withdraw'
): Promise<NeedNowResponse> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/housing-request-responses/${id}/${action}`,
    method: 'POST',
  });
  return mapRawToNeedNowResponse(unwrapData(res, {}));
}

/** POST /housing-request-responses/:id/accept — owner of the request only. */
export async function acceptResponse(id: string): Promise<NeedNowResponse> {
  return respondToResponse(id, 'accept');
}

/** POST /housing-request-responses/:id/decline — owner of the request only. */
export async function declineResponse(id: string): Promise<NeedNowResponse> {
  return respondToResponse(id, 'decline');
}

/** POST /housing-request-responses/:id/withdraw — responder only. */
export async function withdrawResponse(id: string): Promise<NeedNowResponse> {
  return respondToResponse(id, 'withdraw');
}

// ─── Saved ──────────────────────────────────────────────────────────────────

/** POST /housing-requests/:id/save — saves the request for later. */
export async function saveRequest(id: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/housing-requests/${id}/save`, method: 'POST' });
}

/** DELETE /housing-requests/:id/save — unsaves the request. */
export async function unsaveRequest(id: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/housing-requests/${id}/save`, method: 'DELETE' });
}
