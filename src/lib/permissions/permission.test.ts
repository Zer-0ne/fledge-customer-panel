import { describe, it, expect } from 'vitest';
import { hasPermission } from '@/components/providers/auth-provider';

describe('hasPermission (Phase 6 permission predicate)', () => {
  it('grants when the exact permission is held', () => {
    expect(hasPermission(['listing.manage_own', 'profile.manage_own'], 'listing.manage_own')).toBe(true);
  });

  it('denies when the permission is not held', () => {
    expect(hasPermission(['listing.manage_own'], 'moderation.cases.review')).toBe(false);
  });

  it('grants everything to the super-admin wildcard', () => {
    expect(hasPermission(['*'], 'moderation.cases.review')).toBe(true);
    expect(hasPermission(['*'], 'analytics.dashboard.read')).toBe(true);
  });

  it('treats an empty required permission as granted (ungated)', () => {
    expect(hasPermission([], '')).toBe(true);
  });

  it('works with empty permission lists', () => {
    expect(hasPermission([], 'listing.manage_own')).toBe(false);
  });
});
