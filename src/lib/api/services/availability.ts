/**
 * Availability Lifecycle & Entity Closure API Service
 * Reference: phase-7-availability.md
 */

import { apiFetch } from '@/lib/api/client';
import { AvailabilityConfirmationChoice, AvailabilityConfirmationResponse } from '@/types';

export async function confirmListingAvailability(
  listingId: string,
  choice: AvailabilityConfirmationChoice
): Promise<AvailabilityConfirmationResponse> {
  const res = await apiFetch<AvailabilityConfirmationResponse>({
    path: `/api/v1/listings/${listingId}/availability-confirmation`,
    method: 'POST',
    body: { choice },
  });
  return res;
}

export async function confirmRoommatePostAvailability(
  postId: string,
  choice: AvailabilityConfirmationChoice
): Promise<AvailabilityConfirmationResponse> {
  const res = await apiFetch<AvailabilityConfirmationResponse>({
    path: `/api/v1/roommate-posts/${postId}/availability-confirmation`,
    method: 'POST',
    body: { choice },
  });
  return res;
}

export async function closeListing(listingId: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/listings/${listingId}/close`,
    method: 'POST',
  });
}

export async function closeRoommatePost(postId: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/roommate-posts/${postId}/close`,
    method: 'POST',
  });
}
