'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { College, Listing, NeedNowRequest, RoommatePost } from '@/types';
import { fetchColleges, fetchListings } from '@/lib/api/services/discovery';
import { nearbyFeed } from '@/lib/api/services/neednow';
import { fetchRoommatePosts } from '@/lib/api/services/roommates';
import { resolveLocation, type UserLocation } from '@/lib/location';
import { ListingCard } from '@/components/listings/listing-card';
import { MasonryGrid } from '@/components/common/masonry-grid';
// Overlays only appear after an interaction — keep them out of the initial JS
// the home route ships (they were previously in the same client chunk).
const InterestDialog = dynamic(
  () => import('@/components/listings/interest-dialog').then((m) => m.InterestDialog),
  { ssr: false }
);
import { BlurFade } from "@/components/ui/blur-fade"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Field, FieldLabel } from "@/components/ui/field"
import { Card, CardContent } from "@/components/ui/card"
import { SponsoredAd } from '@/components/ads/sponsored-ad';
import { NeedNowFeedCard } from '@/components/neednow/neednow-feed-card';
const NeedNowStoryViewer = dynamic(
  () => import('@/components/neednow/neednow-story-viewer').then((m) => m.NeedNowStoryViewer),
  { ssr: false }
);
import { RoommateCard } from '@/components/roommates/roommate-card';
const RoommateInterestDialog = dynamic(
  () => import('@/components/roommates/roommate-interest-dialog').then((m) => m.RoommateInterestDialog),
  { ssr: false }
);
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/error-state';
import { Search, Building2, Users, ArrowRight, Sparkles, Timer } from 'lucide-react';

/**
 * Filter out obviously fake / placeholder roommate-post titles that leak
 * into the home feed (e.g. dev seed data left in the backend). Only applied
 * to the home-page teaser — never to the authoritative /roommates browse.
 *
 * Rejects:
 *   - short or non-string titles
 *   - 6+ identical characters in a row ("hsssssss")
 *   - mostly a single character repeated with separators ("t t t f t t t t")
 *   - low vowel ratio (real English/Hindi words have ~30%+ vowels)
 *   - titles that look like keyboard mash (consonants without a vowel run
 *     long enough to form a real syllable — e.g. "sakjsdbskdbsb")
 */
function isValidRoommatePostTitle(title: unknown): boolean {
  if (typeof title !== 'string') return false;
  const t = title.trim();
  if (t.length < 5) return false;
  if (/(.)\1{5,}/.test(t)) return false;
  if (/^([^\w\s])\1*\s?\1*$/i.test(t)) return false;

  // Vowel ratio check: real English titles have >= 20% vowels.
  const letters = t.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length >= 6) {
    const vowels = (letters.match(/[aeiouy]/g) || []).length;
    if (vowels / letters.length < 0.18) return false;
  }

  // Token-length sanity: reject strings made of mostly 1-character tokens,
  // e.g. "t t t f t t t t u u u. i.xi.x". Real titles have normal word lengths.
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length >= 4) {
    const shortTokens = tokens.filter((tk) => tk.replace(/[^a-z]/gi, '').length <= 1).length;
    if (shortTokens / tokens.length > 0.5) return false;
  }
  return true;
}

