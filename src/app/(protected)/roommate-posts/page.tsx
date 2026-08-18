'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Ban, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import { fetchMyRoommatePosts } from '@/lib/api/services/roommates';
import {
  fetchMyRestrictions,
  hasPostingRestriction,
  reportRoommatePost,
  COMMUNITY_REPORT_REASONS,
} from '@/lib/api/services/integrity';
import { CapabilityRestriction, RoommatePost } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PostStateCard } from '@/components/community/moderation-state';

export default function MyRoommatePostsPage() {
  const router = useRouter();
  const [posts, setPosts] = React.useState<RoommatePost[] | null>(null);
  const [restrictions, setRestrictions] = React.useState<CapabilityRestriction[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [reportPost, setReportPost] = React.useState<RoommatePost | null>(null);
  const [reportReason, setReportReason] = React.useState<string>('');
  const [reporting, setReporting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [myPosts, myRestrictions] = await Promise.all([
          fetchMyRoommatePosts(),
          fetchMyRestrictions(),
        ]);
        if (cancelled) return;
        setPosts(myPosts);
        setRestrictions(myRestrictions);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your posts');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const blocked = hasPostingRestriction(restrictions);

  const submitReport = async () => {
    if (!reportPost || !reportReason) return;
    setReporting(true);
    try {
      await reportRoommatePost(reportPost.id, reportReason as never);
      showToast({ title: 'Report submitted', description: 'Thank you — our team will review it.', variant: 'default' });
      setReportPost(null);
      setReportReason('');
    } catch (err) {
      showToast({
        title: 'Could not submit report',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold sm:text-3xl tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="size-6 text-primary" />
              My Posts
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Every personal post you have created and its current status.
            </p>
          </div>
          <Link href="/roommate-posts/new">
            <Button className="rounded-xl gap-2 font-semibold">
              <Plus className="size-4" />
              New post
            </Button>
          </Link>
        </div>

        {blocked && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Posting restricted
                </h2>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                  You are currently restricted from creating or publishing personal
                  posts. Existing posts remain visible.
                </p>
              </div>
            </div>
            <RestrictionList restrictions={restrictions} />
          </div>
        )}

        {posts === null && !error && (
          <div className="space-y-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        )}

        {error && <ErrorState title="Could not load your posts" description={error} />}

        {posts !== null && !error && posts.length === 0 && (
          <EmptyState
            title="No posts yet"
            description="Create a personal post to find a roommate, or offer a room in your flat."
            actionLabel="Create your first post"
            onAction={() => router.push('/roommate-posts/new')}
          />
        )}

        {posts !== null && !error && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostStateCard
                key={post.id}
                post={post}
                showReport
                onReport={setReportPost}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={reportPost !== null} onOpenChange={(open) => !open && setReportPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this post</DialogTitle>
            <DialogDescription>
              Choose the reason that best describes the issue. Reports never result
              in an automatic ban.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2" role="radiogroup" aria-label="Report reason">
            {COMMUNITY_REPORT_REASONS.map((reason) => (
              <button
                key={reason.value}
                type="button"
                role="radio"
                aria-checked={reportReason === reason.value}
                onClick={() => setReportReason(reason.value)}
                className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-border aria-checked:border-primary/60 aria-checked:bg-primary/5"
              >
                {reason.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportPost(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={submitReport}
              disabled={!reportReason || reporting}
              variant="destructive"
              className="rounded-xl"
            >
              {reporting ? 'Submitting…' : 'Submit report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RestrictionList({ restrictions }: { restrictions: CapabilityRestriction[] }) {
  const router = useRouter();
  const blocking = restrictions.filter((restriction) =>
    ['ROOMMATE_POST_CREATE_RESTRICTED', 'ROOMMATE_POST_PUBLISH_RESTRICTED', 'ROOMMATE_MEDIA_UPLOAD_RESTRICTED', 'ACCOUNT_FULLY_SUSPENDED'].includes(restriction.capability)
  );
  if (blocking.length === 0) return null;

  return (
    <div className="space-y-2">
      {blocking.map((restriction) => (
        <div key={restriction.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background/60 p-3">
          <div className="space-y-0.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Ban className="size-3.5 text-amber-500" />
              {restrictionReasonLabel(restriction.capability)}
            </p>
            {restriction.reason && (
              <p className="text-xs text-muted-foreground">{restriction.reason}</p>
            )}
            {restriction.expiresAt && (
              <p className="text-[11px] text-muted-foreground">
                Until {new Date(restriction.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
          {restriction.appealAvailable && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() =>
                router.push(
                  `/roommate-posts/new?appealRestriction=${encodeURIComponent(restriction.id)}`
                )
              }
            >
              Appeal
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function restrictionReasonLabel(capability: string): string {
  const labels: Record<string, string> = {
    ROOMMATE_POST_CREATE_RESTRICTED: 'Creating personal posts is restricted',
    ROOMMATE_POST_PUBLISH_RESTRICTED: 'Publishing personal posts is restricted',
    ROOMMATE_MEDIA_UPLOAD_RESTRICTED: 'Uploading post media is restricted',
    ACCOUNT_FULLY_SUSPENDED: 'Account is suspended',
  };
  return labels[capability] ?? 'Posting is restricted';
}
