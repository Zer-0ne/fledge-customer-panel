import { describe, expect, it } from 'vitest';
import {
  EVENT_REGISTRY,
  FORBIDDEN_PROPERTIES,
  isKnownEvent,
  getEventSpec,
  VALID_PLATFORMS,
} from '../src/lib/analytics/analytics-event-registry';

describe('Phase 3 — Next.js analytics event registry', () => {
  it('has events in the allowlist', () => {
    expect(Object.keys(EVENT_REGISTRY).length).toBeGreaterThan(10);
  });

  it('isKnownEvent returns true for registered events', () => {
    expect(isKnownEvent('signup_completed')).toBe(true);
    expect(isKnownEvent('listing_details_viewed')).toBe(true);
    expect(isKnownEvent('screen_viewed')).toBe(true);
  });

  it('isKnownEvent returns false for unknown events', () => {
    expect(isKnownEvent('made_up_event')).toBe(false);
    expect(isKnownEvent('')).toBe(false);
  });

  it('getEventSpec returns spec for known events', () => {
    const spec = getEventSpec('signup_completed');
    expect(spec).toBeDefined();
    expect(spec!.owner).toBe('BACKEND');
    expect(spec!.backendAuthoritative).toBe(true);
    expect(spec!.requiredProperties).toContain('userId');
  });

  it('getEventSpec returns undefined for unknown events', () => {
    expect(getEventSpec('unknown')).toBeUndefined();
  });

  it('every event has required fields', () => {
    for (const [name, spec] of Object.entries(EVENT_REGISTRY)) {
      expect(spec.owner).toBeDefined();
      expect(spec.version).toBeGreaterThan(0);
      expect(Array.isArray(spec.requiredProperties)).toBe(true);
      expect(Array.isArray(spec.optionalProperties)).toBe(true);
      expect(typeof spec.backendAuthoritative).toBe('boolean');
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('has valid platforms', () => {
    expect(VALID_PLATFORMS.has('next_web')).toBe(true);
    expect(VALID_PLATFORMS.has('flutter_android')).toBe(true);
    expect(VALID_PLATFORMS.has('unknown')).toBe(false);
  });

  it('FORBIDDEN_PROPERTIES blocks sensitive fields', () => {
    expect(FORBIDDEN_PROPERTIES.has('password')).toBe(true);
    expect(FORBIDDEN_PROPERTIES.has('phone')).toBe(true);
    expect(FORBIDDEN_PROPERTIES.has('email')).toBe(true);
    expect(FORBIDDEN_PROPERTIES.has('latitude')).toBe(true);
    expect(FORBIDDEN_PROPERTIES.has('messageText')).toBe(true);
  });
});
