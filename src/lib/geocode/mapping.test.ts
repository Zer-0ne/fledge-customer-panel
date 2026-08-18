import { describe, it, expect } from 'vitest';
import {
  dedupePlaces,
  formatFullAddress,
  fromNominatim,
  fromPhoton,
  photonDisplayName,
  queryVariants,
  splitDisplayName,
} from '@/lib/geocode/mapping';

describe('formatFullAddress', () => {
  it('joins non-empty address parts in order', () => {
    expect(
      formatFullAddress({
        line1: 'PP Road',
        area: 'Kodaparamba',
        city: 'Kannur',
        state: 'Kerala',
        pincode: '670003',
        country: 'India',
      })
    ).toBe('PP Road, Kodaparamba, Kannur, Kerala, 670003, India');
  });

  it('skips blank parts', () => {
    expect(
      formatFullAddress({
        line1: 'North Gate',
        city: 'Delhi',
        country: 'India',
      })
    ).toBe('North Gate, Delhi, India');
  });
});

describe('geocode mapping', () => {
  it('splits display name into primary/secondary', () => {
    expect(splitDisplayName('kodaparambu road, Kannur, Kerala, India')).toEqual({
      primary: 'kodaparambu road',
      secondary: 'Kannur, Kerala, India',
    });
  });

  it('builds progressive query variants for Indian full addresses', () => {
    const variants = queryVariants('PP Road, Kodaparamba, Kannur, 670003, Kerala');
    expect(variants[0]).toBe('PP Road, Kodaparamba, Kannur, 670003, Kerala');
    expect(variants).toContain('Kodaparamba, Kannur, 670003, Kerala');
    expect(variants).toContain('Kannur, 670003, Kerala');
    expect(variants.some((v) => v.includes('Kannur'))).toBe(true);
  });

  it('maps Photon features and converts extent to Nominatim bbox', () => {
    const places = fromPhoton({
      features: [
        {
          geometry: { coordinates: [75.38, 11.86] },
          properties: {
            osm_id: 123,
            name: 'kodaparambu road',
            city: 'Kannur',
            state: 'Kerala',
            country: 'India',
            countrycode: 'IN',
            osm_key: 'highway',
            osm_value: 'residential',
            extent: [75.37, 11.87, 75.39, 11.85],
          },
        },
        {
          geometry: { coordinates: [2.35, 48.85] },
          properties: {
            name: 'Paris',
            countrycode: 'FR',
          },
        },
      ],
    });

    expect(places).toHaveLength(1);
    expect(places[0].lat).toBeCloseTo(11.86);
    expect(places[0].lng).toBeCloseTo(75.38);
    expect(places[0].primary).toBe('kodaparambu road');
    expect(places[0].boundingbox).toEqual(['11.85', '11.87', '75.37', '75.39']);
    expect(places[0].class).toBe('highway');
  });

  it('maps Nominatim results', () => {
    const places = fromNominatim([
      {
        place_id: 99,
        lat: '11.8745',
        lon: '75.3704',
        display_name: 'Kannur, Kerala, India',
        type: 'city',
        class: 'place',
        boundingbox: ['11.8', '11.9', '75.3', '75.4'],
      },
    ]);

    expect(places).toEqual([
      {
        id: '99',
        lat: 11.8745,
        lng: 75.3704,
        primary: 'Kannur',
        secondary: 'Kerala, India',
        displayName: 'Kannur, Kerala, India',
        type: 'city',
        class: 'place',
        boundingbox: ['11.8', '11.9', '75.3', '75.4'],
      },
    ]);
  });

  it('dedupes places by lat/lng/displayName', () => {
    const places = dedupePlaces([
      {
        id: '1',
        lat: 11.86,
        lng: 75.38,
        primary: 'A',
        secondary: '',
        displayName: 'A, Kannur',
      },
      {
        id: '2',
        lat: 11.86,
        lng: 75.38,
        primary: 'A',
        secondary: '',
        displayName: 'A, Kannur',
      },
      {
        id: '3',
        lat: 11.87,
        lng: 75.39,
        primary: 'B',
        secondary: '',
        displayName: 'B, Kannur',
      },
    ]);
    expect(places).toHaveLength(2);
  });

  it('formats Photon reverse display names without consecutive duplicates', () => {
    expect(
      photonDisplayName({
        street: 'PP Road',
        city: 'Kannur',
        state: 'Kerala',
        postcode: '670003',
        country: 'India',
      })
    ).toBe('PP Road, Kannur, Kerala, 670003, India');
  });
});
