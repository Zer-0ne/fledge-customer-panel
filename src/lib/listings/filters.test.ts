import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  parseListingFilterParams,
  serializeListingFilterParams,
  buildListingsQueryString,
} from './filters';

describe('Listing Filters Utility', () => {
  describe('rupeesToPaise & paiseToRupees', () => {
    it('correctly converts rupees to paise', () => {
      expect(rupeesToPaise(15000)).toBe(1500000);
      expect(rupeesToPaise('12500')).toBe(1250000);
      expect(rupeesToPaise(0)).toBe(0);
      expect(rupeesToPaise(null)).toBeUndefined();
      expect(rupeesToPaise(undefined)).toBeUndefined();
      expect(rupeesToPaise('invalid')).toBeUndefined();
    });

    it('correctly converts paise to rupees', () => {
      expect(paiseToRupees(1500000)).toBe(15000);
      expect(paiseToRupees(1250000)).toBe(12500);
      expect(paiseToRupees(0)).toBe(0);
      expect(paiseToRupees(null)).toBeUndefined();
      expect(paiseToRupees(undefined)).toBeUndefined();
    });
  });

  describe('parseListingFilterParams', () => {
    it('parses empty query params to defaults', () => {
      const result = parseListingFilterParams({});
      expect(result).toEqual({
        collegeId: undefined,
        campusId: undefined,
        query: undefined,
        cursor: undefined,
        furnishing: undefined,
        genderPreference: undefined,
        minRentPaise: undefined,
        maxRentPaise: undefined,
        bedrooms: undefined,
        bathrooms: undefined,
        limit: 20,
      });
    });

    it('parses rupees from URL into paise for filter params', () => {
      const searchParams = {
        minRent: '10000',
        maxRent: '25000',
        bedrooms: '2',
        collegeId: 'college-123',
      };
      const result = parseListingFilterParams(searchParams);
      expect(result.minRentPaise).toBe(1000000);
      expect(result.maxRentPaise).toBe(2500000);
      expect(result.bedrooms).toBe(2);
      expect(result.collegeId).toBe('college-123');
    });
    it('parses latitude, longitude, and radiusMeters from searchParams', () => {
      const searchParams = {
        latitude: '28.689',
        longitude: '77.2105',
        radiusMeters: '3000',
      };
      const result = parseListingFilterParams(searchParams);
      expect(result.latitude).toBe(28.689);
      expect(result.longitude).toBe(77.2105);
      expect(result.radiusMeters).toBe(3000);
    });
  });

  describe('serializeListingFilterParams', () => {
    it('serializes filter params with paise back to rupees strings for URL', () => {
      const params = {
        minRentPaise: 1000000,
        maxRentPaise: 2500000,
        bedrooms: 2,
        collegeId: 'college-123',
        latitude: 28.689,
        longitude: 77.2105,
        radiusMeters: 3000,
      };
      const serialized = serializeListingFilterParams(params);
      expect(serialized).toEqual({
        minRent: '10000',
        maxRent: '25000',
        bedrooms: '2',
        collegeId: 'college-123',
        latitude: '28.689',
        longitude: '77.2105',
        radiusMeters: '3000',
      });
    });
  });

  describe('buildListingsQueryString', () => {
    it('builds valid API query string with geo filters', () => {
      const params = {
        collegeId: 'college-1',
        minRentPaise: 500000,
        bedrooms: 1,
        latitude: 28.689,
        longitude: 77.2105,
        radiusMeters: 2000,
        limit: 20,
      };
      const queryString = buildListingsQueryString(params);
      expect(queryString).toBe(
        '?collegeId=college-1&minRentPaise=500000&bedrooms=1&latitude=28.689&longitude=77.2105&radiusMeters=2000&limit=20'
      );
    });
  });
});
