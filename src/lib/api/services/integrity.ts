/**
 * Community Integrity Service (Phase 12)
 * Reports, appeals, capability restrictions, and tenant verification.
 * Only user-facing safe projections are consumed — never internal thresholds.
 */

import { apiFetch } from '@/lib/api/client';
import {
  Appeal,
  AppealTargetType,
  CapabilityRestriction,
  CommunityReportReason,
  TenantVerification,
  VerificationMethod,
} from '@/types';

// ─── Reports ─────────────────────────────────────────────────────────────────

export const COMMUNITY_REPORT_REASONS: { value: CommunityReportReason; label: string }[] = [
  { value: 'BROKER_OR_COMMERCIAL_PROMOTION', label: 'Broker or commercial promotion' },
  { value: 'PROMOTIONAL_IMAGE', label: 'Promotional image' },
  { value: 'CONTACT_DETAILS_IN_IMAGE', label: 'Contact details in image' },
  { value: 'FAKE_ROOMMATE_POST', label: 'Fake roommate post' },
  { value: 'MULTIPLE_UNRELATED_PROPERTIES', label: 'Multiple unrelated properties' },
  { value: 'MISLEADING_INFORMATION', label: 'Misleading information' },
  { value: 'REPOSTED_REJECTED_CONTENT', label: 'Reposted rejected content' },
];

export async function reportRoommatePost(
  postId: string,
  reason: CommunityReportReason
): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/roommate-posts/${encodeURIComponent(postId)}/report`,
    method: 'POST',
    body: { reason },
  });
}

// ─── Appeals ─────────────────────────────────────────────────────────────────

export interface SubmitAppealParams {
  targetType: AppealTargetType;
  targetId: string;
  reason: string;
  detail?: string;
}

export async function submitAppeal(params: SubmitAppealParams): Promise<{ id: string }> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/appeals',
    method: 'POST',
    body: {
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason,
      detail: params.detail,
    },
  });
  const payload = (typeof res === 'object' && res !== null ? res : {}) as Record<string, unknown>;
  return { id: String(payload.id || payload.appealId || '') };
}

export async function fetchMyAppeals(): Promise<Appeal[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/appeals/mine',
      method: 'GET',
    });
    let items: unknown[] = [];
    if (Array.isArray(res)) items = res;
    else if (typeof res === 'object' && res !== null) {
      const obj = res as Record<string, unknown>;
      if (Array.isArray(obj.data)) items = obj.data;
      else if (Array.isArray(obj.items)) items = obj.items;
    }
    return items.map((item) => {
      const raw = (item || {}) as Record<string, unknown>;
      return {
        id: String(raw.id || ''),
        targetType: String(raw.targetType || 'ROOMMATE_POST') as AppealTargetType,
        targetId: String(raw.targetId || ''),
        status: String(raw.status || ''),
        reason: String(raw.reason || ''),
        createdAt: String(raw.createdAt || ''),
        decidedAt: typeof raw.decidedAt === 'string' ? raw.decidedAt : null,
        moderatorNote: typeof raw.moderatorNote === 'string' ? raw.moderatorNote : null,
      } as Appeal;
    });
  } catch (error) {
    console.error('Failed to fetch appeals:', error);
    return [];
  }
}

// ─── Restrictions ────────────────────────────────────────────────────────────

const POSTING_BLOCKING_CAPABILITIES = new Set([
  'ROOMMATE_POST_CREATE_RESTRICTED',
  'ROOMMATE_POST_PUBLISH_RESTRICTED',
  'ROOMMATE_MEDIA_UPLOAD_RESTRICTED',
  'ACCOUNT_FULLY_SUSPENDED',
]);

export async function fetchMyRestrictions(): Promise<CapabilityRestriction[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/restrictions/mine',
      method: 'GET',
    });
    let items: unknown[] = [];
    if (Array.isArray(res)) items = res;
    else if (typeof res === 'object' && res !== null) {
      const obj = res as Record<string, unknown>;
      if (Array.isArray(obj.data)) items = obj.data;
      else if (Array.isArray(obj.items)) items = obj.items;
    }
    return items.map((item) => {
      const raw = (item || {}) as Record<string, unknown>;
      return {
        id: String(raw.id || ''),
        capability: String(raw.capability || ''),
        restriction: String(raw.restriction || ''),
        reason: typeof raw.reason === 'string' ? raw.reason : null,
        appliedAt: String(raw.appliedAt || ''),
        expiresAt: typeof raw.expiresAt === 'string' ? raw.expiresAt : null,
        source: typeof raw.source === 'string' ? raw.source : null,
        appealAvailable: typeof raw.appealAvailable === 'boolean' ? raw.appealAvailable : true,
      } as CapabilityRestriction;
    });
  } catch (error) {
    console.error('Failed to fetch restrictions:', error);
    return [];
  }
}

/** True when any active restriction blocks creating/publishing personal posts. */
export function hasPostingRestriction(
  restrictions: CapabilityRestriction[]
): boolean {
  return restrictions.some((restriction) =>
    POSTING_BLOCKING_CAPABILITIES.has(restriction.capability)
  );
}

// ─── Tenant Verification ─────────────────────────────────────────────────────

export const VERIFICATION_METHODS: { value: VerificationMethod; label: string; hint: string }[] = [
  {
    value: 'LIVE_ROOM_PHOTO_WITH_CODE',
    label: 'Live room photo with a code',
    hint: 'Show a one-time 6-digit code in a photo of the actual room.',
  },
  {
    value: 'EXISTING_ROOMMATE_CONFIRMATION',
    label: 'Existing roommate confirms',
    hint: 'A different account that shares the flat confirms your tenant context.',
  },
  {
    value: 'PROPERTY_OWNER_CONFIRMATION',
    label: 'Property owner confirms',
    hint: 'The flat owner (a different account) confirms you live here.',
  },
  {
    value: 'PROPERTY_MANAGER_CONFIRMATION',
    label: 'Property manager confirms',
    hint: 'The property manager (a different account) confirms you live here.',
  },
  {
    value: 'REDACTED_RENT_RECEIPT',
    label: 'Redacted rent receipt',
    hint: 'Upload a rent receipt with all private details (amount, address, name) redacted.',
  },
  {
    value: 'REDACTED_RENTAL_AGREEMENT',
    label: 'Redacted rental agreement',
    hint: 'Upload a rental agreement with all private details redacted.',
  },
  {
    value: 'MANUAL_VIDEO_REVIEW',
    label: 'Manual video review',
    hint: 'A short video of the room reviewed manually by our team.',
  },
];

export async function requestTenantVerification(
  postId: string,
  method: VerificationMethod
): Promise<{ verificationId: string; liveCode?: string }> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/tenant-verifications/requests',
    method: 'POST',
    body: { postId, method },
  });
  const payload = (typeof res === 'object' && res !== null ? res : {}) as Record<string, unknown>;
  return {
    verificationId: String(payload.verificationId || payload.id || ''),
    liveCode: typeof payload.liveCode === 'string' ? payload.liveCode : undefined,
  };
}

export async function submitLivePhoto(
  verificationId: string,
  code: string,
  mediaId: string
): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/tenant-verifications/${encodeURIComponent(verificationId)}/live-photo`,
    method: 'POST',
    body: { code, mediaId },
  });
}

