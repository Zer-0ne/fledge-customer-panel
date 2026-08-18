import { NextRequest, NextResponse } from 'next/server';
import { photonDisplayName } from '@/lib/geocode/mapping';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ displayName: null }, { status: 400 });
  }

  try {
    const photonUrl = new URL('https://photon.komoot.io/reverse');
    photonUrl.searchParams.set('lat', String(lat));
    photonUrl.searchParams.set('lon', String(lng));
    photonUrl.searchParams.set('lang', 'en');

    const photonRes = await fetch(photonUrl.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });

    if (photonRes.ok) {
      const data = await photonRes.json();
      const feature = Array.isArray(data?.features) ? data.features[0] : null;
      const props = feature?.properties as Record<string, unknown> | undefined;
      if (props) {
        const displayName = photonDisplayName(props);
        if (displayName) {
          return NextResponse.json({ displayName });
        }
      }
    }

    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse');
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('lat', String(lat));
    nominatimUrl.searchParams.set('lon', String(lng));
    nominatimUrl.searchParams.set('zoom', '18');
    nominatimUrl.searchParams.set('addressdetails', '1');

    const nominatimRes = await fetch(nominatimUrl.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FlatSystemCustomerPanel/1.0 (location-picker)',
        'Accept-Language': 'en-IN,en',
      },
      next: { revalidate: 0 },
    });

    if (nominatimRes.ok) {
      const data = await nominatimRes.json();
      if (typeof data?.display_name === 'string') {
        return NextResponse.json({ displayName: data.display_name });
      }
    }

    return NextResponse.json({ displayName: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reverse geocode failed';
    return NextResponse.json({ displayName: null, error: message }, { status: 502 });
  }
}
