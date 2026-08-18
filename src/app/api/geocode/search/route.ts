import { NextRequest, NextResponse } from 'next/server';
import {
  dedupePlaces,
  fromNominatim,
  fromPhoton,
  queryVariants,
  type PlaceDto,
} from '@/lib/geocode/mapping';

export const runtime = 'nodejs';

async function searchPhoton(q: string): Promise<PlaceDto[]> {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '8');
  url.searchParams.set('lang', 'en');
  url.searchParams.set('bbox', '68.0,6.0,97.5,35.5');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  return fromPhoton(await res.json());
}

async function searchNominatim(q: string): Promise<PlaceDto[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', q);
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', 'in');

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'FlatSystemCustomerPanel/1.0 (location-picker)',
      'Accept-Language': 'en-IN,en',
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  return fromNominatim(await res.json());
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  try {
    const variants = queryVariants(q);
    let places: PlaceDto[] = [];

    for (const variant of variants) {
      const photon = await searchPhoton(variant);
      places = dedupePlaces([...places, ...photon]);
      if (places.length >= 3) break;
    }

    if (places.length === 0) {
      for (const variant of variants) {
        const nominatim = await searchNominatim(variant);
        places = dedupePlaces([...places, ...nominatim]);
        if (places.length >= 1) break;
      }
    }

    return NextResponse.json({ places });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Geocode search failed';
    return NextResponse.json({ places: [], error: message }, { status: 502 });
  }
}
