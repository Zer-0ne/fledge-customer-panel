import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFavorites, toggleListingFavorite } from './favorites';
import { apiFetch } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Favorites API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchFavorites', () => {
    it('normalizes flat array response', async () => {
      const mockRaw = [
        {
          id: 'fav-1',
          userId: 'user-1',
          listingId: 'list-1',
          listing: { id: 'list-1', title: 'Luxury 2BHK Apartment', monthlyRentPaise: 2500000 },
          createdAt: '2026-07-30T10:00:00Z',
        },
      ];
      vi.mocked(apiFetch).mockResolvedValueOnce(mockRaw);

      const res = await fetchFavorites();
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('fav-1');
      expect(res[0].listingId).toBe('list-1');
      expect(res[0].listing.title).toBe('Luxury 2BHK Apartment');
    });

    it('normalizes envelope object response { items: [...] }', async () => {
      const mockEnvelope = {
        items: [
          {
            id: 'fav-2',
            listingId: 'list-2',
            listing: { id: 'list-2', title: 'Studio Flat near Campus', monthlyRentPaise: 1500000 },
          },
        ],
      };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockEnvelope);

      const res = await fetchFavorites();
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('fav-2');
      expect(res[0].listingId).toBe('list-2');
    });

    it('returns empty array when API call fails', async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Network error'));
      const res = await fetchFavorites();
      expect(res).toEqual([]);
    });
  });

  describe('toggleListingFavorite', () => {
    it('sends POST request to favorite listing when currently unfavorited', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      const result = await toggleListingFavorite('list-100', false);

      expect(apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/listings/list-100/favorite',
        method: 'POST',
      });
      expect(result).toBe(true);
    });

    it('sends DELETE request to unfavorite listing when currently favorited', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      const result = await toggleListingFavorite('list-100', true);

      expect(apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/listings/list-100/favorite',
        method: 'DELETE',
      });
      expect(result).toBe(false);
    });

    it('throws error when listing ID is missing', async () => {
      await expect(toggleListingFavorite('', false)).rejects.toThrow('Listing ID is required');
    });
  });
});
