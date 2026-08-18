import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serializeQueryParams, apiFetch } from './client';

describe('serializeQueryParams', () => {
  it('returns empty string when params is undefined or empty', () => {
    expect(serializeQueryParams()).toBe('');
    expect(serializeQueryParams({})).toBe('');
  });

  it('filters out null, undefined, and empty string values', () => {
    const params = {
      search: 'flat',
      minRent: undefined,
      maxRent: null,
      emptyStr: '',
      bedrooms: 2,
    };
    expect(serializeQueryParams(params)).toBe('?search=flat&bedrooms=2');
  });

  it('expands arrays correctly', () => {
    const params = {
      tags: ['balcony', 'parking'],
      city: 'Delhi',
    };
    expect(serializeQueryParams(params)).toBe('?tags=balcony&tags=parking&city=Delhi');
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles 204 No Content response gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiFetch({ path: '/api/v1/auth/logout', method: 'POST', baseUrl: 'http://api.local' });
    expect(result).toEqual({});
  });

  it('throws normalized ApiError on non-ok status code', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ message: 'Listing not found' })),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      apiFetch({ path: '/api/v1/listings/invalid-id', baseUrl: 'http://api.local' })
    ).rejects.toThrow('Listing not found');
  });
});
