import { describe, it, expect } from 'vitest';
import {
  isAllowedCustomerEndpoint,
  resolveProxyBackendPath,
} from '@/lib/api/allowlist';

describe('isAllowedCustomerEndpoint', () => {
  it('allows public listings GET endpoint', () => {
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/listings')).toBe(true);
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/listings/12345')).toBe(true);
  });

  it('allows colleges and campuses GET endpoints', () => {
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/colleges')).toBe(true);
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/colleges/col-1/campuses')).toBe(true);
  });

  it('allows favorites and roommate posts endpoints', () => {
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/favorites')).toBe(true);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/listings/list-1/favorite')).toBe(true);
    expect(isAllowedCustomerEndpoint('DELETE', '/api/v1/listings/list-1/favorite')).toBe(true);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/roommate-posts')).toBe(true);
  });

  it('allows conversation read and delivered receipt endpoints', () => {
    expect(
      isAllowedCustomerEndpoint('PATCH', '/api/v1/conversations/c1/read/m1')
    ).toBe(true);
    expect(
      isAllowedCustomerEndpoint('PATCH', '/api/v1/conversations/c1/delivered/m1')
    ).toBe(true);
  });

  it('rejects admin endpoints', () => {
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/admin/users')).toBe(false);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/admin/listings/123/moderate')).toBe(false);
  });

  it('rejects property creation (property manager endpoint)', () => {
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/properties')).toBe(false);
  });

  it('allows notifications and preference endpoints', () => {
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/notifications')).toBe(true);
    expect(isAllowedCustomerEndpoint('PATCH', '/api/v1/notifications/n1/read')).toBe(true);
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/notification-preferences')).toBe(true);
    expect(isAllowedCustomerEndpoint('PUT', '/api/v1/notification-preferences/message')).toBe(true);
  });

  it('allows auth sessions and account deletion endpoints', () => {
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/auth/sessions')).toBe(true);
    expect(isAllowedCustomerEndpoint('DELETE', '/api/v1/auth/sessions/s1')).toBe(true);
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/users/me')).toBe(true);
    expect(isAllowedCustomerEndpoint('DELETE', '/api/v1/users/me')).toBe(true);
  });

  it('allows customer ads select and event endpoints', () => {
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/ads/select')).toBe(true);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/ads/events/impression')).toBe(true);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/ads/events/click')).toBe(true);
  });

  it('allows contact preferences, fallback, requests, grants, and availability endpoints', () => {
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/listings/l1/contact-preference')).toBe(true);
    expect(isAllowedCustomerEndpoint('PUT', '/api/v1/listings/l1/contact-preference')).toBe(true);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/contact-share-requests')).toBe(true);
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/contact-share-requests/r1')).toBe(true);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/contact-share-requests/r1/approve')).toBe(true);
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/contact-access-grants/g1/contact')).toBe(true);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/fallback-contacts')).toBe(true);
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/fallback-contacts')).toBe(true);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/listings/l1/availability-confirmation')).toBe(true);
    expect(isAllowedCustomerEndpoint('POST', '/api/v1/listings/l1/close')).toBe(true);
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/contact-approval/tok123/context')).toBe(true);
  });

  it('rejects admin ads management endpoints', () => {
    expect(isAllowedCustomerEndpoint('GET', '/api/v1/admin/ads/advertisers')).toBe(false);
    expect(
      isAllowedCustomerEndpoint('POST', '/api/v1/admin/ads/advertisers/a1/campaigns')
    ).toBe(false);
  });
});

describe('resolveProxyBackendPath', () => {
  it('keeps api/v1 prefix when client already includes it', () => {
    expect(resolveProxyBackendPath(['api', 'v1', 'colleges'])).toBe('/api/v1/colleges');
    expect(resolveProxyBackendPath(['api', 'v1', 'listings'])).toBe('/api/v1/listings');
  });

  it('prefixes api/v1 when segments are relative', () => {
    expect(resolveProxyBackendPath(['colleges'])).toBe('/api/v1/colleges');
    expect(resolveProxyBackendPath(['listings', 'abc'])).toBe('/api/v1/listings/abc');
  });

  it('does not double-prefix api/v1', () => {
    expect(resolveProxyBackendPath(['api', 'v1', 'api', 'v1', 'colleges'])).toBe(
      '/api/v1/api/v1/colleges'
    );
  });
});
