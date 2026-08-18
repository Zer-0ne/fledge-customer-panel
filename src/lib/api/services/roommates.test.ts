import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchRoommatePosts,
  createRoommatePost,
  fetchMyRoommatePosts,
  submitRoommateInterest,
  updateRoommateInterestStatus,
  isRoommatePostExpired,
  mapRawToRoommatePost,
  mapRawToRoommatePostResult,
  normalizeRoommateInterestsResponse,
} from './roommates';
import * as clientModule from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Roommates API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isRoommatePostExpired', () => {
    it('returns true if post status is expired', () => {
      expect(isRoommatePostExpired({ status: 'expired' })).toBe(true);
    });

    it('returns true if expiresAt is in the past', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      expect(isRoommatePostExpired({ expiresAt: pastDate })).toBe(true);
    });

    it('returns false if expiresAt is in the future', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(isRoommatePostExpired({ expiresAt: futureDate })).toBe(false);
    });

    it('returns false if no expiresAt is set and status is active', () => {
      expect(isRoommatePostExpired({ status: 'active' })).toBe(false);
    });
  });

  describe('mapRawToRoommatePost', () => {
    it('correctly maps raw backend object to RoommatePost domain model', () => {
      const raw = {
        id: 'post_123',
        userId: 'usr_456',
        title: 'Need flatmate for 2BHK',
        body: 'Looking for a clean student to share rent.',
        budgetPaise: 800000,
        expiresAt: new Date(Date.now() + 100000).toISOString(),
        locality: 'North Campus',
        preferences: { vegetarian: true },
      };

      const post = mapRawToRoommatePost(raw);
      expect(post.id).toBe('post_123');
      expect(post.title).toBe('Need flatmate for 2BHK');
      expect(post.description).toBe('Looking for a clean student to share rent.');
      expect(post.budgetPaise).toBe(800000);
      expect(post.status).toBe('active');
    });

    it('marks post as expired if expiresAt is in the past', () => {
      const raw = {
        id: 'post_old',
        title: 'Old post',
        expiresAt: new Date(Date.now() - 50000).toISOString(),
      };
      const post = mapRawToRoommatePost(raw);
      expect(post.status).toBe('expired');
    });
  });

  describe('fetchRoommatePosts', () => {
    it('calls GET /api/v1/roommate-posts with provided query filters', async () => {
      const mockPosts = [
        { id: '1', title: 'Post 1', expiresAt: new Date(Date.now() + 10000).toISOString() },
      ];
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({ items: mockPosts });

      const posts = await fetchRoommatePosts({ locality: 'South Campus', collegeId: 'col_1' });
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/roommate-posts',
        method: 'GET',
        params: { locality: 'South Campus', collegeId: 'col_1' },
      });
      expect(posts.length).toBe(1);
      expect(posts[0].id).toBe('1');
    });

    it('returns empty array if fetch fails', async () => {
      vi.mocked(clientModule.apiFetch).mockRejectedValueOnce(new Error('Network error'));
      const posts = await fetchRoommatePosts();
      expect(posts).toEqual([]);
    });
  });

  describe('createRoommatePost', () => {
    it('throws error if required fields are missing', async () => {
      await expect(
        createRoommatePost({ title: '', body: 'body', expiresAt: '2026-12-31' })
      ).rejects.toThrow('Title, body, and expiresAt are required');
    });

    it('calls POST /api/v1/roommate-posts with valid parameters', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      const mockResponse = {
        data: {
          id: 'new_post_1',
          title: 'Roommate search',
          body: 'Great room available',
          expiresAt,
          budgetPaise: 1000000,
        },
      };
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce(mockResponse);

      const result = await createRoommatePost({
        title: 'Roommate search',
        body: 'Great room available',
        expiresAt,
        budgetPaise: 1000000,
        preferences: { vegetarianOnly: true },
      });

      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/roommate-posts',
        method: 'POST',
        body: {
          postType: 'NEED_ROOMMATE',
          collegeId: undefined,
          campusId: undefined,
          listingId: undefined,
          locality: undefined,
          title: 'Roommate search',
          body: 'Great room available',
          budgetPaise: 1000000,
          expiresAt,
          moveInFrom: undefined,
          moveInTo: undefined,
          moveOutAt: undefined,
          mediaIds: undefined,
          preferences: { vegetarianOnly: true },
        },
      });
      expect(result.id).toBe('new_post_1');
    });
  });

  describe('submitRoommateInterest', () => {
    it('calls POST /api/v1/roommate-posts/{id}/interests', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
        data: { id: 'rmi_1', postId: 'post_123', status: 'pending' },
      });

      const interest = await submitRoommateInterest('post_123', 'I would love to be roommates!');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/roommate-posts/post_123/interests',
        method: 'POST',
        body: { message: 'I would love to be roommates!' },
      });
      expect(interest.postId).toBe('post_123');
    });
  });

  describe('normalizeRoommateInterestsResponse', () => {
    it('correctly splits incoming and outgoing interest requests', () => {
      const raw = {
        items: [
          { id: '1', direction: 'incoming', status: 'pending' },
          { id: '2', direction: 'outgoing', status: 'accepted' },
        ],
      };
      const grouped = normalizeRoommateInterestsResponse(raw);
      expect(grouped.incoming.length).toBe(1);
      expect(grouped.outgoing.length).toBe(1);
      expect(grouped.incoming[0].id).toBe('1');
      expect(grouped.outgoing[0].id).toBe('2');
    });

    it('calculates direction and permission flags using currentUserId vs participant IDs', () => {
      const sahilKhanId = 'usr_sahil_khan';
      const khanSahilId = 'usr_khan_sahil';

      const rawItems = [
        {
          id: 'rmi_101',
          postId: 'post_1',
          requesterUserId: sahilKhanId,
          postOwnerUserId: khanSahilId,
          userId: sahilKhanId,
          status: 'pending',
        },
      ];

      // Perspective of Sahil Khan (Requester)
      const sahilGrouped = normalizeRoommateInterestsResponse(rawItems, sahilKhanId);
      expect(sahilGrouped.outgoing.length).toBe(1);
      expect(sahilGrouped.incoming.length).toBe(0);
      expect(sahilGrouped.outgoing[0].direction).toBe('outgoing');
      expect(sahilGrouped.outgoing[0].canWithdraw).toBe(true);
      expect(sahilGrouped.outgoing[0].canAccept).toBe(false);
      expect(sahilGrouped.outgoing[0].canReject).toBe(false);

      // Perspective of Khan Sahil (Post Owner / Receiver)
      const khanGrouped = normalizeRoommateInterestsResponse(rawItems, khanSahilId);
      expect(khanGrouped.incoming.length).toBe(1);
      expect(khanGrouped.outgoing.length).toBe(0);
      expect(khanGrouped.incoming[0].direction).toBe('incoming');
      expect(khanGrouped.incoming[0].canWithdraw).toBe(false);
      expect(khanGrouped.incoming[0].canAccept).toBe(true);
      expect(khanGrouped.incoming[0].canReject).toBe(true);
    });

    it('handles status transitions (accepted, rejected, withdrawn) with correct direction', () => {
      const sahilKhanId = 'usr_sahil_khan';
      const khanSahilId = 'usr_khan_sahil';

      const acceptedItem = {
        id: 'rmi_102',
        postId: 'post_1',
        requesterUserId: sahilKhanId,
        postOwnerUserId: khanSahilId,
        status: 'accepted',
      };

      const sahilAccepted = normalizeRoommateInterestsResponse([acceptedItem], sahilKhanId);
      expect(sahilAccepted.outgoing[0].status).toBe('accepted');
      expect(sahilAccepted.outgoing[0].canWithdraw).toBe(false);
      expect(sahilAccepted.outgoing[0].canAccept).toBe(false);

      const khanAccepted = normalizeRoommateInterestsResponse([acceptedItem], khanSahilId);
      expect(khanAccepted.incoming[0].status).toBe('accepted');
      expect(khanAccepted.incoming[0].canAccept).toBe(false);
      expect(khanAccepted.incoming[0].canReject).toBe(false);
    });
  });

  describe('updateRoommateInterestStatus', () => {
    it('calls PATCH /api/v1/roommate-interests/{id} with status', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
        data: { id: 'rmi_99', status: 'accepted' },
      });

      const res = await updateRoommateInterestStatus('rmi_99', 'accepted');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/roommate-interests/rmi_99',
        method: 'PATCH',
        body: { status: 'accepted' },
      });
      expect(res.status).toBe('accepted');
    });
  });

  describe('fetchMyRoommatePosts', () => {
    it('calls GET /api/v1/roommate-posts/mine and maps moderation fields', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce([
        {
          id: 'post_mine_1',
          authorId: 'usr_1',
          postType: 'LEAVING_FLAT_NEED_REPLACEMENT',
          title: 'Leaving flat in Jan',
          body: 'Need a replacement tenant for my room.',
          status: 'active',
          publicationStatus: 'HIDDEN',
          moderationStatus: 'REJECTED_CONTACT_INFORMATION',
          mediaIds: ['media_1'],
          createdAt: new Date().toISOString(),
          decision: {
            safeReason: 'Contact details were found in an image.',
            redirectTarget: 'EDIT_PERSONAL_POST',
            changeHints: ['Remove the image that contains contact details.'],
          },
        },
      ]);

      const posts = await fetchMyRoommatePosts();

      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/roommate-posts/mine',
        method: 'GET',
      });
      expect(posts).toHaveLength(1);
      expect(posts[0].postType).toBe('LEAVING_FLAT_NEED_REPLACEMENT');
      expect(posts[0].publicationStatus).toBe('HIDDEN');
      expect(posts[0].moderationStatus).toBe('REJECTED_CONTACT_INFORMATION');
      expect(posts[0].mediaIds).toEqual(['media_1']);
      expect(posts[0].decision?.safeReason).toBe('Contact details were found in an image.');
      expect(posts[0].decision?.redirectTarget).toBe('EDIT_PERSONAL_POST');
    });

    it('returns an empty list on failure instead of throwing', async () => {
      vi.mocked(clientModule.apiFetch).mockRejectedValueOnce(new Error('network'));
      const posts = await fetchMyRoommatePosts();
      expect(posts).toEqual([]);
    });
  });

  describe('mapRawToRoommatePostResult', () => {
    it('maps the create/update result envelope including requiredAction', () => {
      const result = mapRawToRoommatePostResult({
        id: 'post_abc',
        postId: 'post_abc',
        status: 'active',
        publicationStatus: 'PENDING',
        moderationStatus: 'PENDING_MANUAL_REVIEW',
        requiredAction: { type: 'TENANT_VERIFICATION', verificationId: 'verif_1' },
      });
      expect(result.id).toBe('post_abc');
      expect(result.publicationStatus).toBe('PENDING');
      expect(result.moderationStatus).toBe('PENDING_MANUAL_REVIEW');
      expect(result.requiredAction).toEqual({ type: 'TENANT_VERIFICATION', verificationId: 'verif_1' });
    });

    it('maps CHANGES_REQUIRED action hints', () => {
      const result = mapRawToRoommatePostResult({
        id: 'post_def',
        publicationStatus: 'DRAFT',
        moderationStatus: 'CHANGES_REQUIRED',
        requiredAction: { type: 'CHANGES_REQUIRED', hints: ['Replace the promotional image.'] },
      });
      expect(result.requiredAction).toEqual({ type: 'CHANGES_REQUIRED', hints: ['Replace the promotional image.'] });
    });
  });
});
