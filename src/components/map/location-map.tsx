'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { LeafletMapInnerProps } from './leaflet-map-inner';

const LeafletMapInner = dynamic<LeafletMapInnerProps>(
  () => import('./leaflet-map-inner').then((mod) => mod.LeafletMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    ),
  }
);

export type LocationMapProps = LeafletMapInnerProps;

export function LocationMap(props: LocationMapProps) {
  return <LeafletMapInner {...props} />;
}
