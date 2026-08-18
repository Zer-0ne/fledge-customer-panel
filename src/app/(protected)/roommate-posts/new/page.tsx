'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Ban, Building2, Calendar, FileText, IndianRupee, Send, Sparkles } from 'lucide-react';
import { College } from '@/types';
import { fetchColleges } from '@/lib/api/services/discovery';
import { createRoommatePost } from '@/lib/api/services/roommates';
import {
  fetchMyRestrictions,
  hasPostingRestriction,
  submitAppeal,
} from '@/lib/api/services/integrity';
import { RoommatePostType } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import { LocationPicker } from '@/components/common/location-picker';
import { PostTypeSelect } from '@/components/community/post-type-select';
import { ContentRules } from '@/components/community/content-rules';
import { MediaPicker } from '@/components/community/media-picker';

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;

interface PickedImage {
  mediaId: string;
  url?: string;
}

function CreateRoommatePostPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appealRestrictionId = searchParams.get('appealRestriction');

  const [colleges, setColleges] = React.useState<College[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [postingBlocked, setPostingBlocked] = React.useState(false);
  const [mediaUploading, setMediaUploading] = React.useState(false);

  // Form State
  const [postType, setPostType] = React.useState<RoommatePostType>('NEED_ROOMMATE');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [collegeId, setCollegeId] = React.useState('');
  const [locality, setLocality] = React.useState('');
  const [latitude, setLatitude] = React.useState(DEFAULT_LAT);
  const [longitude, setLongitude] = React.useState(DEFAULT_LNG);
  const [budgetINR, setBudgetINR] = React.useState('');
  const [moveInFrom, setMoveInFrom] = React.useState('');
  const [moveInTo, setMoveInTo] = React.useState('');
  const [moveOutAt, setMoveOutAt] = React.useState('');
  const [expiryDays, setExpiryDays] = React.useState('30');
  const [images, setImages] = React.useState<PickedImage[]>([]);

  // Preferences
  const [vegetarianOnly, setVegetarianOnly] = React.useState(false);
  const [studentOnly, setStudentOnly] = React.useState(true);
  const [nonSmokerOnly, setNonSmokerOnly] = React.useState(false);
  const [gender, setGender] = React.useState<'any' | 'male' | 'female'>('any');

  // Restriction appeal dialog
  const [appealOpen, setAppealOpen] = React.useState(Boolean(appealRestrictionId));
  const [appealReason, setAppealReason] = React.useState('');
  const [appealDetail, setAppealDetail] = React.useState('');
  const [appealing, setAppealing] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const [collegeList, restrictions] = await Promise.all([
        fetchColleges(),
        fetchMyRestrictions(),
      ]);
      setColleges(collegeList || []);
      if (collegeList && collegeList.length > 0) {
        setCollegeId(collegeList[0].id);
      }
      if (hasPostingRestriction(restrictions)) {
        setPostingBlocked(true);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (postingBlocked) {
      showToast({
        title: 'Posting restricted',
        description: 'You are currently restricted from creating personal posts.',
        variant: 'error',
      });
      return;
    }

    if (!title.trim() || title.length < 5) {
      showToast({ title: 'Validation Error', description: 'Title must be at least 5 characters long.', variant: 'error' });
      return;
    }
    if (!body.trim() || body.length < 10) {
      showToast({ title: 'Validation Error', description: 'Description must be at least 10 characters long.', variant: 'error' });
      return;
    }
    if (!collegeId && !locality.trim()) {
      showToast({ title: 'Validation Error', description: 'Please select a college or provide a locality.', variant: 'error' });
      return;
    }

    const days = parseInt(expiryDays, 10) || 30;
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const budgetPaise = budgetINR ? Math.round(parseFloat(budgetINR) * 100) : undefined;
    const moveInFromIso = moveInFrom ? new Date(moveInFrom).toISOString() : undefined;
    const moveInToIso = moveInTo ? new Date(moveInTo).toISOString() : undefined;
    const moveOutAtIso = moveOutAt ? new Date(moveOutAt).toISOString() : undefined;

    setIsSubmitting(true);
    try {
      const result = await createRoommatePost({
        postType,
        title: title.trim(),
        body: body.trim(),
        expiresAt,
        // Exactly one context is sent: college takes precedence, else locality.
        collegeId: collegeId || undefined,
        locality: collegeId ? undefined : locality.trim() || undefined,
        budgetPaise,
        moveInFrom: moveInFromIso,
        moveInTo: moveInToIso,
        moveOutAt: moveOutAtIso,
        mediaIds: images.map((image) => image.mediaId),
        preferences: {
          vegetarianOnly,
          vegetarian: vegetarianOnly,
          studentOnly,
          nonSmokerOnly,
          gender,
          budgetMaxPaise: budgetPaise,
        },
      });

      if (result.requiredAction?.type === 'TENANT_VERIFICATION') {
        showToast({
          title: 'Almost there!',
          description: 'Complete a quick tenant verification to publish your post.',
          variant: 'default',
        });
        router.push(`/roommate-posts/${result.postId || result.id}/verify`);
        return;
      }

      if (result.publicationStatus === 'PUBLISHED' || result.moderationStatus === 'APPROVED') {
        showToast({ title: 'Post published', description: 'Your personal post is live.', variant: 'default' });
      } else {
        showToast({
          title: 'Post submitted',
          description:
            result.moderationStatus === 'CHANGES_REQUIRED'
              ? 'Your post needs a few changes before publishing.'
              : 'Your post is being reviewed.',
          variant: 'default',
        });
      }
      router.push('/roommate-posts');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Could not create the post';
      // The backend returns a user-safe active-post-limit message; surface it as-is.
      showToast({ title: 'Creation failed', description: errorMsg, variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRestrictionAppeal = async () => {
    if (!appealRestrictionId || appealReason.trim().length < 3) return;
    setAppealing(true);
    try {
      await submitAppeal({
        targetType: 'CAPABILITY_RESTRICTION',
        targetId: appealRestrictionId,
        reason: appealReason.trim(),
        detail: appealDetail.trim() || undefined,
      });
      showToast({ title: 'Appeal submitted', description: 'Our team will review your appeal.', variant: 'default' });
      setAppealOpen(false);
      router.replace('/roommate-posts');
    } catch (err) {
      showToast({
        title: 'Could not submit appeal',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setAppealing(false);
    }
  };

  const busy = isSubmitting || mediaUploading;

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

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold sm:text-3xl tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            Create a Personal Post
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Personal posts are only for genuine personal accommodation needs —
            not for promoting properties or services.
          </p>
        </div>

        {postingBlocked && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <Ban className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Posting restricted
              </h2>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                You cannot create personal posts right now. You can appeal this
                restriction — see your posts page.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 rounded-lg"
                onClick={() => router.push('/roommate-posts')}
              >
                View my posts
              </Button>
            </div>
          </div>
        )}

        <ContentRules />

        <form onSubmit={handleSubmit} className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-xs space-y-6">
          {/* Section 1: Post type */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40 font-semibold text-foreground text-sm">
              <FileText className="size-4 text-primary" />
              Post type
            </div>
            <PostTypeSelect value={postType} onChange={setPostType} />
          </div>

          {/* Section 2: Title & Body */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Looking for 1 flatmate in 2BHK near North Campus"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                required
                rows={5}
                placeholder="Describe your routine, preferences, rent split, furnishing, nearby landmarks, or roommate expectations..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="rounded-xl resize-none text-sm"
              />
            </div>
          </div>

          {/* Section 3: Context (college or locality) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40 font-semibold text-foreground text-sm">
              <Building2 className="size-4 text-primary" />
              College or locality context
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">College / University</label>
              <Select
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className="rounded-xl"
              >
                <option value="">Select College</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Pick your college <span className="italic">or</span> set a locality below.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Locality / Area</label>
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onLocationChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onAddressChange={setLocality}
                initialQuery={locality}
                title="Preferred Locality"
                className="h-64 w-full rounded-xl overflow-hidden border border-border"
              />
            </div>
          </div>

          {/* Section 4: Photos */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40 font-semibold text-foreground text-sm">
              <Calendar className="size-4 text-primary" />
              Room photos <span className="font-normal text-muted-foreground">(optional)</span>
            </div>
            <MediaPicker
              value={images}
              onChange={setImages}
              purpose="community"
              onUploadingChange={setMediaUploading}
            />
          </div>

          {/* Section 5: Budget & Dates */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40 font-semibold text-foreground text-sm">
              <IndianRupee className="size-4 text-primary" />
              Budget & availability
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Monthly Rent Budget (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 8500"
                  value={budgetINR}
                  onChange={(e) => setBudgetINR(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Post Active Duration</label>
                <Select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="rounded-xl"
                >
                  <option value="7">Active for 7 Days</option>
                  <option value="14">Active for 14 Days</option>
                  <option value="30">Active for 30 Days</option>
                  <option value="60">Active for 60 Days</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Move-in From Date</label>
                <Input
                  type="date"
                  value={moveInFrom}
                  onChange={(e) => setMoveInFrom(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Move-in Latest Date (To)</label>
                <Input
                  type="date"
                  value={moveInTo}
                  onChange={(e) => setMoveInTo(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Move-out Date{' '}
                  <span className="text-muted-foreground">(leaving-flat posts)</span>
                </label>
                <Input
                  type="date"
                  value={moveOutAt}
                  onChange={(e) => setMoveOutAt(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Preferences */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40 font-semibold text-foreground text-sm">
              <Calendar className="size-4 text-primary" />
              Preferences & filters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Gender Preference</label>
                <Select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'any' | 'male' | 'female')}
                  className="rounded-xl"
                >
                  <option value="any">Any Gender</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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
          </div>

          {/* Submit Row */}
          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={busy}
              className="rounded-xl px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || postingBlocked}
              className="rounded-xl px-8 font-semibold gap-2 shadow-sm"
            >
              <Send className="size-4" />
              {isSubmitting ? 'Submitting…' : mediaUploading ? 'Uploading media…' : 'Submit post'}
            </Button>
          </div>
        </form>
      </div>

      {/* Restriction appeal dialog */}
      <Dialog open={appealOpen} onOpenChange={(open) => !open && (setAppealOpen(false), router.replace('/roommate-posts'))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appeal posting restriction</DialogTitle>
            <DialogDescription>
              Tell us why you believe this restriction should be lifted. A moderator
              will review your appeal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">Reason (3–120 characters)</span>
              <Input
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                maxLength={120}
                placeholder="e.g. My post is a genuine personal roommate search"
                className="rounded-xl"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">Details (optional)</span>
              <Textarea
                rows={4}
                value={appealDetail}
                onChange={(e) => setAppealDetail(e.target.value)}
                maxLength={1000}
                placeholder="Add any context that supports your appeal"
                className="rounded-xl resize-none text-sm"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAppealOpen(false); router.replace('/roommate-posts'); }} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={submitRestrictionAppeal}
              disabled={appealing || appealReason.trim().length < 3}
              className="rounded-xl"
            >
              {appealing ? 'Submitting…' : 'Submit appeal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CreateRoommatePostPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <CreateRoommatePostPageInner />
    </React.Suspense>
  );
}
