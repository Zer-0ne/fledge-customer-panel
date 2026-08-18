import { describe, it, expect } from 'vitest';
import { isAllowedCustomerEndpoint } from './allowlist';

describe('Customer BFF allowlist — Phase 12 community endpoints', () => {
  const allowed: [string, string][] = [
    ['GET', '/api/v1/roommate-posts/mine'],
    ['POST', '/api/v1/roommate-posts/123e4567-e89b-12d3-a456-426614174000/report'],
    ['POST', '/api/v1/appeals'],
    ['GET', '/api/v1/appeals/mine'],
    ['GET', '/api/v1/restrictions/mine'],
    ['POST', '/api/v1/media/uploads'],
    ['POST', '/api/v1/ads/events/viewable'],
    ['POST', '/api/v1/ads/events/batch'],
    ['GET', '/api/v1/users/blocked'],
    ['GET', '/api/v1/users/blocked-by'],
    ['POST', '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/complete'],
    ['GET', '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/download'],
    ['DELETE', '/api/v1/media/123e4567-e89b-12d3-a456-426614174000'],
    ['POST', '/api/v1/tenant-verifications/requests'],
    ['POST', '/api/v1/tenant-verifications/abc-123/live-photo'],
    ['POST', '/api/v1/tenant-verifications/abc-123/evidence'],
    ['POST', '/api/v1/tenant-verifications/abc-123/confirm'],
    ['POST', '/api/v1/tenant-verifications/abc-123/refresh-code'],
    ['GET', '/api/v1/tenant-verifications/mine'],
    ['DELETE', '/api/v1/tenant-verifications/abc-123/evidence'],
    // Phase 7 notification center upgrades
    ['GET', '/api/v1/notifications/unread-count'],
    ['POST', '/api/v1/notifications/read-all'],
    ['PATCH', '/api/v1/notifications/123e4567-e89b-12d3-a456-426614174000/archive'],
    ['GET', '/api/v1/notifications/preferences'],
    ['PUT', '/api/v1/notifications/preferences'],
    ['PUT', '/api/v1/notifications/preferences/quiet-hours'],
    // Web push device lifecycle
    ['POST', '/api/v1/notifications/devices'],
    ['PATCH', '/api/v1/notifications/devices/install-123'],
    ['DELETE', '/api/v1/notifications/devices/install-123'],
    ['POST', '/api/v1/notifications/devices/install-123/heartbeat'],
    // Onboarding (post-login question flow)
    ['GET', '/api/v1/onboarding/status'],
    ['GET', '/api/v1/onboarding/questions'],
    ['POST', '/api/v1/onboarding/responses'],
    ['POST', '/api/v1/onboarding/skip'],
  ];

  it.each(allowed)('%s %s is allowed', (method, path) => {
    expect(isAllowedCustomerEndpoint(method, path)).toBe(true);
  });

  const denied: [string, string][] = [
    // GET on a specific post id (no such customer endpoint) must NOT match /mine
    ['GET', '/api/v1/roommate-posts/123e4567-e89b-12d3-a456-426614174000'],
    ['POST', '/api/v1/roommate-posts/123e4567-e89b-12d3-a456-426614174000/report/extra'],
    ['PATCH', '/api/v1/media/uploads'],
    ['GET', '/api/v1/tenant-verifications/abc-123'],
    ['POST', '/api/v1/admin/community/posts'],
    ['GET', '/api/v1/restrictions'],
    // Onboarding subpaths that don't exist must NOT match the allowlist
    ['DELETE', '/api/v1/onboarding/responses'],
    ['GET', '/api/v1/onboarding/123e4567-e89b-12d3-a456-426614174000'],
  ];

  it.each(denied)('%s %s is denied', (method, path) => {
    expect(isAllowedCustomerEndpoint(method, path)).toBe(false);
  });
});
