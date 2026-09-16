/**
 * Category × channel preference matrix.
 *
 * The engine reads category × channel preferences (`GET/PUT
 * /api/v1/notifications/preferences`); this module is the panel's mirror of
 * the backend `notification-category-registry.ts` plus the writable channels
 * from `preferencesUpdateSchema` (IN_APP / REALTIME / PUSH).
 *
 * Rules:
 * - A missing row means the channel is ON — the engine only suppresses a
 *   category × channel when an explicit `enabled: false` row exists.
 * - SECURITY / PAYMENTS / SYSTEM are not user-configurable and render as
 *   always-on, disabled switches.
 */

export type PreferenceChannel = 'IN_APP' | 'REALTIME' | 'PUSH';

export interface PreferenceCategoryDefinition {
  id: string;
  label: string;
  description: string;
  /** False for mandatory rows (security, payments, system). */
  userConfigurable: boolean;
}

/** Mirror of the backend NOTIFICATION_CATEGORY_REGISTRY (order kept). */
export const PREFERENCE_CATEGORIES: readonly PreferenceCategoryDefinition[] = [
  { id: 'ACCOUNT', label: 'Account', description: 'Account lifecycle notices: profile completion, phone verification, scheduled deletion.', userConfigurable: true },
  { id: 'SECURITY', label: 'Security', description: 'Security-critical events: new-device login, password change.', userConfigurable: false },
  { id: 'CHAT', label: 'Chat', description: 'New messages, reply reminders, conversation activity.', userConfigurable: true },
  { id: 'COMMUNITY', label: 'Community', description: 'Roommate posts and community post activity.', userConfigurable: true },
  { id: 'MARKETPLACE', label: 'Marketplace', description: 'Resale items and local service enquiries.', userConfigurable: true },
  { id: 'LISTINGS', label: 'Listings', description: 'Rental listing interest and listing lifecycle.', userConfigurable: true },
  { id: 'HOUSING', label: 'Housing', description: 'Housing requirement lifecycle, matches, responses, expiries.', userConfigurable: true },
  { id: 'CONTACT', label: 'Contact', description: 'Contact-share requests, access grants, availability confirmations.', userConfigurable: true },
  { id: 'MODERATION', label: 'Moderation', description: 'Outcomes of content/report moderation applied to you.', userConfigurable: true },
  { id: 'VERIFICATION', label: 'Verification', description: 'Verification lifecycle: pending, expiring, more information required.', userConfigurable: true },
  { id: 'PARTNER', label: 'Partner', description: 'Partner/agency account and membership notices.', userConfigurable: true },
  { id: 'ADS', label: 'Ads', description: 'Advertising campaign lifecycle: quotes, inventory, reviews, delivery.', userConfigurable: true },
  { id: 'PAYMENTS', label: 'Payments', description: 'Payment confirmations and receipts.', userConfigurable: false },
  { id: 'ANNOUNCEMENTS', label: 'Announcements', description: 'Platform/service announcements.', userConfigurable: true },
  { id: 'REMINDERS', label: 'Reminders', description: 'Scheduler nudges (most reminders carry their domain category).', userConfigurable: true },
  { id: 'PROMOTIONS', label: 'Promotions', description: 'Promotional campaigns — requires the Promotions + Push opt-in.', userConfigurable: true },
  { id: 'SYSTEM', label: 'System', description: 'System/operational notices.', userConfigurable: false },
] as const;

/** Channels the PUT contract accepts, with user-facing labels. */
export const PREFERENCE_CHANNELS: readonly { id: PreferenceChannel; label: string; hint: string }[] = [
  { id: 'IN_APP', label: 'In-app', hint: 'Stored in your notification centre' },
  { id: 'REALTIME', label: 'Live', hint: 'Instant alerts while the app is open' },
  { id: 'PUSH', label: 'Push', hint: 'Browser and device notifications' },
] as const;

/** Mandatory-row copy (industry-standard treatment for always-on rows). */
export const MANDATORY_CATEGORY_COPY = 'Always on — security and payment alerts cannot be turned off.';

const CATEGORY_IDS: ReadonlySet<string> = new Set(PREFERENCE_CATEGORIES.map((c) => c.id));
const CHANNEL_IDS: ReadonlySet<string> = new Set(PREFERENCE_CHANNELS.map((c) => c.id));

export interface CategoryChannelRow {
  category: string;
  channel: string;
  enabled: boolean;
}

/** category id → channel → enabled (defaults to ON). */
export type PreferenceMatrix = Record<string, Record<PreferenceChannel, boolean>>;

/** Builds the full matrix; unknown categories/channels are ignored. */
export function buildPreferenceMatrix(rows: CategoryChannelRow[]): PreferenceMatrix {
  const matrix: PreferenceMatrix = {};
  for (const category of PREFERENCE_CATEGORIES) {
    matrix[category.id] = { IN_APP: true, REALTIME: true, PUSH: true };
  }
  for (const row of rows) {
    if (!CATEGORY_IDS.has(row.category) || !CHANNEL_IDS.has(row.channel)) continue;
    matrix[row.category][row.channel as PreferenceChannel] = row.enabled;
  }
  return matrix;
}

export function isMandatoryCategory(categoryId: string): boolean {
  const definition = PREFERENCE_CATEGORIES.find((c) => c.id === categoryId);
  return definition ? !definition.userConfigurable : false;
}