export async function submitVerificationEvidence(
  verificationId: string,
  mediaId: string
): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/tenant-verifications/${encodeURIComponent(verificationId)}/evidence`,
    method: 'POST',
    body: { mediaId },
  });
}

export async function confirmTenantContext(
  verificationId: string,
  role: VerificationMethod
): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/tenant-verifications/${encodeURIComponent(verificationId)}/confirm`,
    method: 'POST',
    body: { role },
  });
}

export async function refreshVerificationCode(
  verificationId: string
): Promise<{ liveCode: string }> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/tenant-verifications/${encodeURIComponent(verificationId)}/refresh-code`,
    method: 'POST',
  });
  const payload = (typeof res === 'object' && res !== null ? res : {}) as Record<string, unknown>;
  return { liveCode: String(payload.liveCode || '') };
}

export async function fetchMyVerifications(): Promise<TenantVerification[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/tenant-verifications/mine',
      method: 'GET',
    });
    let items: unknown[] = [];
    if (Array.isArray(res)) items = res;
    else if (typeof res === 'object' && res !== null) {
      const obj = res as Record<string, unknown>;
      if (Array.isArray(obj.data)) items = obj.data;
      else if (Array.isArray(obj.items)) items = obj.items;
    }
    return items.map((item) => {
      const raw = (item || {}) as Record<string, unknown>;
      return {
        id: String(raw.id || ''),
        postId: String(raw.postId || ''),
        method: String(raw.method || 'LIVE_ROOM_PHOTO_WITH_CODE') as VerificationMethod,
        status: String(raw.status || ''),
        requestedAt: String(raw.requestedAt || ''),
        verifiedAt: typeof raw.verifiedAt === 'string' ? raw.verifiedAt : null,
        expiresAt: typeof raw.expiresAt === 'string' ? raw.expiresAt : null,
        rejectionReason: typeof raw.rejectionReason === 'string' ? raw.rejectionReason : null,
        hasEvidence: typeof raw.hasEvidence === 'boolean' ? raw.hasEvidence : undefined,
      } as TenantVerification;
    });
  } catch (error) {
    console.error('Failed to fetch verifications:', error);
    return [];
  }
}

export async function deleteVerificationEvidence(verificationId: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/tenant-verifications/${encodeURIComponent(verificationId)}/evidence`,
    method: 'DELETE',
  });
}
