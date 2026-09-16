import { describe, expect, it } from 'vitest';
import {
  NOTICE_FILTERS,
  dayBucketOf,
  groupNotificationsByDay,
  istDayKey,
  noticeFilterQuery,
} from './notice-centre';
import type { Notification } from '@/types';

/** 2026-09-16 11:30 IST */
const NOW = new Date('2026-09-16T06:00:00.000Z');

function makeNotification(id: string, createdAt: string): Notification {
  return {
    id,
    userId: 'u1',
    kind: 'system_alert',
    title: `n${id}`,
    body: `body ${id}`,
    isRead: false,
    createdAt,
  };
}

describe('NOTICE_FILTERS', () => {
  it('exposes the chip row in display order', () => {
    expect(NOTICE_FILTERS.map((f) => f.label)).toEqual([
      'All',
      'Unread',
      'Moderation',
      'Housing',
      'Community',
      'Listings',
      'Contact',
      'Marketplace',
      'Account',
    ]);
  });

  it('maps All to an unfiltered request', () => {
    expect(noticeFilterQuery(NOTICE_FILTERS.find((f) => f.id === 'all')!)).toEqual({
      category: undefined,
      unreadOnly: undefined,
    });
  });

  it('maps Unread to unreadOnly (no category)', () => {
    expect(noticeFilterQuery(NOTICE_FILTERS.find((f) => f.id === 'unread')!)).toEqual({
      category: undefined,
      unreadOnly: true,
    });
  });

  it('maps category chips to registry category names', () => {
    const byId = Object.fromEntries(NOTICE_FILTERS.map((f) => [f.id, f]));
    expect(noticeFilterQuery(byId.moderation)).toEqual({ category: 'MODERATION', unreadOnly: undefined });
    expect(noticeFilterQuery(byId.housing)).toEqual({ category: 'HOUSING', unreadOnly: undefined });
    expect(noticeFilterQuery(byId.marketplace)).toEqual({ category: 'MARKETPLACE', unreadOnly: undefined });
    expect(noticeFilterQuery(byId.account)).toEqual({ category: 'ACCOUNT', unreadOnly: undefined });
  });
});

describe('istDayKey', () => {
  it('derives the IST calendar day, not the UTC one', () => {
    // 19:00Z is 00:30 IST the NEXT day.
    expect(istDayKey(new Date('2026-09-15T19:00:00.000Z'))).toBe('2026-09-16');
    expect(istDayKey(new Date('2026-09-15T18:00:00.000Z'))).toBe('2026-09-15');
  });
});

describe('dayBucketOf', () => {
  it('buckets today / yesterday / earlier', () => {
    expect(dayBucketOf('2026-09-16T05:00:00.000Z', NOW)).toBe('today');
    expect(dayBucketOf('2026-09-15T06:00:00.000Z', NOW)).toBe('yesterday');
    expect(dayBucketOf('2026-09-10T06:00:00.000Z', NOW)).toBe('earlier');
  });

  it('uses IST boundaries: 19:00Z yesterday is today in IST', () => {
    expect(dayBucketOf('2026-09-15T19:00:00.000Z', NOW)).toBe('today');
    expect(dayBucketOf('2026-09-15T18:00:00.000Z', NOW)).toBe('yesterday');
  });

  it('falls back to earlier for invalid timestamps', () => {
    expect(dayBucketOf('not-a-date', NOW)).toBe('earlier');
  });
});

describe('groupNotificationsByDay', () => {
  it('returns Today / Yesterday / Earlier in order, preserving item order', () => {
    const items = [
      makeNotification('a', '2026-09-16T05:00:00.000Z'),
      makeNotification('b', '2026-09-16T04:00:00.000Z'),
      makeNotification('c', '2026-09-15T06:00:00.000Z'),
      makeNotification('d', '2026-09-01T06:00:00.000Z'),
    ];
    const groups = groupNotificationsByDay(items, NOW);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Earlier']);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([['a', 'b'], ['c'], ['d']]);
  });

  it('omits empty groups', () => {
    const groups = groupNotificationsByDay([makeNotification('a', '2026-09-16T05:00:00.000Z')], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Today');
  });

  it('returns no groups for no items', () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([]);
  });
});
