/**
 * Roommate Discovery & Posts API Service
 * Reference: OpenAPI specification (`docs/openai.json`) -> `/api/v1/roommate-posts`, `/api/v1/roommate-interests`
 */

import { apiFetch } from '@/lib/api/client';
import {
  RoommatePost,
  RoommateInterest,
  RoommatePreferences,
  RoommatePostType,
  RoommatePostResult,
  RoommatePostDecision,
  RequiredAction,
} from '@/types';

export interface CreateRoommatePostParams {
  title: string;
  body: string;
  expiresAt: string;
  postType?: RoommatePostType;
  collegeId?: string;
  campusId?: string;
  listingId?: string;
  locality?: string;
  budgetPaise?: number;
  moveInFrom?: string;
  moveInTo?: string;
  moveOutAt?: string;
  mediaIds?: string[];
  preferences?: RoommatePreferences;
}

export interface GroupedRoommateInterests {
  incoming: RoommateInterest[];
  outgoing: RoommateInterest[];
}

export interface RoommatePostFilters {
  locality?: string;
  campusId?: string;
  collegeId?: string;
}

/**
 * Checks if a roommate post is expired based on status or expiresAt date.
 */
export function isRoommatePostExpired(post: Partial<RoommatePost>): boolean {
  if (post.status === 'fulfilled') return false;
  if (post.status === 'expired') return true;
  if (!post.expiresAt) return false;
  const expiry = new Date(post.expiresAt).getTime();
  return !isNaN(expiry) && expiry <= Date.now();
}

/**
 * Normalizes raw roommate post item from API.
 */
