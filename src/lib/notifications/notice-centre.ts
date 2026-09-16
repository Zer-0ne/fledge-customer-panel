/**
 * Notice-centre filters and day grouping.
 *
 * Pure helpers shared by the notifications page so the chip row and the
 * Today / Yesterday / Earlier grouping can be unit tested without a DOM.
 * Category names mirror the backend notification category registry
 * (MODERATION, HOUSING, COMMUNITY, LISTINGS, CONTACT, MARKETPLACE, ACCOUNT).
 */
import type { Notification } from '@/types';

export type NoticeFilterId =
  | 'all'
  | 'unread'
  | 'moderation'
  | 'housing'
  | 'community'
  | 'listings'
  | 'contact'
  | 'marketplace'
  | 'account';

export interface NoticeFilter {
  id: NoticeFilterId;
  label: string;
  /** Registry category sent to GET /api/v1/notifications. */
  category?: string;
  /** Server-side unread-only filter. */
  unreadOnly?: boolean;
}

/** Chip row, in display order. */
export const NOTICE_FILTERS: readonly NoticeFilter[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread', unreadOnly: true },
  { id: 'moderation', label: 'Moderation', category: 'MODERATION' },
  { id: 'housing', label: 'Housing', category: 'HOUSING' },
  { id: 'community', label: 'Community', category: 'COMMUNITY' },
  { id: 'listings', label: 'Listings', category: 'LISTINGS' },
  { id: 'contact', label: 'Contact', category: 'CONTACT' },
  { id: 'marketplace', label: 'Marketplace', category: 'MARKETPLACE' },
  { id: 'account', label: 'Account', category: 'ACCOUNT' },
] as const;

export interface NoticeFilterQuery {
  category?: string;
  unreadOnly?: boolean;
}

/** Selected chip → the query the service forwards to the API. */
export function noticeFilterQuery(filter: NoticeFilter): NoticeFilterQuery {
  return { category: filter.category, unreadOnly: filter.unreadOnly };
}

/** Resolves a chip id; unknown ids fall back to "All". */
export function noticeFilterById(id: NoticeFilterId): NoticeFilter {
  return NOTICE_FILTERS.find((filter) => filter.id === id) ?? NOTICE_FILTERS[0];
}

const IST_TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day (YYYY-MM-DD) of an instant in IST — user-visible dates are IST. */
export function istDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export type NoticeDayBucket = 'today' | 'yesterday' | 'earlier';

/** Buckets a notification timestamp by IST calendar day relative to `now`. */
export function dayBucketOf(createdAt: string | Date, now: Date): NoticeDayBucket {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'earlier';
  const key = istDayKey(date);
  if (key === istDayKey(now)) return 'today';
  // India has no DST, so "24h before now" is always the previous IST day.
  if (key === istDayKey(new Date(now.getTime() - DAY_MS))) return 'yesterday';
  return 'earlier';
}

export interface NoticeGroup {
  key: NoticeDayBucket;
  label: string;
  items: Notification[];
}

const GROUP_ORDER: readonly NoticeDayBucket[] = ['today', 'yesterday', 'earlier'];
const GROUP_LABELS: Record<NoticeDayBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

/** Groups items into Today / Yesterday / Earlier, preserving feed order. */
export function groupNotificationsByDay(items: Notification[], now: Date): NoticeGroup[] {
  const buckets = new Map<NoticeDayBucket, Notification[]>([
    ['today', []],
    ['yesterday', []],
    ['earlier', []],
  ]);
  for (const item of items) {
    buckets.get(dayBucketOf(item.createdAt, now))!.push(item);
  }
  return GROUP_ORDER
    .filter((key) => buckets.get(key)!.length > 0)
    .map((key) => ({ key, label: GROUP_LABELS[key], items: buckets.get(key)! }));
}
