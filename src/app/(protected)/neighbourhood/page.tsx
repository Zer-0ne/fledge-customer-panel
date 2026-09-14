'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Droplets, Tag, Wrench, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UTILITY_KINDS, UtilityReport, fetchUtilityBoard, timeLeft } from '@/lib/api/services/marketplace';

/**
 * Neighbourhood hub.
 *
 * One entry point for the three non-housing surfaces, ordered by how often a
 * student actually needs them: the utility board is the daily habit, services
 * are weekly, second-hand goods are twice a year at move-in/move-out. Resale is
 * deliberately last — it is a seasonal surface, not a browsing destination, and
 * it competes with OLX on everything except locality.
 */
const SECTIONS = [
  {
    href: '/utility',
    title: 'Right now in the gali',
    body: 'Water, power, gas — reported by neighbours and gone in a few hours.',
    Icon: Droplets,
    tone: 'text-sky-500',
  },
  {
    href: '/services',
    title: 'Local services',
    body: 'Maid, cook, tiffin, plumber, electrician, laundry — with ratings.',
    Icon: Wrench,
    tone: 'text-emerald-500',
  },
  {
    href: '/resale',
    title: 'Second-hand market',
    body: 'Cooler, almari, bed, fridge — priced, and it disappears when it is sold.',
    Icon: Tag,
    tone: 'text-amber-500',
  },
] as const;

export default function NeighbourhoodPage() {
  const router = useRouter();
  const [reports, setReports] = React.useState<UtilityReport[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const board = await fetchUtilityBoard({});
        if (!cancelled) setReports(board.slice(0, 3));
      } catch {
        if (!cancelled) setReports([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-full border p-2 transition hover:bg-accent" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Neighbourhood</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The things this group asks about every week — flats are only half of it.
          </p>
        </div>
      </div>

      <section className="mb-4 rounded-3xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-amber-500" /> Live right now
          </h2>
          <Link href="/utility" className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
            Full board <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {reports === null && <Skeleton className="mt-3 h-12 w-full rounded-2xl" />}
        {reports !== null && reports.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">Nothing reported in the last few hours. Post if the water or power is out.</p>
        )}
        {reports !== null && reports.length > 0 && (
          <ul className="mt-3 space-y-2">
            {reports.map((report) => (
              <li key={report.id} className="flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <span className="font-medium">{UTILITY_KINDS.find((item) => item.code === report.kind)?.label ?? report.kind}</span>
                  <span className="truncate text-muted-foreground">{report.locality ?? ''}</span>
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeLeft(report.expiresAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SECTIONS.map((section, index) => (
          <motion.div
            key={section.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <Link
              href={section.href}
              className="flex h-full flex-col rounded-3xl border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <section.Icon className={`h-5 w-5 ${section.tone}`} />
              <span className="mt-2 text-sm font-semibold">{section.title}</span>
              <span className="mt-1 text-xs text-muted-foreground">{section.body}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-dashed p-4">
        <h2 className="text-sm font-semibold">Moving in or out?</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste the post you were about to write in the group — Fledge fills in the fields, prices it, and gives you a
          card to share back.
        </p>
        <Button size="sm" className="mt-3" onClick={() => router.push('/import')}>Post from group</Button>
      </div>
    </div>
  );
}