export function mapRawToRoommatePost(item: unknown): RoommatePost {
  const raw = (item || {}) as Record<string, unknown>;
  const expiresAt = typeof raw.expiresAt === 'string' ? raw.expiresAt : undefined;
  let status: RoommatePost['status'] = (raw.status as RoommatePost['status']) || 'active';

  if (expiresAt && isRoommatePostExpired({ expiresAt, status })) {
    status = 'expired';
  }

  const prefs = (raw.preferences || {}) as RoommatePreferences;
  const desc = typeof raw.description === 'string' && raw.description
    ? raw.description
    : typeof raw.body === 'string' ? raw.body : '';

  let requiredAction: RequiredAction = null;
  if (raw.requiredAction && typeof raw.requiredAction === 'object') {
    const action = raw.requiredAction as Record<string, unknown>;
    if (action.type === 'TENANT_VERIFICATION' && typeof action.verificationId === 'string') {
      requiredAction = { type: 'TENANT_VERIFICATION', verificationId: action.verificationId };
    } else if (action.type === 'CHANGES_REQUIRED' && Array.isArray(action.hints)) {
      requiredAction = { type: 'CHANGES_REQUIRED', hints: action.hints.map(String) };
    }
  }

  let decision: RoommatePostDecision | null = null;
  if (raw.decision && typeof raw.decision === 'object') {
    const dec = raw.decision as Record<string, unknown>;
    decision = {
      safeReason: typeof dec.safeReason === 'string' ? dec.safeReason : null,
      redirectTarget:
        typeof dec.redirectTarget === 'string'
          ? (dec.redirectTarget as RoommatePostDecision['redirectTarget'])
          : null,
      changeHints: Array.isArray(dec.changeHints) ? dec.changeHints.map(String) : null,
    };
  }

  const mediaIds = Array.isArray(raw.mediaIds) ? raw.mediaIds.map(String) : undefined;

  return {
    id: String(raw.id || `rm_${Math.random().toString(36).substring(2, 9)}`),
    userId: String(raw.userId || raw.authorId || 'usr_unknown'),
    user: raw.user ? (raw.user as RoommatePost['user']) : undefined,
    collegeId: typeof raw.collegeId === 'string' ? raw.collegeId : undefined,
    collegeName: typeof raw.collegeName === 'string' ? raw.collegeName : undefined,
    campusId: typeof raw.campusId === 'string' ? raw.campusId : undefined,
    campusName: typeof raw.campusName === 'string' ? raw.campusName : undefined,
    title: String(raw.title || 'Roommate wanted'),
    description: desc,
    body: desc,
    budgetPaise: typeof raw.budgetPaise === 'number' ? raw.budgetPaise : undefined,
    targetMoveInDate: typeof raw.targetMoveInDate === 'string' ? raw.targetMoveInDate : typeof raw.moveInFrom === 'string' ? raw.moveInFrom : undefined,
    moveInFrom: typeof raw.moveInFrom === 'string' ? raw.moveInFrom : undefined,
    moveInTo: typeof raw.moveInTo === 'string' ? raw.moveInTo : undefined,
    moveOutAt: typeof raw.moveOutAt === 'string' ? raw.moveOutAt : undefined,
    expiresAt,
    locationPreference: typeof raw.locationPreference === 'string' ? raw.locationPreference : typeof raw.locality === 'string' ? raw.locality : undefined,
    locality: typeof raw.locality === 'string' ? raw.locality : undefined,
    preferences: prefs,
    status,
    postType: typeof raw.postType === 'string' ? (raw.postType as RoommatePostType) : undefined,
    publicationStatus:
      typeof raw.publicationStatus === 'string'
        ? (raw.publicationStatus as RoommatePost['publicationStatus'])
        : undefined,
    moderationStatus:
      typeof raw.moderationStatus === 'string'
        ? (raw.moderationStatus as RoommatePost['moderationStatus'])
        : undefined,
    mediaIds,
    decision,
    requiredAction,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

/**
 * Normalizes the create/update result envelope
 * { id, postId, status, publicationStatus, moderationStatus, requiredAction }.
 */
export function mapRawToRoommatePostResult(item: unknown): RoommatePostResult {
  const raw = (item || {}) as Record<string, unknown>;
  let requiredAction: RequiredAction = null;
  if (raw.requiredAction && typeof raw.requiredAction === 'object') {
    const action = raw.requiredAction as Record<string, unknown>;
    if (action.type === 'TENANT_VERIFICATION' && typeof action.verificationId === 'string') {
      requiredAction = { type: 'TENANT_VERIFICATION', verificationId: action.verificationId };
    } else if (action.type === 'CHANGES_REQUIRED' && Array.isArray(action.hints)) {
      requiredAction = { type: 'CHANGES_REQUIRED', hints: action.hints.map(String) };
    }
  }
  return {
    id: String(raw.id || raw.postId || ''),
    postId: String(raw.postId || raw.id || ''),
    status: String(raw.status || 'active'),
    publicationStatus: (raw.publicationStatus || 'DRAFT') as RoommatePostResult['publicationStatus'],
    moderationStatus: (raw.moderationStatus || 'PENDING_AUTOMATED_REVIEW') as RoommatePostResult['moderationStatus'],
    requiredAction,
  };
}

/**
 * Normalizes raw roommate interest item from API.
 */
export function mapRawToRoommateInterest(item: unknown, currentUserId?: string): RoommateInterest {
  const raw = (item || {}) as Record<string, unknown>;
  const status = (raw.status as RoommateInterest['status']) || 'pending';
  
  const requesterUserId = String(raw.requesterUserId || raw.userId || '');
  const postOwnerUserId = String(
    raw.postOwnerUserId ||
      raw.receiverUserId ||
      raw.authorId ||
      (raw.post && typeof raw.post === 'object' && 'userId' in raw.post
        ? (raw.post as Record<string, unknown>).userId
        : '') ||
      ''
  );
  const receiverUserId = postOwnerUserId;

  let direction: RoommateInterest['direction'] = 'outgoing';
  if (currentUserId) {
    if (requesterUserId && currentUserId === requesterUserId) {
      direction = 'outgoing';
    } else if (
      (postOwnerUserId && currentUserId === postOwnerUserId) ||
      (receiverUserId && currentUserId === receiverUserId)
    ) {
      direction = 'incoming';
    } else if (raw.direction === 'received' || raw.direction === 'incoming') {
      direction = 'incoming';
    } else if (raw.direction === 'sent' || raw.direction === 'outgoing') {
      direction = 'outgoing';
    }
  } else {
    if (raw.direction === 'received' || raw.direction === 'incoming') {
      direction = 'incoming';
    } else if (raw.direction === 'sent' || raw.direction === 'outgoing') {
      direction = 'outgoing';
    }
  }

  const isSender = currentUserId ? currentUserId === requesterUserId : direction === 'outgoing';
  const isReceiver = currentUserId ? (currentUserId === postOwnerUserId || currentUserId === receiverUserId) : direction === 'incoming';

  const canWithdraw = typeof raw.canWithdraw === 'boolean' ? raw.canWithdraw : (isSender && status === 'pending');
  const canAccept = typeof raw.canAccept === 'boolean' ? raw.canAccept : (isReceiver && status === 'pending');
  const canReject = typeof raw.canReject === 'boolean' ? raw.canReject : (isReceiver && status === 'pending');

  return {
    id: String(raw.id || `rmi_${Math.random().toString(36).substring(2, 9)}`),
    postId: String(raw.postId || ''),
    post: raw.post ? mapRawToRoommatePost(raw.post) : undefined,
    requesterUserId,
    receiverUserId,
    postOwnerUserId,
    userId: requesterUserId,
    user: raw.user ? (raw.user as RoommateInterest['user']) : undefined,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    status,
    direction,
    canWithdraw,
    canAccept,
    canReject,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

/**
 * Normalizes API response for roommate interests into incoming and outgoing groups.
 */
export function normalizeRoommateInterestsResponse(res: unknown, currentUserId?: string): GroupedRoommateInterests {
  if (!res) return { incoming: [], outgoing: [] };

  if (typeof res === 'object' && res !== null && ('incoming' in res || 'outgoing' in res)) {
    const obj = res as { incoming?: unknown[]; outgoing?: unknown[] };
    const incomingRaw = Array.isArray(obj.incoming) ? obj.incoming : [];
    const outgoingRaw = Array.isArray(obj.outgoing) ? obj.outgoing : [];

    const incoming = incomingRaw.map((item) => {
      const mapped = mapRawToRoommateInterest(item, currentUserId);
      return { ...mapped, direction: 'incoming' as const };
    });

    const outgoing = outgoingRaw.map((item) => {
      const mapped = mapRawToRoommateInterest(item, currentUserId);
      return { ...mapped, direction: 'outgoing' as const };
    });

    return { incoming, outgoing };
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

  const incoming: RoommateInterest[] = [];
  const outgoing: RoommateInterest[] = [];

  for (const item of items) {
    const mapped = mapRawToRoommateInterest(item, currentUserId);
    if (mapped.direction === 'incoming') {
      incoming.push(mapped);
    } else {
      outgoing.push(mapped);
    }
  }

  return { incoming, outgoing };
}

/**
 * Fetches roommate posts based on optional query filters (locality, campusId, collegeId).
 */
export async function fetchRoommatePosts(filters?: RoommatePostFilters): Promise<RoommatePost[]> {
  try {
    const params: Record<string, string | undefined> = {};
    if (filters?.locality) params.locality = filters.locality;
    if (filters?.campusId) params.campusId = filters.campusId;
    if (filters?.collegeId) params.collegeId = filters.collegeId;

    const res = await apiFetch<unknown>({
      path: '/api/v1/roommate-posts',
      method: 'GET',
      params,
    });

    let items: unknown[] = [];
    if (Array.isArray(res)) {
      items = res;
    } else if (typeof res === 'object' && res !== null) {
      if ('data' in res && Array.isArray((res as { data: unknown[] }).data)) {
        items = (res as { data: unknown[] }).data;
      } else if ('items' in res && Array.isArray((res as { items: unknown[] }).items)) {
        items = (res as { items: unknown[] }).items;
      } else if ('posts' in res && Array.isArray((res as { posts: unknown[] }).posts)) {
        // Backend GET /roommate-posts responds with { posts: [...] }
        items = (res as { posts: unknown[] }).posts;
      }
    }

    return items.map(mapRawToRoommatePost);
  } catch (error) {
    console.error('Failed to fetch roommate posts:', error);
    return [];
  }
}

/**
 * Creates a new roommate post.
 * Returns the moderation result envelope
 * { id, postId, status, publicationStatus, moderationStatus, requiredAction }.
 */
export async function createRoommatePost(params: CreateRoommatePostParams): Promise<RoommatePostResult> {
  if (!params.title || !params.body || !params.expiresAt) {
    throw new Error('Title, body, and expiresAt are required to create a roommate post');
  }

  const res = await apiFetch<unknown>({
    path: '/api/v1/roommate-posts',
    method: 'POST',
    body: {
      postType: params.postType || 'NEED_ROOMMATE',
      collegeId: params.collegeId,
      campusId: params.campusId,
      listingId: params.listingId,
      locality: params.locality,
      title: params.title,
      body: params.body,
      budgetPaise: params.budgetPaise,
      expiresAt: params.expiresAt,
      moveInFrom: params.moveInFrom,
      moveInTo: params.moveInTo,
      moveOutAt: params.moveOutAt,
      mediaIds: params.mediaIds,
      preferences: params.preferences,
    },
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToRoommatePostResult(raw || {
    id: '',
    status: 'active',
    publicationStatus: 'DRAFT',
    moderationStatus: 'PENDING_AUTOMATED_REVIEW',
  });
}

/**
 * Fetches the caller's own roommate posts in every moderation state
 * (draft, pending review, published, limited reach, changes required, rejected)
 * with the latest decision's safeReason / redirectTarget / changeHints attached.
 */
export async function fetchMyRoommatePosts(): Promise<RoommatePost[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/roommate-posts/mine',
      method: 'GET',
    });

    let items: unknown[] = [];
    if (Array.isArray(res)) {
      items = res;
    } else if (typeof res === 'object' && res !== null) {
      if ('data' in res && Array.isArray((res as { data: unknown[] }).data)) {
        items = (res as { data: unknown[] }).data;
      } else if ('items' in res && Array.isArray((res as { items: unknown[] }).items)) {
        items = (res as { items: unknown[] }).items;
      } else if ('posts' in res && Array.isArray((res as { posts: unknown[] }).posts)) {
        // Backend GET /roommate-posts/mine responds with { posts: [...], urlsExpireAt }
        items = (res as { posts: unknown[] }).posts;
      }
    }

    return items.map(mapRawToRoommatePost);
  } catch (error) {
    console.error('Failed to fetch my roommate posts:', error);
    return [];
  }
}

/**
 * Updates an existing roommate post.
 */
export async function updateRoommatePost(
  postId: string,
  data: Record<string, unknown>
): Promise<RoommatePost> {
  if (!postId) {
    throw new Error('Post ID is required');
  }

  const res = await apiFetch<unknown>({
    path: `/api/v1/roommate-posts/${postId}`,
    method: 'PATCH',
    body: data,
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToRoommatePost(raw || { id: postId, ...data });
}

/**
 * Expresses interest in a roommate post.
 */
export async function submitRoommateInterest(
  postId: string,
  message?: string
): Promise<RoommateInterest> {
  if (!postId) {
    throw new Error('Post ID is required');
  }

  const res = await apiFetch<unknown>({
    path: `/api/v1/roommate-posts/${postId}/interests`,
    method: 'POST',
    body: {
      message: message || 'Hi! I am interested in being roommates.',
    },
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToRoommateInterest(raw || { postId, message, status: 'pending' });
}

/**
 * Fetches all incoming and outgoing roommate interest requests.
 */
export async function fetchRoommateInterests(currentUserId?: string): Promise<GroupedRoommateInterests> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/roommate-interests',
      method: 'GET',
    });

    return normalizeRoommateInterestsResponse(res, currentUserId);
  } catch (error) {
    console.error('Failed to fetch roommate interests:', error);
    return { incoming: [], outgoing: [] };
  }
}

/**
 * Updates the status of a roommate interest request (accept, reject, or withdraw).
 */
export async function updateRoommateInterestStatus(
  interestId: string,
  status: 'accepted' | 'rejected' | 'withdrawn'
): Promise<RoommateInterest> {
  if (!interestId) {
    throw new Error('Interest ID is required');
  }

  const res = await apiFetch<unknown>({
    path: `/api/v1/roommate-interests/${interestId}`,
    method: 'PATCH',
    body: { status },
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToRoommateInterest(raw || { id: interestId, status });
}
