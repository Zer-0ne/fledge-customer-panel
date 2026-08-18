import { describe, it, expect } from 'vitest';
import { isRoommatePostExpired, mapRawToRoommatePost } from '@/lib/api/services/roommates';
import { RoommatePost } from '@/types';

describe('Roommate Filtering & Domain Utilities', () => {
  it('correctly identifies expired post by past expiresAt date', () => {
    const expiredPost: Partial<RoommatePost> = {
      expiresAt: '2020-01-01T00:00:00Z',
      status: 'active',
    };
    expect(isRoommatePostExpired(expiredPost)).toBe(true);
  });

  it('correctly identifies active post with future expiresAt date', () => {
    const activePost: Partial<RoommatePost> = {
      expiresAt: new Date(Date.now() + 1000000).toISOString(),
      status: 'active',
    };
    expect(isRoommatePostExpired(activePost)).toBe(false);
  });

  it('preserves status fulfilled even if expiresAt is passed', () => {
    const fulfilledPost: Partial<RoommatePost> = {
      expiresAt: '2020-01-01T00:00:00Z',
      status: 'fulfilled',
    };
    expect(isRoommatePostExpired(fulfilledPost)).toBe(false);
  });

  it('normalizes preference flags accurately', () => {
    const raw = {
      id: 'rm_100',
      title: 'Need flatmate',
      body: 'Room near GTB Nagar',
      preferences: {
        vegetarianOnly: true,
        studentOnly: true,
        gender: 'female',
      },
    };

    const domainPost = mapRawToRoommatePost(raw);
    expect(domainPost.preferences?.vegetarianOnly).toBe(true);
    expect(domainPost.preferences?.studentOnly).toBe(true);
    expect(domainPost.preferences?.gender).toBe('female');
  });
});
