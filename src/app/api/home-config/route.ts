import { NextResponse } from 'next/server';

/**
 * Runtime home-page feature flags — read from the server env PER REQUEST
 * (no rebuild needed to flip). Client components fetch this instead of
 * reading NEXT_PUBLIC_* (those get inlined at build time).
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    roommateFeedEnabled: process.env.HOME_ROOMMATE_FEED_ENABLED === 'true',
    roommateFeedCount: Math.max(1, Number(process.env.HOME_ROOMMATE_FEED_COUNT ?? 6) || 6),
  });
}
