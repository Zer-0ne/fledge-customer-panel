import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  reportRoommatePost,
  submitAppeal,
  fetchMyAppeals,
  fetchMyRestrictions,
  hasPostingRestriction,
  requestTenantVerification,
  submitLivePhoto,
  submitVerificationEvidence,
  refreshVerificationCode,
  fetchMyVerifications,
  COMMUNITY_REPORT_REASONS,
} from './integrity';
import * as clientModule from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Community Integrity Service (Phase 12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reportRoommatePost', () => {
    it('posts a structured report reason', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({ id: 'report_1' });
      await reportRoommatePost('post_1', 'CONTACT_DETAILS_IN_IMAGE');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/roommate-posts/post_1/report',
        method: 'POST',
        body: { reason: 'CONTACT_DETAILS_IN_IMAGE' },
      });
    });

    it('exposes only the 7 safe community report reasons', () => {
      expect(COMMUNITY_REPORT_REASONS).toHaveLength(7);
      expect(COMMUNITY_REPORT_REASONS.map((r) => r.value)).toEqual(
        expect.arrayContaining(['BROKER_OR_COMMERCIAL_PROMOTION', 'PROMOTIONAL_IMAGE', 'CONTACT_DETAILS_IN_IMAGE'])
      );
    });
  });

  describe('submitAppeal', () => {
    it('posts an appeal for a rejected post', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({ id: 'appeal_1' });
      const result = await submitAppeal({
        targetType: 'ROOMMATE_POST',
        targetId: 'post_1',
        reason: 'Genuine personal post about my own room',
        detail: 'I live here since June.',
      });
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/appeals',
        method: 'POST',
        body: {
          targetType: 'ROOMMATE_POST',
          targetId: 'post_1',
          reason: 'Genuine personal post about my own room',
          detail: 'I live here since June.',
        },
      });
      expect(result.id).toBe('appeal_1');
    });
  });

  describe('fetchMyAppeals', () => {
    it('maps appeal projections without private fields', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce([
        {
          id: 'appeal_9',
          targetType: 'ROOMMATE_POST',
          targetId: 'post_9',
          status: 'SUBMITTED',
          reason: 'Please review again',
          createdAt: '2026-08-03T10:00:00Z',
        },
      ]);
      const appeals = await fetchMyAppeals();
      expect(appeals[0].status).toBe('SUBMITTED');
      expect(appeals[0].targetType).toBe('ROOMMATE_POST');
      expect(appeals[0].reason).toBe('Please review again');
    });
  });

  describe('fetchMyRestrictions + hasPostingRestriction', () => {
    it('flags posting-blocking capabilities', () => {
      expect(
        hasPostingRestriction([
          { id: 'r1', capability: 'ROOMMATE_POST_CREATE_RESTRICTED', restriction: 'BLOCKED', reason: null, appliedAt: '', expiresAt: null, source: null },
        ])
      ).toBe(true);
      expect(
        hasPostingRestriction([
          { id: 'r2', capability: 'PARTNER_ADVERTISING_UNDER_REVIEW', restriction: 'UNDER_REVIEW', reason: null, appliedAt: '', expiresAt: null, source: null },
        ])
      ).toBe(false);
      expect(hasPostingRestriction([])).toBe(false);
    });

    it('fetches the caller\'s own restrictions', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce([
        {
          id: 'rest_1',
          capability: 'ROOMMATE_MEDIA_UPLOAD_RESTRICTED',
          restriction: 'BLOCKED',
          reason: 'Promotional images uploaded repeatedly',
          appliedAt: '2026-08-01T00:00:00Z',
          expiresAt: '2026-09-01T00:00:00Z',
          source: 'moderator',
          appealAvailable: true,
        },
      ]);
      const restrictions = await fetchMyRestrictions();
      expect(restrictions).toHaveLength(1);
      expect(restrictions[0].capability).toBe('ROOMMATE_MEDIA_UPLOAD_RESTRICTED');
      expect(restrictions[0].appealAvailable).toBe(true);
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/restrictions/mine',
        method: 'GET',
      });
    });
  });

  describe('tenant verification', () => {
    it('requests verification and returns the one-time live code when requested', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
        verificationId: 'verif_1',
        liveCode: '482913',
      });
      const result = await requestTenantVerification('post_1', 'LIVE_ROOM_PHOTO_WITH_CODE');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/tenant-verifications/requests',
        method: 'POST',
        body: { postId: 'post_1', method: 'LIVE_ROOM_PHOTO_WITH_CODE' },
      });
      expect(result.verificationId).toBe('verif_1');
      expect(result.liveCode).toBe('482913');
    });

    it('submits the live photo with code + media id', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({});
      await submitLivePhoto('verif_1', '482913', 'media_5');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/tenant-verifications/verif_1/live-photo',
        method: 'POST',
        body: { code: '482913', mediaId: 'media_5' },
      });
    });

    it('submits private evidence for document methods', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({});
      await submitVerificationEvidence('verif_1', 'media_7');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/tenant-verifications/verif_1/evidence',
        method: 'POST',
        body: { mediaId: 'media_7' },
      });
    });

    it('refreshes the live code', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({ liveCode: '112233' });
      const result = await refreshVerificationCode('verif_1');
      expect(result.liveCode).toBe('112233');
    });

    it('maps my verifications with safe projections', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce([
        {
          id: 'verif_2',
          postId: 'post_2',
          method: 'REDACTED_RENT_RECEIPT',
          status: 'PENDING',
          requestedAt: '2026-08-03T10:00:00Z',
          hasEvidence: true,
        },
      ]);
      const verifications = await fetchMyVerifications();
      expect(verifications[0].method).toBe('REDACTED_RENT_RECEIPT');
      expect(verifications[0].status).toBe('PENDING');
      expect(verifications[0].hasEvidence).toBe(true);
    });
  });
});
