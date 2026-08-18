import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchListingInterests,
  submitListingInterest,
  updateListingInterestStatus,
  startConversationFromInterest,
  normalizeListingInterestsResponse,
} from './interests';
import { apiFetch } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Listing Interests API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeListingInterestsResponse', () => {
    it('correctly separates grouped incoming and outgoing arrays', () => {
      const mockRaw = {
        incoming: [
          { id: 'int-1', listingId: 'l-1', status: 'pending', direction: 'incoming' },
        ],
        outgoing: [
          { id: 'int-2', listingId: 'l-2', status: 'accepted', direction: 'outgoing' },
        ],
      };

      const result = normalizeListingInterestsResponse(mockRaw);
      expect(result.incoming).toHaveLength(1);
      expect(result.outgoing).toHaveLength(1);
      expect(result.incoming[0].id).toBe('int-1');
      expect(result.outgoing[0].id).toBe('int-2');
    });

    it('groups flat list items by direction property', () => {
      const mockFlatList = [
        { id: 'int-10', listingId: 'l-1', status: 'pending', direction: 'incoming' },
        { id: 'int-11', listingId: 'l-2', status: 'pending', direction: 'outgoing' },
      ];

      const result = normalizeListingInterestsResponse(mockFlatList);
      expect(result.incoming).toHaveLength(1);
      expect(result.outgoing).toHaveLength(1);
      expect(result.incoming[0].id).toBe('int-10');
      expect(result.outgoing[0].id).toBe('int-11');
    });
  });

  describe('submitListingInterest', () => {
    it('sends POST request with message body and returns created interest', async () => {
      const mockResponse = {
        id: 'int-100',
        listingId: 'listing-456',
        message: 'Interested in moving in Sept 1st',
        status: 'pending',
        direction: 'outgoing',
      };
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: mockResponse });

      const result = await submitListingInterest('listing-456', 'Interested in moving in Sept 1st');

      expect(apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/listings/listing-456/interests',
        method: 'POST',
        body: { message: 'Interested in moving in Sept 1st' },
      });
      expect(result.id).toBe('int-100');
      expect(result.status).toBe('pending');
    });

    it('throws error when listing ID is not provided', async () => {
      await expect(submitListingInterest('')).rejects.toThrow('Listing ID is required');
    });
  });

  describe('fetchListingInterests', () => {
    it('fetches listing interests and returns grouped structure', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        incoming: [{ id: 'inc-1', status: 'pending', direction: 'incoming' }],
        outgoing: [{ id: 'out-1', status: 'accepted', direction: 'outgoing' }],
      });

      const res = await fetchListingInterests();
      expect(res.incoming).toHaveLength(1);
      expect(res.outgoing).toHaveLength(1);
    });

    it('returns empty grouped arrays on error', async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Network error'));
      const res = await fetchListingInterests();
      expect(res).toEqual({ incoming: [], outgoing: [] });
    });
  });

  describe('updateListingInterestStatus', () => {
    it('sends PATCH request with status transition to accepted', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        id: 'int-1',
        status: 'accepted',
      });

      const res = await updateListingInterestStatus('int-1', 'accepted');

      expect(apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/listing-interests/int-1',
        method: 'PATCH',
        body: { status: 'accepted' },
      });
      expect(res.status).toBe('accepted');
    });

    it('sends PATCH request with status transition to withdrawn', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        id: 'int-2',
        status: 'withdrawn',
      });

      const res = await updateListingInterestStatus('int-2', 'withdrawn');

      expect(apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/listing-interests/int-2',
        method: 'PATCH',
        body: { status: 'withdrawn' },
      });
      expect(res.status).toBe('withdrawn');
    });
  });

  describe('startConversationFromInterest', () => {
    it('initiates conversation thread using listing_interest context', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: { id: 'conv-999', contextType: 'listing_interest', contextId: 'int-1' },
      });

      const res = await startConversationFromInterest('int-1');

      expect(apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/conversations',
        method: 'POST',
        body: {
          contextType: 'listing_interest',
          contextId: 'int-1',
        },
      });
      expect(res.id).toBe('conv-999');
    });
  });
});
