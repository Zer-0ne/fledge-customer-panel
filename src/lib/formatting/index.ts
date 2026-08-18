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
