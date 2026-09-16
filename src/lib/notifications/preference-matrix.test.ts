import { describe, expect, it } from 'vitest';
import {
  MANDATORY_CATEGORY_COPY,
  PREFERENCE_CATEGORIES,
  PREFERENCE_CHANNELS,
  buildPreferenceMatrix,
  isMandatoryCategory,
} from './preference-matrix';

describe('PREFERENCE_CATEGORIES', () => {
  it('mirrors the backend registry order and labels', () => {
    expect(PREFERENCE_CATEGORIES.map((c) => c.id)).toEqual([
      'ACCOUNT',
      'SECURITY',
      'CHAT',
      'COMMUNITY',
      'MARKETPLACE',
      'LISTINGS',
      'HOUSING',
      'CONTACT',
      'MODERATION',
      'VERIFICATION',
      'PARTNER',
      'ADS',
      'PAYMENTS',
      'ANNOUNCEMENTS',
      'REMINDERS',
      'PROMOTIONS',
      'SYSTEM',
    ]);
    expect(PREFERENCE_CATEGORIES.find((c) => c.id === 'HOUSING')?.label).toBe('Housing');
  });

  it('marks exactly SECURITY, PAYMENTS and SYSTEM as mandatory', () => {
    expect(PREFERENCE_CATEGORIES.filter((c) => !c.userConfigurable).map((c) => c.id)).toEqual([
      'SECURITY',
      'PAYMENTS',
      'SYSTEM',
    ]);
  });
});

describe('PREFERENCE_CHANNELS', () => {
  it('exposes the three writable channels in In-app / Live / Push order', () => {
    expect(PREFERENCE_CHANNELS.map((c) => c.id)).toEqual(['IN_APP', 'REALTIME', 'PUSH']);
    expect(PREFERENCE_CHANNELS.map((c) => c.label)).toEqual(['In-app', 'Live', 'Push']);
  });
});

describe('buildPreferenceMatrix', () => {
  it('defaults every category × channel to ON (a missing row means enabled)', () => {
    const matrix = buildPreferenceMatrix([]);
    expect(Object.keys(matrix)).toHaveLength(PREFERENCE_CATEGORIES.length);
    for (const category of PREFERENCE_CATEGORIES) {
      expect(matrix[category.id]).toEqual({ IN_APP: true, REALTIME: true, PUSH: true });
    }
  });

  it('applies explicit rows to the matching cell only', () => {
    const matrix = buildPreferenceMatrix([
      { category: 'HOUSING', channel: 'PUSH', enabled: false },
      { category: 'CHAT', channel: 'IN_APP', enabled: false },
    ]);
    expect(matrix.HOUSING.PUSH).toBe(false);
    expect(matrix.HOUSING.IN_APP).toBe(true);
    expect(matrix.CHAT.IN_APP).toBe(false);
    expect(matrix.CHAT.PUSH).toBe(true);
  });

  it('ignores unknown categories, channels and malformed rows', () => {
    const matrix = buildPreferenceMatrix([
      { category: 'NOT_A_CATEGORY', channel: 'PUSH', enabled: false },
      { category: 'HOUSING', channel: 'SMS', enabled: false },
      { category: 'HOUSING', channel: 'EMAIL', enabled: false },
    ]);
    expect(matrix.NOT_A_CATEGORY).toBeUndefined();
    expect(matrix.HOUSING.PUSH).toBe(true);
  });
});

describe('isMandatoryCategory', () => {
  it('is true only for the mandatory rows', () => {
    expect(isMandatoryCategory('SECURITY')).toBe(true);
    expect(isMandatoryCategory('PAYMENTS')).toBe(true);
    expect(isMandatoryCategory('SYSTEM')).toBe(true);
    expect(isMandatoryCategory('HOUSING')).toBe(false);
    expect(isMandatoryCategory('NOPE')).toBe(false);
  });

  it('carries the industry-standard mandatory-row copy', () => {
    expect(MANDATORY_CATEGORY_COPY).toBe(
      'Always on — security and payment alerts cannot be turned off.'
    );
  });
});
