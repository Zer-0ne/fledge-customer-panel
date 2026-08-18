import { describe, it, expect } from 'vitest';
import {
  formatPaiseToINR,
  formatDate,
  formatRelativeTime,
  safeFallbackString,
  formatAddress,
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
