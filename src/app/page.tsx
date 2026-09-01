'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { College, Listing, NeedNowRequest, RoommatePost } from '@/types';
import { fetchColleges, fetchListings } from '@/lib/api/services/discovery';
import { nearbyFeed } from '@/lib/api/services/neednow';
import { fetchRoommatePosts } from '@/lib/api/services/roommates';
import { resolveLocation, type UserLocation } from '@/lib/location';
import { ListingCard } from '@/components/listings/listing-card';
import { MasonryGrid } from '@/components/common/masonry-grid';
import { InterestDialog } from '@/components/listings/interest-dialog';
import Aurora from '@/components/Aurora'
import { SparklesText } from "@/components/ui/sparkles-text"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { MagicCard } from "@/components/ui/magic-card"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Field, FieldLabel } from "@/components/ui/field"
import { Card, CardContent } from "@/components/ui/card"
import { LiquidGlassCard } from "@/components/kokonutui/liquid-glass-card"
import { SponsoredAd } from '@/components/ads/sponsored-ad';
import { NeedNowFeedCard } from '@/components/neednow/neednow-feed-card';
import { NeedNowStoryViewer } from '@/components/neednow/neednow-story-viewer';
import Text3DFlip from "@/components/ui/text-3d-flip"
import { RoommateCard } from '@/components/roommates/roommate-card';
import { RoommateInterestDialog } from '@/components/roommates/roommate-interest-dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/error-state';
import { Search, Building2, Users, ArrowRight, Sparkles, Timer } from 'lucide-react';

const NEED_NOW_DEFAULT_LAT = 28.6139; // Delhi fallback
const NEED_NOW_DEFAULT_LNG = 77.209;

export default function HomePage() {
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
        if (!cancelled) setRoommatePosts(posts.slice(0, cfg.roommateFeedCount || 6));
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
      <Aurora
        blend={0.5}
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-primary shadow-xs">
              <Sparkles />
              <SparklesText className="text-xs font-semibold text-primary" sparklesCount={4}>
                Verified Student Housing Near Your Campus
              </SparklesText>
            </div>

            {/* Main Headline */}

            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-tight">
              <Text3DFlip
                className="bg-none text-center! justify-center"
                textClassName="bg-none text-foreground"
                flipTextClassName="bg-none text-foreground"
                rotateDirection="top"
              >
                Find Your Ideal Flat Near <AnimatedGradientText>Campus</AnimatedGradientText>
              </Text3DFlip>
            </h1>
            <BlurFade delay={0.15} inView>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Explore verified student apartments, shared flats, and PG accommodations around top universities with zero hassle.
              </p>
            </BlurFade>

            {/* Quick Search Card */}

            <MagicCard className="mt-8 w-full max-w-3xl rounded-2xl">
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
                  <ShimmerButton type="submit" className="h-10 w-full gap-2 rounded-xl px-4 py-2 text-sm">
                    <Search />
                    Search
                  </ShimmerButton>
                </div>
              </div>
            </form>
              </CardContent>
            </Card>
            </MagicCard>

            {/* Quick Stats / Highlights */}
            <BlurFade delay={0.25} inView>
            <div className="mt-12 grid grid-cols-2 gap-6 text-center sm:grid-cols-3">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground sm:text-3xl">100%</span>
                <span className="text-xs text-muted-foreground">Verified Properties</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground sm:text-3xl">Direct</span>
                <span className="text-xs text-muted-foreground">Owner Communication</span>
              </div>
              <div className="flex flex-col items-center col-span-2 sm:col-span-1">
                <span className="text-2xl font-bold text-foreground sm:text-3xl">Zero</span>
                <span className="text-xs text-muted-foreground">Hidden Fees</span>
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
            <h2 id="need-now-heading" className="sr-only">
              Students need housing right now
            </h2>
            <TextGenerateEffect words="Students need housing right now" />
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
          <LiquidGlassCard className="rounded-3xl border-dashed p-8 text-center">
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
          </LiquidGlassCard>
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
            <h2 className="sr-only">Featured Flat Listings</h2>
            <TextGenerateEffect words="Featured Flat Listings" />
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

          <SponsoredAd
            key="boost-carousel"
            placement="home"
            collegeId={selectedCollegeId || undefined}
            variant="banner"
            carousel
            intervalMs={4500}
            tierFilter="boost"
          />

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

          {/* Standard/Active slim promotion — adaptive masonry tile (span 1-2) */}
          <SponsoredAd
            key="standard-promotion"
            placement="home"
            collegeId={selectedCollegeId || undefined}
            variant="banner"
            carousel
            intervalMs={4500}
            tierFilter="standard"
            className="standard-promotion"
          />

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
        <MagicCard className="rounded-3xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-card to-muted p-8 text-foreground shadow-xl sm:p-12">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium">
              <Users />
              <span>Roommate Finder</span>
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Looking for a roommate to split rent?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Connect with fellow students attending your university and find verified flatmates with matching habits and budget.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <HoverBorderGradient
                as={Link}
                href="/roommates"
                containerClassName="rounded-xl"
              >
                <Users />
                Explore Roommates
              </HoverBorderGradient>
              <HoverBorderGradient
                as={Link}
                href="/roommate-posts/new"
                containerClassName="rounded-xl"
              >
                Post Roommate Requirement
              </HoverBorderGradient>
            </div>
          </div>
        </div>
        </MagicCard>
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