export default function AuthenticatedHome() {
  const router = useRouter();
  const [colleges, setColleges] = React.useState<College[]>([]);
  const [featuredListings, setFeaturedListings] = React.useState<Listing[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Need Now — active nearby requirements
  const [nearbyNeeds, setNearbyNeeds] = React.useState<NeedNowRequest[]>([]);
  const [needsLoading, setNeedsLoading] = React.useState(true);
  const [needsError, setNeedsError] = React.useState<string | null>(null);

  // Quick Search state
  const [selectedCollegeId, setSelectedCollegeId] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Interest Dialog state
  const [selectedListingForInterest, setSelectedListingForInterest] = React.useState<Listing | null>(null);
  const [isInterestOpen, setIsInterestOpen] = React.useState(false);

  // Roommate posts merged into the Featured masonry (temporary, env-controlled)
  const [roommateFeedEnabled, setRoommateFeedEnabled] = React.useState(false);
  const [roommatePosts, setRoommatePosts] = React.useState<RoommatePost[]>([]);
  const [selectedRoommateForInterest, setSelectedRoommateForInterest] = React.useState<RoommatePost | null>(null);

  // Need Now Story Viewer state
  const [storyViewerOpen, setStoryViewerOpen] = React.useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = React.useState(0);

  const loadNearbyNeeds = React.useCallback(async () => {
    setNeedsLoading(true);
    setNeedsError(null);
    try {
      const loc: UserLocation = await resolveLocation();
      const feed = await nearbyFeed({
        longitude: loc.longitude,
        latitude: loc.latitude,
        limit: 10,
      });
      setNearbyNeeds(feed.items);
    } catch (err) {
      console.error('Failed to load nearby needs:', err);
      setNeedsError(err instanceof Error ? err.message : 'Could not load nearby needs');
    } finally {
      setNeedsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [collegesData, listingsData] = await Promise.all([
          fetchColleges(),
          fetchListings({ limit: 12 }),
        ]);
        setColleges(collegesData);
        setFeaturedListings(listingsData.items);
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNearbyNeeds();
  }, [loadNearbyNeeds]);

  // Roommate posts merged into the Featured masonry — runtime env toggle
  // via /api/home-config (HOME_ROOMMATE_FEED_ENABLED). Silent on failure:
  // no flag / no posts / logged out ⇒ no roommate tiles, layout untouched.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/home-config', { cache: 'no-store' });
        const cfg = (await res.json()) as {
          roommateFeedEnabled: boolean;
          roommateFeedCount: number;
        };
        if (cancelled || !cfg.roommateFeedEnabled) {
          if (!cancelled) setRoommateFeedEnabled(false);
          return;
        }
        if (!cancelled) setRoommateFeedEnabled(true);
        const posts = await fetchRoommatePosts();
        const sanitized = (posts ?? []).filter((post) => isValidRoommatePostTitle(post?.title));
        if (!cancelled) setRoommatePosts(sanitized.slice(0, cfg.roommateFeedCount || 6));
      } catch {
        if (!cancelled) setRoommateFeedEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCollegeId) params.append('collegeId', selectedCollegeId);
    if (searchQuery.trim()) params.append('query', searchQuery.trim());
    router.push(`/search?${params.toString()}`);
  };

  // Roommate tiles are spread through the masonry in pairs (like the promo
  // carousels): chunk 0 after the MAXIMUM carousel, chunk 1 after PREMIUM,
  // chunk 2 after BOOST, leftover after STANDARD.
  const roommateChunks = React.useMemo(() => {
    if (!roommateFeedEnabled || roommatePosts.length === 0) return [];
    const chunks: RoommatePost[][] = [];
    for (let i = 0; i < roommatePosts.length; i += 2) chunks.push(roommatePosts.slice(i, i + 2));
    return chunks;
  }, [roommateFeedEnabled, roommatePosts]);

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background pt-12 pb-16 sm:pt-20 sm:pb-24">
        {/* Ambient brand atmosphere — pure CSS (the WebGL Aurora shader that
            used to sit here shipped ogl + a full-viewport canvas on the first
            screen every mobile session loads). */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="fl-orb fl-orb-1 -top-32 -left-24 size-[26rem] bg-primary/12" />
          <div className="fl-orb fl-orb-2 top-1/3 -right-20 size-[22rem] bg-primary/8" />
          <div className="fl-orb fl-orb-3 -bottom-28 left-1/3 size-[20rem] bg-primary/6" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-primary shadow-xs">
              <Sparkles className="size-3.5" />
              <span className="text-xs font-semibold">Verified student housing near your campus</span>
            </div>

            {/* Main Headline */}
            <h1 className="max-w-4xl text-center text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl sm:leading-[1.1]">
              Find your ideal flat near{' '}
              <span className="fl-text-gradient">campus</span>
            </h1>
            <BlurFade delay={0.15} inView>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Explore verified student apartments, shared flats, and PG accommodations around top universities with zero hassle.
              </p>
            </BlurFade>

            {/* Quick Search Card */}

            <div className="fl-gradient-border mt-8 w-full max-w-3xl rounded-2xl">
            <Card className="border-0 bg-card/80 py-3 shadow-none ring-0 sm:py-4">
              <CardContent className="px-3 sm:px-4">
            <form
              onSubmit={handleHeroSearch}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                <Field className="sm:col-span-5">
                  <FieldLabel htmlFor="home-college">Select College</FieldLabel>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute top-2.5 left-3 z-10 text-muted-foreground" />
                    <Select
                      id="home-college"
                      value={selectedCollegeId}
                      onChange={(e) => setSelectedCollegeId(e.target.value)}
                      className="pl-9 text-sm"
                    >
                      <option value="">All Colleges</option>
                      {colleges.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Field>

                <Field className="sm:col-span-5">
                  <FieldLabel htmlFor="home-search">Location or Keywords</FieldLabel>
                  <InputGroup className="h-10">
                    <InputGroupAddon>
                      <Search />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="home-search"
                      type="text"
                      placeholder="e.g. 2 BHK, Koramangala, North Campus..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </InputGroup>
                </Field>

                <div className="flex sm:col-span-2">
                  <Button type="submit" size="lg" className="h-10 w-full gap-2 rounded-xl px-4 text-sm">
                    <Search className="size-4" />
                    Search
                  </Button>
                </div>
              </div>
            </form>
              </CardContent>
            </Card>
            </div>

            {/* Quick Stats / Highlights */}
            <BlurFade delay={0.25} inView>
            <div className="mt-12 grid grid-cols-2 gap-6 text-center sm:grid-cols-3">
              <div className="flex flex-col items-center">
                <span className="fl-num text-2xl font-bold text-foreground sm:text-3xl">100%</span>
                <span className="text-sm text-muted-foreground">Verified properties</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground sm:text-3xl">Direct</span>
                <span className="text-sm text-muted-foreground">Owner communication</span>
              </div>
              <div className="col-span-2 flex flex-col items-center sm:col-span-1">
                <span className="text-2xl font-bold text-foreground sm:text-3xl">Zero</span>
                <span className="text-sm text-muted-foreground">Hidden fees</span>
              </div>
            </div>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* Need Now — active requirements near you */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full" aria-labelledby="need-now-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-2">
              <Timer className="size-3.5" />
              <span>Need Now · 24h requirements</span>
            </div>
            <h2 id="need-now-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Students need housing right now
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Active requirements near Delhi — respond before their 24 hours run out.
            </p>
          </div>
          <HoverBorderGradient
            as={Link}
            href="/need-now/new"
            containerClassName="rounded-xl"
          >
            <Sparkles />
            Post your requirement
          </HoverBorderGradient>
        </div>

        {needsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`need-sk-${i}`} className="h-40 w-64 shrink-0 rounded-2xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : needsError ? (
          <ErrorState
            title="Could not load nearby needs"
            message={needsError}
            onRetry={() => void loadNearbyNeeds()}
          />
        ) : nearbyNeeds.length === 0 ? (
          <div className="fl-gradient-border rounded-3xl border border-dashed border-border bg-card p-8 text-center">
              <div className="flex flex-col items-center gap-3">
              <Timer className="text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No active requirements nearby</p>
              <p className="max-w-md text-xs text-muted-foreground">
                Be the first to post a 24-hour requirement and nearby students will see it instantly.
              </p>
              <Button
                render={<Link href="/need-now/new" />}
                nativeButton={false}
                size="sm"
                variant="outline"
                className="rounded-xl"
              >
                <Sparkles data-icon="inline-start" />
                Post your requirement
              </Button>
              </div>
          </div>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
            role="list"
            aria-label="Active housing requirements near you"
          >
            {nearbyNeeds.map((request, i) => (
              <div key={request.id} role="listitem" className="snap-start">
                <NeedNowFeedCard
                  request={request}
                  onClick={() => {
                    setStoryViewerIndex(i);
                    setStoryViewerOpen(true);
                  }}
                />
              </div>
            ))}
            <Link
              href="/need-now"
              className="flex w-40 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Timer className="size-6" />
              <span className="text-xs font-medium">See all requirements</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </section>

      {/* Featured Listings Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Featured flat listings
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Top rated housing options available near your preferred college
            </p>
          </div>
          <HoverBorderGradient
            as={Link}
            href="/search"
            containerClassName="rounded-xl"
            className="px-3 py-1.5 text-xs font-medium"
          >
            View All Flats
            <ArrowRight />
          </HoverBorderGradient>
        </div>

        {/* Pinterest-style masonry — every promotion type has its OWN carousel
            (maximum-only, premium-only, boost-only, standard-only), each a single
            masonry tile. Promotions are spread through the feed (a few listings
            between them) while keeping the premiumness order: Maximum → Premium →
            Boost → Standard. Cards fill the currently shortest column. */}
        <MasonryGrid adaptiveSpanKeys={['standard-promotion']}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
              <div key={`sk-a-${i}`} className="h-80 rounded-2xl bg-muted/60 animate-pulse" />
            ))
            : featuredListings.slice(0, 3).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onInterestClick={(item) => {
                  setSelectedListingForInterest(item);
                  setIsInterestOpen(true);
                }}
              />
            ))}

          <SponsoredAd
            key="maximum-carousel"
            placement="home"
            collegeId={selectedCollegeId || undefined}
            variant="banner"
            carousel
            intervalMs={4500}
            tierFilter="maximum"
          />

          {roommateChunks[0]?.map((post) => (
            <RoommateCard
              key={post.id}
              post={post}
              showRoommateBadge
              onInterestClick={(p) => setSelectedRoommateForInterest(p)}
            />
          ))}

          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
              <div key={`sk-b-${i}`} className="h-80 rounded-2xl bg-muted/60 animate-pulse" />
            ))
            : featuredListings.slice(3, 6).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onInterestClick={(item) => {
                  setSelectedListingForInterest(item);
                  setIsInterestOpen(true);
                }}
              />
            ))}

          <SponsoredAd
            key="premium-carousel"
            placement="home"
            collegeId={selectedCollegeId || undefined}
            variant="banner"
            carousel
            intervalMs={4500}
            tierFilter="premium"
          />

          {roommateChunks[1]?.map((post) => (
            <RoommateCard
              key={post.id}
              post={post}
              showRoommateBadge
              onInterestClick={(p) => setSelectedRoommateForInterest(p)}
            />
          ))}

          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
              <div key={`sk-c-${i}`} className="h-80 rounded-2xl bg-muted/60 animate-pulse" />
            ))
            : featuredListings.slice(6, 9).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onInterestClick={(item) => {
                  setSelectedListingForInterest(item);
                  setIsInterestOpen(true);
                }}
              />
            ))}

          {roommateChunks[2]?.map((post) => (
            <RoommateCard
              key={post.id}
              post={post}
              showRoommateBadge
              onInterestClick={(p) => setSelectedRoommateForInterest(p)}
            />
          ))}

          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => (
              <div key={`sk-d-${i}`} className="h-80 rounded-2xl bg-muted/60 animate-pulse" />
            ))
            : featuredListings.slice(9, 11).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onInterestClick={(item) => {
                  setSelectedListingForInterest(item);
                  setIsInterestOpen(true);
                }}
              />
            ))}

          {/* Boost/Standard promo carousels intentionally dropped: four
              auto-rotating ad carousels per screen made it impossible to tell
              inventory from advertising. Sponsored inventory now gets two
              slots (maximum + premium) plus the labelled thin tiles. */}

          {roommateChunks[3]?.map((post) => (
            <RoommateCard
              key={post.id}
              post={post}
              showRoommateBadge
              onInterestClick={(p) => setSelectedRoommateForInterest(p)}
            />
          ))}

          {isLoading
            ? Array.from({ length: 1 }).map((_, i) => (
              <div key={`sk-e-${i}`} className="h-80 rounded-2xl bg-muted/60 animate-pulse" />
            ))
            : featuredListings.slice(11).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onInterestClick={(item) => {
                  setSelectedListingForInterest(item);
                  setIsInterestOpen(true);
                }}
              />
            ))}
        </MasonryGrid>
      </section>

      {/* Roommate Discovery Banner */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="fl-gradient-border relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-card to-muted p-8 text-foreground shadow-xl sm:p-12">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium">
              <Users className="size-3.5" />
              <span>Roommate finder</span>
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Looking for a roommate to split rent?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Connect with fellow students attending your university and find verified flatmates with matching habits and budget.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button render={<Link href="/roommates" />} nativeButton={false} size="lg" className="h-11 rounded-xl px-5">
                <Users className="size-4" />
                Explore roommates
              </Button>
              <Button
                render={<Link href="/roommate-posts/new" />}
                nativeButton={false}
                size="lg"
                variant="outline"
                className="h-11 rounded-xl px-5"
              >
                Post a requirement
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Interest Dialog */}
      <InterestDialog
        listing={selectedListingForInterest}
        open={isInterestOpen}
        onOpenChange={setIsInterestOpen}
      />

      {/* Roommate Interest Dialog — same one the /roommates page uses */}
      <RoommateInterestDialog
        post={selectedRoommateForInterest}
        isOpen={!!selectedRoommateForInterest}
        onClose={() => setSelectedRoommateForInterest(null)}
      />

      {/* Need Now Story Viewer — fullscreen Instagram-style overlay */}
      {storyViewerOpen && nearbyNeeds.length > 0 && (
        <NeedNowStoryViewer
          requests={nearbyNeeds}
          initialIndex={storyViewerIndex}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}
    </div>
  );
}
