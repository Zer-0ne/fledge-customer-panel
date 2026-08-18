/**
 * Controlled Contact Fallback & Access Grant API Service
 * Reference: contact-api-contracts.md & contact-client-implementation-handoff.md
 */

import { apiFetch } from '@/lib/api/client';
import {
  ContactPreference,
  UpdateContactPreferencePayload,
  ContactShareRequest,
  CreateContactShareRequestPayload,
  ContactAccessGrantSummary,
  RevealedContact,
  FallbackContact,
  CreateFallbackContactPayload,
  ContactApprovalContext,
} from '@/types';

/**
 * Normalizes backend error messages into safe UI states.
 */
export function normalizeContactError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('Verified phone is required')) {
    return 'A verified phone number is required to request contact sharing.';
  }
  if (msg.includes('Daily contact request limit reached')) {
    return 'Daily contact request limit reached. Please try again tomorrow.';
  }
  if (msg.includes('Contact sharing is disabled')) {
    return 'Contact sharing is disabled for this conversation or listing.';
  }
  return msg || 'An unexpected error occurred';
}

// ---------------------------------------------------------------------------
// Contact Preferences (Owner/Manager only)
// ---------------------------------------------------------------------------

export async function fetchListingContactPreference(listingId: string): Promise<ContactPreference> {
  const res = await apiFetch<ContactPreference>({
    path: `/api/v1/listings/${listingId}/contact-preference`,
    method: 'GET',
  });
  return res;
}

export async function updateListingContactPreference(
  listingId: string,
  payload: UpdateContactPreferencePayload
): Promise<ContactPreference> {
  const res = await apiFetch<ContactPreference>({
    path: `/api/v1/listings/${listingId}/contact-preference`,
    method: 'PUT',
    body: payload,
  });
  return res;
}

export async function fetchRoommatePostContactPreference(postId: string): Promise<ContactPreference> {
  const res = await apiFetch<ContactPreference>({
    path: `/api/v1/roommate-posts/${postId}/contact-preference`,
    method: 'GET',
  });
  return res;
}

export async function updateRoommatePostContactPreference(
  postId: string,
  payload: UpdateContactPreferencePayload
): Promise<ContactPreference> {
  const res = await apiFetch<ContactPreference>({
    path: `/api/v1/roommate-posts/${postId}/contact-preference`,
    method: 'PUT',
    body: payload,
  });
  return res;
}

// ---------------------------------------------------------------------------
// Contact Share Requests & Grants
// ---------------------------------------------------------------------------

export async function createContactShareRequest(
  payload: CreateContactShareRequestPayload
): Promise<ContactShareRequest> {
  const res = await apiFetch<ContactShareRequest>({
    path: '/api/v1/contact-share-requests',
    method: 'POST',
    body: payload,
  });
  return res;
}

export async function fetchContactShareRequests(): Promise<ContactShareRequest[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/contact-share-requests',
    method: 'GET',
  });
  if (Array.isArray(res)) return res as ContactShareRequest[];
  if (res && typeof res === 'object' && 'items' in res && Array.isArray((res as { items: unknown[] }).items)) {
    return (res as { items: ContactShareRequest[] }).items;
  }
  if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as { data: unknown[] }).data)) {
    return (res as { data: ContactShareRequest[] }).data;
  }
  return [];
}

export async function fetchContactShareRequestDetail(requestId: string): Promise<ContactShareRequest> {
  const res = await apiFetch<ContactShareRequest>({
    path: `/api/v1/contact-share-requests/${requestId}`,
    method: 'GET',
  });
  return res;
}

export async function approveContactShareRequest(requestId: string): Promise<ContactAccessGrantSummary> {
  const res = await apiFetch<ContactAccessGrantSummary>({
    path: `/api/v1/contact-share-requests/${requestId}/approve`,
    method: 'POST',
  });
  return res;
}

export async function rejectContactShareRequest(requestId: string): Promise<ContactShareRequest> {
  const res = await apiFetch<ContactShareRequest>({
    path: `/api/v1/contact-share-requests/${requestId}/reject`,
    method: 'POST',
  });
  return res;
}

export async function revokeContactShareRequest(requestId: string): Promise<ContactShareRequest> {
  const res = await apiFetch<ContactShareRequest>({
    path: `/api/v1/contact-share-requests/${requestId}/revoke`,
    method: 'POST',
  });
  return res;
}

/**
 * Fetches unmasked contact details (phone number) from an active access grant.
 * PRIVACY NOTICE: Must only be held in client memory and NEVER saved to storage or logged.
 */
export async function fetchRevealedContact(grantId: string): Promise<RevealedContact> {
  const res = await apiFetch<RevealedContact>({
    path: `/api/v1/contact-access-grants/${grantId}/contact`,
    method: 'GET',
    cache: 'no-store',
  });
  return res;
}

export async function revokeContactAccessGrant(grantId: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/contact-access-grants/${grantId}/revoke`,
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Fallback Contacts
// ---------------------------------------------------------------------------

export async function fetchFallbackContacts(): Promise<FallbackContact[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/fallback-contacts',
    method: 'GET',
  });
  if (Array.isArray(res)) return res as FallbackContact[];
  if (res && typeof res === 'object' && 'items' in res && Array.isArray((res as { items: unknown[] }).items)) {
    return (res as { items: FallbackContact[] }).items;
  }
  if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as { data: unknown[] }).data)) {
    return (res as { data: FallbackContact[] }).data;
  }
  return [];
}

export async function createFallbackContact(payload: CreateFallbackContactPayload): Promise<FallbackContact> {
  const res = await apiFetch<FallbackContact>({
    path: '/api/v1/fallback-contacts',
    method: 'POST',
    body: payload,
  });
  return res;
}

export async function requestFallbackVerification(fallbackId: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/fallback-contacts/${fallbackId}/verify/request`,
    method: 'POST',
  });
}

export async function confirmFallbackVerification(fallbackId: string, code: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/fallback-contacts/${fallbackId}/verify/confirm`,
    method: 'POST',
    body: { code },
  });
}

export async function requestFallbackRevocation(fallbackId: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/fallback-contacts/${fallbackId}/revoke/request`,
    method: 'POST',
  });
}

export async function confirmFallbackRevocation(fallbackId: string, code: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/fallback-contacts/${fallbackId}/revoke`,
    method: 'POST',
    body: { code },
  });
}

export async function deleteFallbackContact(fallbackId: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/fallback-contacts/${fallbackId}`,
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// External Approval Tokens (Public)
// ---------------------------------------------------------------------------

export async function fetchContactApprovalContext(token: string): Promise<ContactApprovalContext> {
  const res = await apiFetch<ContactApprovalContext>({
    path: `/api/v1/contact-approval/${token}/context`,
    method: 'GET',
    cache: 'no-store',
  });
  return res;
}

export async function approveContactApprovalToken(token: string): Promise<ContactAccessGrantSummary> {
  const res = await apiFetch<ContactAccessGrantSummary>({
    path: `/api/v1/contact-approval/${token}/approve`,
    method: 'POST',
  });
  return res;
}

export async function rejectContactApprovalToken(token: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/contact-approval/${token}/reject`,
    method: 'POST',
  });
}
