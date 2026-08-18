import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  selectAd,
  selectAds,
  trackAdImpression,
  trackAdClick,
  trackAdViewable,
  normalizeAdSelection,
  normalizeClickRedirect,
  queueAdImpressions,
  flushAdImpressions,
  resetImpressionBatch,
  resetSelectCache,
} from './ads';
import { apiFetch } from '@/lib/api/client';
import {
  resetImpressionTracker,
  shouldRecordImpression,
  markImpressionRecorded,
  hasRecordedImpression,
} from '@/lib/ads/impression-tracker';
import { isSafeRedirectUrl, sanitizeRedirectUrl } from '@/lib/ads/safe-redirect';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Ads API Service', () => {
  const mockApiFetch = vi.mocked(apiFetch);

  beforeEach(() => {
    vi.clearAllMocks();
    resetImpressionTracker();
    resetImpressionBatch();
    resetSelectCache();
  });

  describe('normalizeAdSelection', () => {
    it('maps creative + token from nested select payload', () => {
      const creative = normalizeAdSelection({
        creative: {
          id: 'c1',
          title: 'Campus Store',
          description: 'Student discounts',
          imageUrl: 'https://cdn.example.com/ad.jpg',
          sponsorName: 'CampusCo',
          token: 'tok-abc',
        },
        destination: 'https://example.com/offer',
      });

      expect(creative).toMatchObject({
        id: 'c1',
        title: 'Campus Store',
        token: 'tok-abc',
        sponsorName: 'CampusCo',
        destinationUrl: 'https://example.com/offer',
      });
    });

    it('accepts ad envelope and alternate field names', () => {
      const creative = normalizeAdSelection({
        data: {
          ad: {
            id: 'a1',
            headline: 'Move-in deal',
            body: 'Save on deposits',
            mediaUrl: 'https://cdn.example.com/m.png',
            advertiserName: 'FlatAds',
            selectionToken: 'sel-1',
            clickUrl: 'https://ads.example.com/c',
          },
        },
      });

      expect(creative?.title).toBe('Move-in deal');
      expect(creative?.description).toBe('Save on deposits');
      expect(creative?.imageUrl).toBe('https://cdn.example.com/m.png');
      expect(creative?.token).toBe('sel-1');
      expect(creative?.destinationUrl).toBe('https://ads.example.com/c');
    });

    it('returns null when token is missing or payload empty', () => {
      expect(normalizeAdSelection(null)).toBeNull();
      expect(normalizeAdSelection({})).toBeNull();
      expect(normalizeAdSelection({ creative: { title: 'No token' } })).toBeNull();
    });

    it('captures dedicated click/viewable tokens from the select payload', () => {
      const creative = normalizeAdSelection({
        creative: {
          id: 'c1',
          title: 'Campus Store',
          token: 'imp-tok',
        },
        clickToken: 'click-tok',
        viewableToken: 'view-tok',
      });

      expect(creative?.token).toBe('imp-tok');
      expect(creative?.clickToken).toBe('click-tok');
      expect(creative?.viewableToken).toBe('view-tok');
    });

    it('falls back to the impression token when click token is absent', () => {
      const creative = normalizeAdSelection({
        creative: { id: 'c2', title: 'No click token', token: 'imp-tok' },
      });

      expect(creative?.clickToken).toBeUndefined();
    });
  });

  describe('normalizeClickRedirect', () => {
    it('extracts safe redirect URLs from common response shapes', () => {
      expect(normalizeClickRedirect({ redirectUrl: 'https://ok.example/x' })).toBe(
        'https://ok.example/x'
      );
      expect(normalizeClickRedirect({ data: { url: 'https://ok.example/y' } })).toBe(
        'https://ok.example/y'
      );
      expect(normalizeClickRedirect({ destination: '/internal/promo' })).toBe('/internal/promo');
    });

    it('rejects unsafe redirect targets', () => {
      expect(normalizeClickRedirect({ url: 'javascript:alert(1)' })).toBeNull();
      expect(normalizeClickRedirect({ url: 'data:text/html,hi' })).toBeNull();
    });
  });

  describe('selectAd', () => {
    it('posts placement body and returns normalized creative', async () => {
      mockApiFetch.mockResolvedValueOnce({
        creative: {
          id: 'c1',
          title: 'Home Ad',
          token: 't1',
        },
      });

      const ad = await selectAd({
        placement: 'home',
        collegeId: 'col-1',
        campusId: 'cam-1',
      });

      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/ads/select',
        method: 'POST',
        body: {
          placement: 'home',
          collegeId: 'col-1',
          campusId: 'cam-1',
        },
      });
      expect(ad?.token).toBe('t1');
      expect(ad?.title).toBe('Home Ad');
    });

    it('isolates failures — returns null instead of throwing', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Network down'));
      await expect(selectAd({ placement: 'search' })).resolves.toBeNull();
    });

    it('rejects invalid placement without calling API', async () => {
      // @ts-expect-error intentional invalid placement for test
      await expect(selectAd({ placement: 'sidebar' })).resolves.toBeNull();
      expect(mockApiFetch).not.toHaveBeenCalled();
    });
  });

  describe('selectAds request caching', () => {
    it('shares ONE request for identical params (StrictMode double-mount)', async () => {
      mockApiFetch.mockResolvedValue({
        items: [{ creative: { id: 'a1', title: 'A', token: 'tok-1' } }],
      });

      const [a, b] = await Promise.all([
        selectAds({ placement: 'home', tiers: ['MAXIMUM'], count: 12 }),
        selectAds({ placement: 'home', tiers: ['MAXIMUM'], count: 12 }),
      ]);

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(1);
    });

    it('fetches separately for different tier groups', async () => {
      mockApiFetch.mockResolvedValue({ items: [] });

      await selectAds({ placement: 'home', tiers: ['MAXIMUM'], count: 12 });
      await selectAds({ placement: 'home', tiers: ['PREMIUM'], count: 12 });

      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });

    it('reuses a fresh-cache call after the first resolves', async () => {
      mockApiFetch.mockResolvedValue({ items: [] });

      await selectAds({ placement: 'home', count: 12 });
      await selectAds({ placement: 'home', count: 12 });

      // Second call within TTL hits the cache — still one POST
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('impression deduplication', () => {
    it('shouldRecordImpression / markImpressionRecorded gate duplicates', () => {
      expect(shouldRecordImpression('tok')).toBe(true);
      markImpressionRecorded('tok');
      expect(shouldRecordImpression('tok')).toBe(false);
      expect(hasRecordedImpression('tok')).toBe(true);
    });

    it('trackAdImpression sends once per token', async () => {
      mockApiFetch.mockResolvedValue({});

      await expect(trackAdImpression('imp-1')).resolves.toBe(true);
      await expect(trackAdImpression('imp-1')).resolves.toBe(true);

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/ads/events/impression',
        method: 'POST',
        body: { token: 'imp-1' },
      });
    });

    it('soft-fails impression network errors without throwing', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('timeout'));
      await expect(trackAdImpression('imp-fail')).resolves.toBe(false);
      // Already marked — second call skips network
      await expect(trackAdImpression('imp-fail')).resolves.toBe(true);
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulk impression batching', () => {
    it('flushes queued tokens as ONE batch request', async () => {
      mockApiFetch.mockResolvedValue({ accepted: 3, rejected: [] });

      queueAdImpressions(['a', 'b', 'c']);
      await flushAdImpressions();

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/ads/events/batch',
        method: 'POST',
        body: {
          events: [
            { type: 'impression', token: 'a' },
            { type: 'impression', token: 'b' },
            { type: 'impression', token: 'c' },
          ],
        },
      });
    });

    it('dedupes tokens across queue calls (one impression per ad per session)', async () => {
      mockApiFetch.mockResolvedValue({ accepted: 2, rejected: [] });

      queueAdImpressions(['x', 'y']);
      queueAdImpressions(['y', 'z']); // 'y' already queued+marked
      await flushAdImpressions();

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      const body = mockApiFetch.mock.calls[0]?.[0] as { body: { events: Array<{ token: string }> } };
      expect(body.body.events.map((e) => e.token).sort()).toEqual(['x', 'y', 'z']);
    });

    it('falls back to per-token concurrent POSTs when the batch endpoint fails', async () => {
      mockApiFetch
        .mockRejectedValueOnce(new Error('batch unavailable'))
        .mockResolvedValue({});

      queueAdImpressions(['p', 'q']);
      await flushAdImpressions();

      // 1 batch attempt + 2 per-token fallback calls
      expect(mockApiFetch).toHaveBeenCalledTimes(3);
      expect(mockApiFetch).toHaveBeenNthCalledWith(2, {
        path: '/api/v1/ads/events/impression',
        method: 'POST',
        body: { token: 'p' },
      });
      expect(mockApiFetch).toHaveBeenNthCalledWith(3, {
        path: '/api/v1/ads/events/impression',
        method: 'POST',
        body: { token: 'q' },
      });
    });

    it('flush with empty queue makes no network call', async () => {
      await flushAdImpressions();
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it('flushes immediately when the queue hits the burst threshold', async () => {
      mockApiFetch.mockResolvedValue({ accepted: 8, rejected: [] });

      // 8 co-visible ads → one immediate batch, no manual flush needed
      queueAdImpressions(['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']);

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      const body = mockApiFetch.mock.calls[0]?.[0] as { body: { events: Array<{ token: string }> } };
      expect(body.body.events).toHaveLength(8);
    });
  });

  describe('trackAdViewable', () => {
    it('posts to the viewable endpoint', async () => {
      mockApiFetch.mockResolvedValue({});

      await expect(trackAdViewable('view-tok')).resolves.toBe(true);
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/ads/events/viewable',
        method: 'POST',
        body: { token: 'view-tok' },
      });
    });

    it('isolates viewable failures', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('500'));
      await expect(trackAdViewable('view-tok')).resolves.toBe(false);
    });
  });

  describe('trackAdClick', () => {
    it('returns sanitized redirect from click endpoint', async () => {
      mockApiFetch.mockResolvedValueOnce({
        redirectUrl: 'https://sponsor.example/landing',
      });

      const url = await trackAdClick('click-tok');
      expect(url).toBe('https://sponsor.example/landing');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/ads/events/click',
        method: 'POST',
        body: { token: 'click-tok' },
      });
    });

    it('isolates click failures', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('401'));
      await expect(trackAdClick('x')).resolves.toBeNull();
    });
  });
});

describe('safe redirect', () => {
  it('allows http(s) and relative paths', () => {
    expect(isSafeRedirectUrl('https://example.com/a')).toBe(true);
    expect(isSafeRedirectUrl('http://example.com/a')).toBe(true);
    expect(isSafeRedirectUrl('/search?q=1')).toBe(true);
  });

  it('blocks dangerous schemes and credentialed URLs', () => {
    expect(isSafeRedirectUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeRedirectUrl('data:text/html,x')).toBe(false);
    expect(isSafeRedirectUrl('//evil.com')).toBe(false);
    expect(isSafeRedirectUrl('https://user:pass@evil.com')).toBe(false);
    expect(sanitizeRedirectUrl('javascript:void(0)')).toBeNull();
  });
});
