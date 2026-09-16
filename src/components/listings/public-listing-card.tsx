import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { formatPaiseToINR } from '@/lib/formatting';
import { BedDouble, Bath, MapPin, Ruler, ArrowRight } from 'lucide-react';
import type { Listing } from '@/types';

/**
 * Public listing card — used on the signed-out landing rail and anywhere a
 * guest browses inventory. Presentational only (no hooks, no auth context) so
 * it can render inside a server component; the signed-in app keeps using
 * `listing-card.tsx`, which owns favourites/interests state.
 *
 * Field values are frequently null in real inventory, so every optional row
 * is conditional — an empty "null BHK" badge is worse than no badge.
 */
export function PublicListingCard({ listing }: { listing: Listing }) {
  const rent = formatPaiseToINR(listing.monthlyRentPaise);
  const cover = listing.images?.[0] ?? null;
  const place = [listing.campusName, listing.collegeName, listing.property?.city]
    .filter(Boolean)
    .join(' · ');

  const specs = [
    listing.bedrooms ? { icon: BedDouble, label: `${listing.bedrooms} bed` } : null,
    listing.bathrooms ? { icon: Bath, label: `${listing.bathrooms} bath` } : null,
    listing.areaSqft ? { icon: Ruler, label: `${listing.areaSqft} sq ft` } : null,
  ].filter(Boolean) as { icon: typeof BedDouble; label: string }[];

  return (
    <article className="fl-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Link
        href={`/listings/${listing.id}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-muted"
        tabIndex={-1}
        aria-hidden="true"
      >
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-muted">
            <span className="text-xs font-medium text-muted-foreground">Photos coming soon</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <Badge className="border-0 bg-background/90 font-semibold text-foreground backdrop-blur">
            {rent}
            <span className="font-normal text-muted-foreground">/mo</span>
          </Badge>
          {listing.bedrooms ? (
            <Badge variant="secondary" className="border-0 bg-background/80 backdrop-blur">
              {listing.bedrooms} BHK
            </Badge>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-base font-semibold text-foreground">
            <Link href={`/listings/${listing.id}`} className="inline-flex min-h-7 items-center hover:text-primary">
              {listing.title}
            </Link>
          </h3>
          {place ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0 text-primary/70" />
              <span className="line-clamp-1">{place}</span>
            </p>
          ) : null}
        </div>

        {specs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-3 text-sm text-muted-foreground">
            {specs.map((spec) => (
              <span key={spec.label} className="flex items-center gap-1.5">
                <spec.icon className="size-3.5" />
                {spec.label}
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href={`/listings/${listing.id}`}
          className="mt-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          View details
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
