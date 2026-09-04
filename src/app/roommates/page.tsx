'use client';

import * as React from 'react';
import Link from 'next/link';
import { RoommatePost, College, Campus } from '@/types';
import { fetchRoommatePosts, fetchRoommateInterests } from '@/lib/api/services/roommates';
import { fetchColleges, fetchCampuses } from '@/lib/api/services/discovery';
import { RoommateCard } from '@/components/roommates/roommate-card';
import { RoommateFilters, RoommateFilterValues } from '@/components/roommates/roommate-filters';
import { RoommateInterestDialog } from '@/components/roommates/roommate-interest-dialog';
import { MasonryGrid } from '@/components/common/masonry-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/components/providers/auth-provider';
import { Users, Plus, Sparkles, ShieldCheck } from 'lucide-react';

export default function RoommateDiscoveryPage() {
  const { user } = useAuth();
  const [posts, setPosts] = React.useState<RoommatePost[]>([]);
  const [colleges, setColleges] = React.useState<College[]>([]);
  const [campuses, setCampuses] = React.useState<Campus[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [activeFilters, setActiveFilters] = React.useState<RoommateFilterValues>({});
  const [selectedPostForInterest, setSelectedPostForInterest] = React.useState<RoommatePost | null>(null);
  const [expressedInterestPostIds, setExpressedInterestPostIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    async function initData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [fetchedPosts, fetchedColleges] = await Promise.all([
          fetchRoommatePosts(activeFilters),
          fetchColleges(),
        ]);

        setPosts(fetchedPosts || []);
        setColleges(fetchedColleges || []);

        if (activeFilters.collegeId) {
          const fetchedCampuses = await fetchCampuses(activeFilters.collegeId);
          setCampuses(fetchedCampuses || []);
        } else {
          setCampuses([]);
        }

        if (user?.id) {
          try {
            const interests = await fetchRoommateInterests(user.id);
            const ids = new Set(interests.outgoing.map((i) => i.postId).filter(Boolean));
            setExpressedInterestPostIds(ids);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('Error loading roommate page data:', err);
        setLoadError(err instanceof Error ? err.message : 'Could not load roommate posts');
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, [activeFilters, user?.id, reloadKey]);

  // Client-side filtering enhancement for mock/API consistency
  const filteredPosts = React.useMemo(() => {
    return posts.filter((post) => {
      if (activeFilters.locality) {
        const query = activeFilters.locality.toLowerCase();
        const matchesLocality = post.locality?.toLowerCase().includes(query) ||
          post.locationPreference?.toLowerCase().includes(query) ||
          post.title.toLowerCase().includes(query) ||
          post.description?.toLowerCase().includes(query);
        if (!matchesLocality) return false;
      }
      if (activeFilters.collegeId && post.collegeId && post.collegeId !== activeFilters.collegeId) {
        return false;
      }
      if (activeFilters.maxBudgetINR && post.budgetPaise) {
        const maxBudgetPaise = Number(activeFilters.maxBudgetINR) * 100;
        if (post.budgetPaise > maxBudgetPaise) return false;
      }
      if (activeFilters.vegetarianOnly && !post.preferences?.vegetarianOnly && !post.preferences?.vegetarian) {
        return false;
      }
      if (activeFilters.studentOnly && !post.preferences?.studentOnly) {
        return false;
      }
      if (activeFilters.nonSmokerOnly && !post.preferences?.nonSmokerOnly) {
        return false;
      }
      return true;
    });
  }, [posts, activeFilters]);

  // Separate user's own posts from others
  const myPosts = React.useMemo(() => {
    if (!user) return [];
    return filteredPosts.filter(
      (p) => p.userId === user.id || p.user?.id === user.id
    );
  }, [filteredPosts, user]);

  const otherPosts = React.useMemo(() => {
    if (!user) return filteredPosts;
    return filteredPosts.filter(
      (p) => p.userId !== user.id && p.user?.id !== user.id
    );
  }, [filteredPosts, user]);

  return (
    <div className="min-h-screen bg-background py-8 pb-20 md:pb-8">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 dark:from-indigo-950 dark:via-purple-950 dark:to-slate-900 p-8 text-white shadow-xl border border-white/10 dark:border-purple-500/20">
          <div className="absolute -right-10 -bottom-10 size-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 size-60 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-white border border-white/20 shadow-xs">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>Student Community & Roommate Matching</span>
            </div>
            <h1 className="text-3xl font-extrabold sm:text-4xl tracking-tight text-white">
              Find Your Ideal Roommate
            </h1>
            <p className="text-sm sm:text-base text-white/90 leading-relaxed">
              Connect with verified students and flatmates near your college campus. Post your preferences or browse active roommate listings.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link href="/roommate-posts/new">
                <Button size="lg" className="rounded-2xl font-bold shadow-lg bg-white text-indigo-950 hover:bg-white/90 dark:bg-white dark:text-indigo-950 dark:hover:bg-white/90 transition-all border-0">
                  <Plus className="mr-2 size-5" />
                  Post a Roommate Request
                </Button>
              </Link>
              <Link href="/roommate-posts">
                <Button size="lg" variant="outline" className="rounded-2xl font-bold border-white/30 text-white hover:bg-white/10 hover:text-white transition-all">
                  My Posts
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <RoommateFilters
          colleges={colleges}
          campuses={campuses}
          initialValues={activeFilters}
          onFilterChange={(filters) => setActiveFilters(filters)}
          onReset={() => setActiveFilters({})}
        />

        {/* My Posts Section */}
        {!isLoading && user && myPosts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-500" />
                Your Posts
              </h2>
              <span className="text-xs text-muted-foreground font-medium">
                {myPosts.length} {myPosts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>
            <MasonryGrid>
              {myPosts.map((post) => (
                <RoommateCard
                  key={post.id}
                  post={post}
                  isOwner={true}
                  onInterestClick={(p) => setSelectedPostForInterest(p)}
                />
              ))}
            </MasonryGrid>
          </div>
        )}

        {/* Content Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Active Roommate Posts
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              Showing {otherPosts.length} posts
            </span>
          </div>

          {loadError ? (
            <ErrorState
              title="Could not load roommate posts"
              message={loadError}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : otherPosts.length === 0 ? (
            <EmptyState
              title="No roommate posts found"
              description="Try relaxing your filters or create your own roommate post to find compatible flatmates."
              actionLabel="Create Roommate Post"
              onAction={() => window.location.href = '/roommate-posts/new'}
            />
          ) : (
            <MasonryGrid>
              {otherPosts.map((post) => (
                <RoommateCard
                  key={post.id}
                  post={post}
                  isOwner={false}
                  hasExpressedInterest={expressedInterestPostIds.has(post.id)}
                  onInterestClick={(p) => setSelectedPostForInterest(p)}
                />
              ))}
            </MasonryGrid>
          )}
        </div>
      </div>

      {/* Interest Dialog */}
      <RoommateInterestDialog
        post={selectedPostForInterest}
        isOpen={!!selectedPostForInterest}
        onClose={() => setSelectedPostForInterest(null)}
        onSubmitted={() => {
          if (selectedPostForInterest) {
            setExpressedInterestPostIds((prev) => new Set([...prev, selectedPostForInterest.id]));
          }
        }}
      />
    </div>
  );
}
