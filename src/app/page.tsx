'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { College, Listing, NeedNowRequest, RoommatePost } from '@/types';
import { fetchColleges, fetchListings } from '@/lib/api/services/discovery';
import { nearbyFeed } from '@/lib/api/services/neednow';
import { fetchRoommatePosts } from '@/lib/api/services/roommates';
import { ListingCard } from '@/components/listings/listing-card';
import { MasonryGrid } from '@/components/common/masonry-grid';
import { InterestDialog } from '@/components/listings/interest-dialog';
import Aurora from '@/components/Aurora'
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { SponsoredAd } from '@/components/ads/sponsored-ad';
import { NeedNowFeedCard } from '@/components/neednow/neednow-feed-card';
import Text3DFlip from "@/components/ui/text-3d-flip"
import { RoommateCard } from '@/components/roommates/roommate-card';
import { RoommateInterestDialog } from '@/components/roommates/roommate-interest-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/error-state';
import { Search, Building2, Users, ArrowRight, Sparkles, Timer } from 'lucide-react';

const NEED_NOW_DEFAULT_LAT = 28.6139; // Delhi
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

  const loadNearbyNeeds = React.useCallback(async () => {
    setNeedsLoading(true);
    setNeedsError(null);
    try {
      const feed = await nearbyFeed({
        longitude: NEED_NOW_DEFAULT_LNG,
        latitude: NEED_NOW_DEFAULT_LAT,
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
            <div className="inline-flex backdrop-blur-2xl! backdrop-saturate-50! items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6 shadow-xs">
              <Sparkles className="size-3.5" />
              <AnimatedShinyText className='text-white'>Verified Student Housing Near Your Campus</AnimatedShinyText>
            </div>

            {/* Main Headline */}

            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-tight">
              <Text3DFlip
                className="bg-none text-center! justify-center"
                textClassName="bg-none text-foreground"
                flipTextClassName="bg-none text-foreground"
                rotateDirection="top"
              >
                Find Your Ideal Flat Near <span className="text-primary bg-gradient-to-r from-primary to-primary/70 bg-clip-text">Campus</span>
              </Text3DFlip>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Explore verified student apartments, shared flats, and PG accommodations around top universities with zero hassle.
            </p>

            {/* Quick Search Card */}

            <form
              onSubmit={handleHeroSearch}
              className="mt-8 w-full max-w-3xl rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-lg backdrop-blur-xl"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
                {/* College Selector */}
                <div className="sm:col-span-5 relative text-left">
                  <label className="block text-xs font-medium text-muted-foreground mb-1 ml-1">
                    Select College
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 size-4 text-muted-foreground z-10 pointer-events-none" />
                    <Select
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
                </div>

                {/* Keyword Search */}
                <div className="sm:col-span-5 text-left">
                  <label className="block text-xs font-medium text-muted-foreground mb-1 ml-1">
                    Location or Keywords
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground z-10 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="e.g. 2 BHK, Koramangala, North Campus..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="sm:col-span-2 flex items-end">
                  <Button type="submit" size="lg" className="w-full gap-2 rounded-xl sm:mt-5">
                    <Search className="size-4" />
                    <span>Search</span>
                  </Button>
                </div>
              </div>
            </form>

            {/* Quick Stats / Highlights */}
            <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 text-center">
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
          <Link href="/need-now/new">
            <Button className="gap-2 rounded-xl font-semibold shadow-sm">
              <Sparkles className="size-4" />
              Post your requirement
            </Button>
          </Link>
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
          <div className="rounded-3xl border border-dashed border-border p-8 text-center space-y-3">
            <Timer className="mx-auto size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No active requirements nearby</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Be the first to post a 24-hour requirement and nearby students will see it instantly.
            </p>
            <Link href="/need-now/new" className="inline-block pt-1">
              <Button className="gap-2 rounded-xl">
                <Sparkles className="size-4" />
                Post your requirement
              </Button>
            </Link>
          </div>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
            role="list"
            aria-label="Active housing requirements near you"
          >
            {nearbyNeeds.map((request) => (
              <div key={request.id} role="listitem" className="snap-start">
                <NeedNowFeedCard request={request} />
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
              Featured Flat Listings
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Top rated housing options available near your preferred college
            </p>
          </div>
          <Link href="/search">
            <Button variant="ghost" className="gap-2 text-primary hover:text-primary font-medium">
              <span>View All Flats</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
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
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Users className="size-3.5 text-emerald-300" />
              <span>Roommate Finder</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Looking for a roommate to split rent?
            </h2>
            <p className="text-white/70 text-sm sm:text-base">
              Connect with fellow students attending your university and find verified flatmates with matching habits and budget.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link href="/roommates">
                <Button size="lg" className="gap-2 rounded-xl shadow-md">
                  <Users className="size-4" />
                  Explore Roommates
                </Button>
              </Link>
              <Link href="/roommate-posts/new">
                <Button size="lg" variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10 rounded-xl">
                  Post Roommate Requirement
                </Button>
              </Link>
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
    </div>
  );
}
