'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, ShieldAlert } from 'lucide-react';
import { fetchMyRoommatePosts, updateRoommatePost } from '@/lib/api/services/roommates';
import { RoommatePost, RoommatePostType } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ContentRules } from '@/components/community/content-rules';
import { MediaPicker } from '@/components/community/media-picker';
import { resolveMediaUrl } from '@/components/roommates/roommate-post-media';
import { ModerationBadge, getPostState } from '@/components/community/moderation-state';
import { PostTypeSelect } from '@/components/community/post-type-select';

interface PickedImage {
  mediaId: string;
  url?: string;
}

export default function EditRoommatePostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const postId = React.use(params).id;

  const [post, setPost] = React.useState<RoommatePost | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [mediaUploading, setMediaUploading] = React.useState(false);

  // Editable fields
  const [postType, setPostType] = React.useState<RoommatePostType>('NEED_ROOMMATE');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [budgetINR, setBudgetINR] = React.useState('');
  const [expiryDays, setExpiryDays] = React.useState('30');
  const [moveInFrom, setMoveInFrom] = React.useState('');
  const [moveInTo, setMoveInTo] = React.useState('');
  const [moveOutAt, setMoveOutAt] = React.useState('');
  const [images, setImages] = React.useState<PickedImage[]>([]);
  const [vegetarianOnly, setVegetarianOnly] = React.useState(false);
  const [studentOnly, setStudentOnly] = React.useState(true);
  const [nonSmokerOnly, setNonSmokerOnly] = React.useState(false);
  const [gender, setGender] = React.useState<'any' | 'male' | 'female'>('any');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const mine = await fetchMyRoommatePosts();
      if (cancelled) return;
      const found = mine.find((item) => item.id === postId);
      if (!found) {
        setLoadError('Post not found or you do not own this post.');
        setLoading(false);
        return;
      }
      setPost(found);
      setPostType(found.postType ?? 'NEED_ROOMMATE');
      setTitle(found.title);
      setBody(found.body || found.description);
      setBudgetINR(found.budgetPaise != null ? String(Math.round(found.budgetPaise / 100)) : '');
      setMoveInFrom(found.moveInFrom ? toDateInput(found.moveInFrom) : '');
      setMoveInTo(found.moveInTo ? toDateInput(found.moveInTo) : '');
      setMoveOutAt(found.moveOutAt ? toDateInput(found.moveOutAt) : '');
      const existingMediaIds = found.mediaIds ?? [];
      setImages(existingMediaIds.map((mediaId) => ({ mediaId })));
      // Hydrate preview URLs for already-attached media (shared cached resolver).
      void Promise.all(
        existingMediaIds.map(async (mediaId) => {
          const url = await resolveMediaUrl(mediaId);
          if (!cancelled && url) {
            setImages((prev) =>
              prev.map((img) => (img.mediaId === mediaId && !img.url ? { ...img, url } : img))
            );
          }
        })
      );
      const prefs = found.preferences ?? {};
      setVegetarianOnly(Boolean(prefs.vegetarianOnly ?? prefs.vegetarian));
      setStudentOnly(Boolean(prefs.studentOnly));
      setNonSmokerOnly(Boolean(prefs.nonSmokerOnly));
      if (typeof prefs.gender === 'string') setGender(prefs.gender as 'any' | 'male' | 'female');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;

    if (!title.trim() || title.length < 5) {
      showToast({ title: 'Validation Error', description: 'Title must be at least 5 characters long.', variant: 'error' });
      return;
    }
    if (!body.trim() || body.length < 10) {
      showToast({ title: 'Validation Error', description: 'Description must be at least 10 characters long.', variant: 'error' });
      return;
    }

    const days = parseInt(expiryDays, 10) || 30;
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const budgetPaise = budgetINR ? Math.round(parseFloat(budgetINR) * 100) : null;

    setIsSaving(true);
    try {
      const result = await updateRoommatePost(post.id, {
        postType,
        title: title.trim(),
        body: body.trim(),
        budgetPaise,
        expiresAt,
        moveInFrom: moveInFrom ? new Date(moveInFrom).toISOString() : null,
        moveInTo: moveInTo ? new Date(moveInTo).toISOString() : null,
        moveOutAt: moveOutAt ? new Date(moveOutAt).toISOString() : null,
        mediaIds: images.map((image) => image.mediaId),
        preferences: {
          vegetarianOnly,
          vegetarian: vegetarianOnly,
          studentOnly,
          nonSmokerOnly,
          gender,
          budgetMaxPaise: budgetPaise ?? undefined,
        },
      });

      if (result.requiredAction?.type === 'TENANT_VERIFICATION') {
        showToast({ title: 'Almost there!', description: 'Complete a quick tenant verification to publish your post.', variant: 'default' });
        router.push(`/roommate-posts/${post.id}/verify`);
        return;
      }

      if (result.moderationStatus === 'CHANGES_REQUIRED') {
        showToast({ title: 'Changes still required', description: 'Your updated post still needs a few changes.', variant: 'error' });
        router.push('/roommate-posts');
        return;
      }

      showToast({
        title: result.publicationStatus === 'PUBLISHED' ? 'Post updated and published' : 'Post submitted for review',
        description: 'Your changes were saved.',
        variant: 'default',
      });
      router.push('/roommate-posts');
    } catch (err) {
      showToast({
        title: 'Could not save changes',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 space-y-4">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (loadError || !post) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6">
          <ErrorState title="Cannot edit this post" description={loadError ?? 'Post not found'} />
        </div>
      </div>
    );
  }

  const state = getPostState(post);
  const busy = isSaving || mediaUploading;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/roommate-posts')} className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5">
          <ArrowLeft className="size-4" />
          Back to my posts
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Edit post</h1>
          <ModerationBadge post={post} />
        </div>

        {(state.state === 'rejected' || state.state === 'changes-required') && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{state.description}</p>
              {(post.decision?.changeHints ?? []).length > 0 && (
                <ul className="list-disc pl-4 text-xs text-amber-700/80 dark:text-amber-400/80">
                  {post.decision?.changeHints?.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <ContentRules />

        <form onSubmit={handleSave} className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-medium text-foreground">Post type</label>
            <PostTypeSelect value={postType} onChange={setPostType} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Description <span className="text-destructive">*</span>
            </label>
            <Textarea required rows={5} value={body} onChange={(e) => setBody(e.target.value)} className="rounded-xl resize-none text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Room photos</label>
            <MediaPicker value={images} onChange={setImages} purpose="community" onUploadingChange={setMediaUploading} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Monthly Rent Budget (₹)</label>
              <Input type="number" placeholder="e.g. 8500" value={budgetINR} onChange={(e) => setBudgetINR(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Post Active Duration</label>
              <Select value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} className="rounded-xl">
                <option value="7">Active for 7 Days</option>
                <option value="14">Active for 14 Days</option>
                <option value="30">Active for 30 Days</option>
                <option value="60">Active for 60 Days</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Move-in From Date</label>
              <Input type="date" value={moveInFrom} onChange={(e) => setMoveInFrom(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Move-in Latest Date (To)</label>
              <Input type="date" value={moveInTo} onChange={(e) => setMoveInTo(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Move-out Date (leaving-flat posts)</label>
              <Input type="date" value={moveOutAt} onChange={(e) => setMoveOutAt(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Gender Preference</label>
              <Select value={gender} onChange={(e) => setGender(e.target.value as 'any' | 'male' | 'female')} className="rounded-xl">
                <option value="any">Any Gender</option>
                <option value="male">Male Only</option>
                <option value="female">Female Only</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <span className="text-xs font-medium text-foreground">Vegetarian Only</span>
              <Switch checked={vegetarianOnly} onCheckedChange={setVegetarianOnly} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <span className="text-xs font-medium text-foreground">Students Only</span>
              <Switch checked={studentOnly} onCheckedChange={setStudentOnly} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <span className="text-xs font-medium text-foreground">Non-Smoker Only</span>
              <Switch checked={nonSmokerOnly} onCheckedChange={setNonSmokerOnly} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/roommate-posts')} disabled={busy} className="rounded-xl px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="rounded-xl px-8 font-semibold gap-2 shadow-sm">
              <Save className="size-4" />
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toDateInput(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}
