import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchListingContactPreference,
  updateListingContactPreference,
  createContactShareRequest,
  approveContactShareRequest,
  fetchRevealedContact,
  createFallbackContact,
  confirmFallbackVerification,
  normalizeContactError,
} from '@/lib/api/services/contact';
import { confirmListingAvailability, closeListing } from '@/lib/api/services/availability';
import * as clientModule from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Contact & Availability API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeContactError', () => {
    it('normalizes verified phone required error', () => {
      expect(normalizeContactError(new Error('403: Verified phone is required'))).toBe('A verified phone number is required to request contact sharing.');
    });

    it('normalizes daily limit reached error', () => {
      expect(normalizeContactError(new Error('Daily contact request limit reached'))).toBe('Daily contact request limit reached. Please try again tomorrow.');
    });

    it('normalizes disabled error', () => {
      expect(normalizeContactError(new Error('Contact sharing is disabled'))).toBe('Contact sharing is disabled for this conversation or listing.');
    });

    it('passes through general errors', () => {
      expect(normalizeContactError(new Error('Network timeout'))).toBe('Network timeout');
    });
  });

  describe('Contact Preferences', () => {
    it('fetches listing contact preference', async () => {
      const mockPref = { contactMode: 'CHAT_ONLY' };
      vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(mockPref);

      const res = await fetchListingContactPreference('l-1');
      expect(res).toEqual(mockPref);
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/listings/l-1/contact-preference',
        method: 'GET',
      });
    });

    it('updates listing contact preference', async () => {
      const payload = {
        contactMode: 'VERIFIED_USERS_AFTER_DELAY' as const,
        consentConfirmed: true,
        autoRevealAfterMinutes: 60,
        revealDurationMinutes: 120,
        dailyRevealLimit: 2,
      };
      vi.spyOn(clientModule, 'apiFetch').mockResolvedValue({ ...payload, updatedAt: '2026-08-01' });

      const res = await updateListingContactPreference('l-1', payload);
      expect(res.contactMode).toBe('VERIFIED_USERS_AFTER_DELAY');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/listings/l-1/contact-preference',
        method: 'PUT',
        body: payload,
      });
    });
  });

  describe('Contact Requests & Access Grants', () => {
    it('creates contact share request with listingInterestId', async () => {
      const mockReq = { id: 'req-1', status: 'pending', requesterId: 'u-1', recipientId: 'u-2', requestedAt: '2026-08-01' };
      vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(mockReq);

      const res = await createContactShareRequest({ listingInterestId: 'int-1' });
      expect(res).toEqual(mockReq);
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/contact-share-requests',
        method: 'POST',
        body: { listingInterestId: 'int-1' },
      });
    });

    it('approves request returning grant summary', async () => {
      const mockGrant = { id: 'g-1', status: 'approved', contactSource: 'OWNER', expiresAt: '2026-08-01T15:00:00Z', maximumViewCount: 3 };
      vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(mockGrant);

      const res = await approveContactShareRequest('req-1');
      expect(res).toEqual(mockGrant);
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/contact-share-requests/req-1/approve',
        method: 'POST',
      });
    });

    it('fetches unmasked revealed contact phone number with no-store cache control', async () => {
      const mockRevealed = { grantId: 'g-1', contactType: 'PHONE', phoneNumber: '+919876543210', expiresAt: '2026-08-01T15:00:00Z', remainingViews: 2 };
      vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(mockRevealed);

      const res = await fetchRevealedContact('g-1');
      expect(res).toEqual(mockRevealed);
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/contact-access-grants/g-1/contact',
        method: 'GET',
        cache: 'no-store',
      });
    });
  });

  describe('Fallback Contacts', () => {
    it('creates a fallback contact', async () => {
      const payload = { relationshipType: 'FAMILY' as const, displayName: 'Mom', phoneNumber: '+919876543210' };
      const mockFallback = { id: 'fb-1', ...payload, verificationStatus: 'PENDING' };
      vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(mockFallback);

      const res = await createFallbackContact(payload);
      expect(res).toEqual(mockFallback);
    });

    it('confirms fallback OTP verification code', async () => {
      vi.spyOn(clientModule, 'apiFetch').mockResolvedValue({ success: true });

      await confirmFallbackVerification('fb-1', '123456');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/fallback-contacts/fb-1/verify/confirm',
        method: 'POST',
        body: { code: '123456' },
      });
    });
  });

  describe('Availability & Closure', () => {
    it('confirms listing availability choice', async () => {
      const mockRes = { status: 'active', expiresAt: '2026-09-01' };
      vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(mockRes);

      const res = await confirmListingAvailability('l-1', 'STILL_AVAILABLE');
      expect(res).toEqual(mockRes);
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/listings/l-1/availability-confirmation',
        method: 'POST',
        body: { choice: 'STILL_AVAILABLE' },
      });
    });

    it('closes listing immediately', async () => {
      vi.spyOn(clientModule, 'apiFetch').mockResolvedValue(undefined);

      await closeListing('l-1');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/listings/l-1/close',
        method: 'POST',
      });
    });
  });
});
