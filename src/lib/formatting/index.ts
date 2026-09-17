/**
 * Formatting utilities for currency, dates, relative time, addresses, and fallbacks.
 */

/**
 * Formats a value in paise to Indian Rupees (INR).
 * Example: 1500000 paise -> ₹15,000
 */
export function formatPaiseToINR(
  paise: number | string | null | undefined,
  options: { showSymbol?: boolean; decimals?: number } = {}
): string {
  const { showSymbol = true, decimals = 0 } = options;

  const num = typeof paise === 'string' ? Number(paise) : paise;

  if (num === null || num === undefined || isNaN(num)) {
    return showSymbol ? '₹0' : '0';
  }

  const rupees = num / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(rupees);

  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Formats a date string, Date object, or timestamp into a readable date.
 */
export function formatDate(
  date: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return 'N/A';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(d);
}

/**
 * Formats a date and time.
 */
export function formatDateTime(date: string | Date | number | null | undefined): string {
  if (!date) return 'N/A';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Chat-grade time helpers. Threads show a compact clock ("6:17 pm") under
 * message runs and quiet day separators ("Today", "Yesterday", "Mon, 15 Sept").
 * Everything renders in the viewer's local timezone (en-IN), matching
 * `formatDate` / `formatDateTime`.
 */

function startOfLocalDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function dayOffsetStart(reference: Date, days: number): number {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + days).getTime();
}

/**
 * Compact clock for chat bubbles and read receipts. Example: "6:17 pm".
 */
export function formatChatTime(date: string | Date | number | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * True when both instants fall on the same local calendar day — the boundary
 * used for chat day separators and message grouping.
 */
export function isSameDay(
  a: string | Date | number | null | undefined,
  b: string | Date | number | null | undefined
): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
  return startOfLocalDay(da) === startOfLocalDay(db);
}

/**
 * Day label for chat separators: "Today", "Yesterday", "Mon, 15 Sept" for the
 * current year, or "Mon, 15 Sept 2025" for older days.
 */
export function formatChatDay(date: string | Date | number | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const day = startOfLocalDay(d);
  if (day === startOfLocalDay(now)) return 'Today';
  if (day === dayOffsetStart(now, -1)) return 'Yesterday';
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' as const }),
  }).format(d);
}

/**
 * Compact stamp for conversation rows: time for today, "Yesterday", the
 * weekday within the past week, otherwise a short date. `reference` exists for
 * deterministic tests; callers normally omit it.
 */
export function formatConversationStamp(
  date: string | Date | number | null | undefined,
  reference: Date = new Date()
): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = reference;
  const day = startOfLocalDay(d);
  if (day === startOfLocalDay(now)) return formatChatTime(d);
  if (day === dayOffsetStart(now, -1)) return 'Yesterday';
  if (startOfLocalDay(now) - day < 6 * 86_400_000) {
    return new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(d);
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' as const }),
  }).format(d);
}

/**
 * Returns a human-friendly relative time string (e.g. "5 mins ago", "in 2 days", "just now").
 */
export function formatRelativeTime(date: string | Date | number | null | undefined): string {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (Math.abs(diffInSeconds) < 60) {
    return 'just now';
  }

  const minutes = Math.floor(Math.abs(diffInSeconds) / 60);
  if (minutes < 60) {
    return diffInSeconds > 0 ? `${minutes}m ago` : `in ${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return diffInSeconds > 0 ? `${hours}h ago` : `in ${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return diffInSeconds > 0 ? `${days}d ago` : `in ${days}d`;
  }

  return formatDate(d);
}

/**
 * Provides a fallback string if value is null, undefined, or empty.
 */
export function safeFallbackString(
  val: string | null | undefined,
  fallback = 'Not specified'
): string {
  if (!val || val.trim() === '') {
    return fallback;
  }
  return val.trim();
}

/**
 * Formats an address object into a single line string.
 */
export function formatAddress(address?: {
  line1?: string;
  line2?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string {
  if (!address) return 'Address not available';

  const parts = [
    address.line1,
    address.line2,
    address.area,
    address.city,
    address.state,
    address.pincode,
  ].filter((p): p is string => Boolean(p && p.trim()));

  return parts.length > 0 ? parts.join(', ') : 'Address not available';
}

/**
 * Validates whether a given string is a valid UUID v4 format.
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
