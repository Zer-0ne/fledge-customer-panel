'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Megaphone, Send } from 'lucide-react';
import { fetchMyRoommatePosts } from '@/lib/api/services/roommates';
import { fetchMyAppeals, submitAppeal } from '@/lib/api/services/integrity';
import { Appeal, RoommatePost } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ModerationBadge } from '@/components/community/moderation-state';

export default function AppealPostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const postId = React.use(params).id;

  const [post, setPost] = React.useState<RoommatePost | null>(null);
  const [appeals, setAppeals] = React.useState<Appeal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [detail, setDetail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [mine, myAppeals] = await Promise.all([fetchMyRoommatePosts(), fetchMyAppeals()]);
      if (cancelled) return;
      const found = mine.find((item) => item.id === postId);
      if (!found) {
        setLoadError('Post not found or you do not own this post.');
      } else {
        setPost(found);
      }
      setAppeals(myAppeals.filter((appeal) => appeal.targetId === postId));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;
    setSubmitting(true);
    try {
      await submitAppeal({
        targetType: 'ROOMMATE_POST',
        targetId: post.id,
        reason: reason.trim(),
        detail: detail.trim() || undefined,
      });
      showToast({ title: 'Appeal submitted', description: 'Our team will review your appeal.', variant: 'default' });
      router.push('/roommate-posts');
    } catch (err) {
      showToast({
        title: 'Could not submit appeal',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6 space-y-4">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (loadError || !post) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6">
          <ErrorState title="Cannot appeal this post" description={loadError ?? 'Post not found'} />
        </div>
      </div>
    );
  }

  const hasPendingAppeal = appeals.some((appeal) => appeal.status === 'SUBMITTED' || appeal.status === 'UNDER_REVIEW');

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-2xl px-4 sm:px-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/roommate-posts')} className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5">
          <ArrowLeft className="size-4" />
          Back to my posts
        </Button>

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="size-6 text-primary" />
            Appeal this decision
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            If you believe your post was rejected by mistake, tell us why.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{post.title}</h2>
            <ModerationBadge post={post} />
          </div>
          <p className="text-sm text-muted-foreground">
            {post.decision?.safeReason ?? 'This post does not follow the community content rules.'}
          </p>
          {post.decision?.redirectTarget && (
            <p className="text-xs text-muted-foreground">
              You can also edit this as a personal post, create a property listing,
              or create a paid advertisement.
            </p>
          )}
        </div>

        {hasPendingAppeal && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-400">
            You already have a pending appeal for this post. Our team is reviewing it.
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-3xl border border-border/60 bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Reason <span className="text-destructive">*</span> (3–120 characters)
            </label>
            <Input
              required
              value={reason}
              maxLength={120}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. This is a genuine personal post about my own room"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Details (optional, max 1000 characters)</label>
            <Textarea
              rows={5}
              value={detail}
              maxLength={1000}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Add context that supports your appeal"
              className="rounded-xl resize-none text-sm"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/roommate-posts')} className="rounded-xl px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || hasPendingAppeal || reason.trim().length < 3} className="rounded-xl px-8 font-semibold gap-2">
              <Send className="size-4" />
              {submitting ? 'Submitting…' : 'Submit appeal'}
            </Button>
          </div>
        </form>

        {appeals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Your appeals</h2>
            {appeals.map((appeal) => (
              <div key={appeal.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">{appealStatusLabel(appeal.status)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(appeal.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{appeal.reason}</p>
                {appeal.moderatorNote && (
                  <p className="text-xs text-muted-foreground">Moderator: {appeal.moderatorNote}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function appealStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SUBMITTED: 'Appeal pending',
    UNDER_REVIEW: 'Appeal under review',
    UPHELD: 'Appeal not accepted',
    OVERTURNED: 'Appeal accepted',
    CHANGES_REQUIRED: 'Changes required',
  };
  return labels[status] ?? status;
}
