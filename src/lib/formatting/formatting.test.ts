import { describe, it, expect } from 'vitest';
import {
  formatPaiseToINR,
  formatDate,
  formatRelativeTime,
  safeFallbackString,
  formatAddress,
  formatChatDay,
  formatChatTime,
  formatConversationStamp,
  isSameDay,
  isValidUUID,
} from './index';

describe('Formatting Utilities', () => {
  describe('formatPaiseToINR', () => {
    it('converts 1500000 paise to ₹15,000', () => {
      expect(formatPaiseToINR(1500000)).toBe('₹15,000');
    });

    it('supports option without symbol', () => {
      expect(formatPaiseToINR(2500000, { showSymbol: false })).toBe('25,000');
    });

    it('handles null, undefined and 0', () => {
      expect(formatPaiseToINR(0)).toBe('₹0');
      expect(formatPaiseToINR(null)).toBe('₹0');
      expect(formatPaiseToINR(undefined)).toBe('₹0');
    });
  });

  describe('formatDate', () => {
    it('formats a valid date string', () => {
      const formatted = formatDate('2026-05-15T10:00:00Z');
      expect(formatted).toContain('May');
      expect(formatted).toContain('2026');
    });

    it('returns N/A for empty input', () => {
      expect(formatDate(null)).toBe('N/A');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns just now for recent date', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });
  });

  describe('chat time helpers', () => {
    it('formatChatTime renders a compact 12-hour clock', () => {
      const d = new Date(2026, 8, 15, 14, 5);
      expect(formatChatTime(d)).toMatch(/^2:05\s?(pm|PM)$/i);
    });

    it('formatChatTime returns empty string for missing input', () => {
      expect(formatChatTime(null)).toBe('');
      expect(formatChatTime('not-a-date')).toBe('');
    });

    it('isSameDay compares local calendar days only', () => {
      const morning = new Date(2026, 8, 15, 9, 0);
      const night = new Date(2026, 8, 15, 23, 30);
      const nextDay = new Date(2026, 8, 16, 0, 5);
      expect(isSameDay(morning, night)).toBe(true);
      expect(isSameDay(night, nextDay)).toBe(false);
    });

    it('formatChatDay labels today and yesterday', () => {
      const now = new Date();
      expect(formatChatDay(now)).toBe('Today');
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0);
      expect(formatChatDay(yesterday)).toBe('Yesterday');
    });

    it('formatChatDay includes the date for older days', () => {
      const older = new Date(2026, 0, 5, 12, 0);
      const label = formatChatDay(older);
      expect(label).toContain('5');
      expect(label).toContain('Jan');
    });

    it('formatConversationStamp shows a clock for today and "Yesterday" otherwise', () => {
      const now = new Date(2026, 8, 17, 18, 30);
      const today = new Date(2026, 8, 17, 9, 12);
      const yesterday = new Date(2026, 8, 16, 9, 12);
      expect(formatConversationStamp(today, now)).toMatch(/9:12\s?(am|AM)$/i);
      expect(formatConversationStamp(yesterday, now)).toBe('Yesterday');
    });

    it('formatConversationStamp falls back to a short date for older threads', () => {
      const now = new Date(2026, 8, 17, 18, 30);
      const older = new Date(2026, 7, 3, 9, 0);
      expect(formatConversationStamp(older, now)).toContain('Aug');
    });
  });

  describe('safeFallbackString', () => {
    it('returns fallback for empty string', () => {
      expect(safeFallbackString('', 'Default Value')).toBe('Default Value');
      expect(safeFallbackString(null)).toBe('Not specified');
    });

    it('returns trimmed string if present', () => {
      expect(safeFallbackString('  Hello World  ')).toBe('Hello World');
    });
  });

  describe('formatAddress', () => {
    it('joins non-empty address fields', () => {
      const addr = formatAddress({
        line1: 'Flat 302, Sunrise Heights',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      });
      expect(addr).toBe('Flat 302, Sunrise Heights, Mumbai, Maharashtra, 400001');
    });
  });

  describe('isValidUUID', () => {
    it('validates UUID correctly', () => {
      expect(isValidUUID('c0a80101-0000-0000-0000-000000000001')).toBe(true);
      expect(isValidUUID('invalid-uuid-string')).toBe(false);
    });
  });
});
