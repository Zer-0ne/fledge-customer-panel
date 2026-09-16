import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PublicListingCard } from '@/components/listings/public-listing-card';
import { HeroSearchCard } from '@/components/marketing/hero-search-card';
import { fetchPublicColleges, fetchPublicListings } from '@/lib/api/server/public-data';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Compass,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from 'lucide-react';

/**
 * Signed-out landing page.
 *
 * `/` used to 302 straight to /login, so a first-time visitor (and every
 * organic/search landing) saw a Google button and nothing else. This renders
 * real inventory from the backend's public endpoints, states what the product
 * actually does, and keeps the sign-in ask for the moment a visitor acts.
 */
export async function LandingPage() {
  const [listings, colleges] = await Promise.all([
    fetchPublicListings(6),
    fetchPublicColleges(),
  ]);

  const collegeCount = colleges.length;
  const listingCount = listings.length;

  const steps = [
    {
      title: 'Pick your campus and budget',
      body: 'Search by college, then narrow by rent, room type and how far you are willing to commute.',
      icon: Compass,
    },
    {
      title: 'Shortlist and send interest',
      body: 'Save the flats you like and send one interest request. Hosts see your verified student profile, not your phone number.',
      icon: BadgeCheck,
    },
    {
      title: 'Chat, then share contact',
      body: 'Talk inside Fledge first. Phone and address unlock only after the other side accepts — both ways.',
      icon: MessageSquare,
    },
  ];

  return (
    <div className="flex flex-col pb-24">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/8 via-background to-background">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="fl-orb fl-orb-1 -top-40 -left-24 size-[28rem] bg-primary/12" />
          <div className="fl-orb fl-orb-2 top-10 -right-24 size-[24rem] bg-primary/8" />
          <div className="fl-orb fl-orb-3 -bottom-32 left-1/3 size-[22rem] bg-primary/6" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-20 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-primary"
            >
              <ShieldCheck className="size-3.5" />
              <span className="text-xs font-semibold">
                Student housing built around your campus
              </span>
            </Badge>

            <h1 className="text-4xl leading-[1.08] font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Student housing near your campus,{' '}
              <span className="fl-text-gradient">without the broker runaround</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Real flats, PG and shared rooms around your college — rent, deposit and distance
              upfront. Your phone number stays private until you accept a request.
            </p>

            <div className="mt-8 w-full max-w-4xl">
              <HeroSearchCard colleges={colleges} />
            </div>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <BadgeCheck className="size-4 text-primary" />
                Students verified before they can message
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                Contact details shared only on acceptance
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                No hidden charges
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Numbers that exist ─────────────────────────────────────────── */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          <div>
            <p className="fl-num text-2xl font-bold text-foreground sm:text-3xl">
              {collegeCount || '—'}
            </p>
            <p className="text-sm text-muted-foreground">Colleges &amp; campuses listed</p>
          </div>
          <div>
            <p className="fl-num text-2xl font-bold text-foreground sm:text-3xl">
              {listingCount ? `${listingCount}+` : '—'}
            </p>
            <p className="text-sm text-muted-foreground">Flats available right now</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground sm:text-3xl">24h</p>
            <p className="text-sm text-muted-foreground">Need Now requirements expire in</p>
          </div>
          <div>
            <p className="fl-num text-2xl font-bold text-foreground sm:text-3xl">4</p>
            <p className="text-sm text-muted-foreground">Ways to verify — student ID, college email, phone, UPI</p>
          </div>
        </div>
      </section>

      {/* ── Live inventory ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Recently listed near campus
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live inventory — browse it all before you sign in.
            </p>
          </div>
          <Button
            render={<Link href="/search" />}
            nativeButton={false}
            variant="outline"
            size="lg"
            className="h-11 shrink-0 gap-2 rounded-xl px-4"
          >
            Browse all flats
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((listing) => (
              <PublicListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Building2 className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">No listings to preview right now</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to see everything that matches your campus and budget.
            </p>
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              size="lg"
              className="mt-5 h-11 rounded-xl px-5"
            >
              Sign in
            </Button>
          </div>
        )}
      </section>

      {/* ── Why students stay ─────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Why students use Fledge
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="fl-gradient-border rounded-2xl bg-card p-6 md:col-span-2">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Distance is the first thing you see
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Search by campus radius — 500 m to 20 km — and check every listing on the map before
              you plan a visit. No more “close to college” that turns out to be two buses away.
            </p>
          </div>
          <div className="fl-gradient-border rounded-2xl bg-card p-6">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Verified, both ways</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Student ID, college email, phone and payment identity can be verified — so the person
              answering your message is a real student.
            </p>
          </div>
          <div className="fl-gradient-border rounded-2xl bg-card p-6">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Timer className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Need Now, in 24 hours</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Already in the city and out of time? Post a 24-hour requirement and nearby students
              and hosts respond directly.
            </p>
          </div>
          <div className="fl-gradient-border rounded-2xl bg-card p-6 md:col-span-2">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Split rent with someone sane
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Roommate posts carry budget, move-in window and house habits, and you can filter by
              your own college — so the flatmate search does not turn into a group-chat gamble.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          How Fledge works
        </h2>
        <ol className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <step.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="fl-gradient-border relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/12 via-card to-muted p-8 sm:p-12">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="fl-orb fl-orb-2 -top-24 right-0 size-[20rem] bg-primary/10" />
          </div>
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Start with the flats near your campus
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Signing in takes one tap with Google. You can keep browsing as a guest for as long as
              you like — an account is only needed to save, message and share contact.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                render={<Link href="/search" />}
                nativeButton={false}
                size="lg"
                className="h-11 rounded-xl px-5 text-sm font-semibold"
              >
                Browse flats
                <ArrowRight className="size-4" />
              </Button>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                size="lg"
                variant="outline"
                className="h-11 rounded-xl px-5 text-sm font-semibold"
              >
                Create a free account
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
