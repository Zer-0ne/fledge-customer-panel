'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  FileQuestion,
  Hourglass,
  Megaphone,
  PencilLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { RoommatePost, RedirectTarget } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoommatePostMedia } from '@/components/roommates/roommate-post-media';
import BorderGlow from '@/components/BorderGlow'

export type PostUiState =
  | 'changes-required'
  | 'verification-required'
  | 'pending-review'
  | 'published'
  | 'limited-reach'
  | 'rejected'
  | 'archived';

export interface PostStateInfo {
  state: PostUiState;
  label: string;
  description: string;
}

/**
 * Maps backend publication/moderation statuses to a single user-facing state.
 * Never leaks thresholds or internal details.
 */
export function getPostState(post: RoommatePost): PostStateInfo {
  const publication = post.publicationStatus;
  const moderation = post.moderationStatus;

  if (publication === 'ARCHIVED' || moderation === 'ARCHIVED') {
    return { state: 'archived', label: 'Archived', description: 'This post is no longer active.' };
  }

  if (publication === 'HIDDEN' || (moderation && moderation.startsWith('REJECTED'))) {
    const reason = post.decision?.safeReason ?? 'This post does not follow the community content rules.';
    return { state: 'rejected', label: 'Rejected', description: reason };
  }

  if (publication === 'LIMITED_REACH' || moderation === 'APPROVED_LIMITED_REACH') {
    return {
      state: 'limited-reach',
      label: 'Published with limited reach',
      description: 'Your post is live but only visible to a smaller audience.',
    };
  }

  if (publication === 'PUBLISHED' || moderation === 'APPROVED') {
    return { state: 'published', label: 'Published', description: 'Your post is live and visible to students.' };
  }

  // Shadow publish: post is PENDING moderation but shown to the author as "live"
  if (publication === 'PENDING' && post.shadowPublished) {
    return {
      state: 'published',
      label: 'Published',
      description: 'Your post is live. It will appear to others after a quick review.',
    };
  }

  if (post.requiredAction?.type === 'TENANT_VERIFICATION') {
    return {
      state: 'verification-required',
      label: 'Verification required',
      description: 'Your post needs proof of current tenant context before it can be published.',
    };
  }

  if (moderation === 'CHANGES_REQUIRED' || post.requiredAction?.type === 'CHANGES_REQUIRED') {
    const actionHints =
      post.requiredAction?.type === 'CHANGES_REQUIRED' ? post.requiredAction.hints : [];
    const hints = post.decision?.changeHints ?? actionHints;
    return {
      state: 'changes-required',
      label: 'Changes required',
      description:
        hints.length > 0
          ? hints.join(' ')
          : 'Update your post to follow the community content rules.',
    };
  }

  return {
    state: 'pending-review',
    label: 'Pending review',
    description: 'Your post is being reviewed before it goes live.',
  };
}

export function ModerationBadge({ post, className }: { post: RoommatePost; className?: string }) {
  const { state, label } = getPostState(post);
  const variant =
    state === 'published'
      ? 'success'
      : state === 'rejected'
        ? 'destructive'
        : state === 'changes-required' || state === 'verification-required'
          ? 'warning'
          : state === 'limited-reach'
            ? 'info'
            : 'secondary';
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

const REDIRECT_COPY: Record<RedirectTarget, { title: string; href: string }> = {
  PROPERTY_LISTING: { title: 'Create a property listing', href: '/properties' },
  PARTNER_ADVERTISING: { title: 'Create a paid advertisement', href: '/ad-style-preview' },
  EDIT_PERSONAL_POST: { title: 'Edit this as a personal post', href: '' },
  APPEAL: { title: 'Appeal this decision', href: '' },
};

interface PostStateCardProps {
  post: RoommatePost;
  showReport?: boolean;
  onReport?: (post: RoommatePost) => void;
}

/** Author-facing card rendering a post's moderation state + corrective actions. */
export function PostStateCard({ post, showReport = false, onReport }: PostStateCardProps) {
  const { state, description } = getPostState(post);
  const decision = post.decision;
  const changeHints = decision?.changeHints ?? (post.requiredAction?.type === 'CHANGES_REQUIRED' ? post.requiredAction.hints : null);

  return (
    <BorderGlow className='rounded-2xl!'>
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{post.title}</h3>
            <ModerationBadge post={post} />
          </div>
          <p className="text-xs text-muted-foreground">
            {post.postType
              ? postTypeLabel(post.postType)
              : 'Personal post'}
            {post.createdAt ? ` · ${new Date(post.createdAt).toLocaleDateString()}` : ''}
          </p>
        </div>
        {state === 'pending-review' && <Hourglass className="size-4 shrink-0 text-muted-foreground" />}
        {state === 'changes-required' && <AlertTriangle className="size-4 shrink-0 text-amber-500" />}
        {state === 'verification-required' && <ShieldAlert className="size-4 shrink-0 text-amber-500" />}
        {state === 'rejected' && <EyeOff className="size-4 shrink-0 text-destructive" />}
        {state === 'published' && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
        {state === 'limited-reach' && <Megaphone className="size-4 shrink-0 text-blue-500" />}
      </div>

      <p className="text-sm text-muted-foreground">{description}</p>

      {post.mediaIds && post.mediaIds.length > 0 && (
        <RoommatePostMedia mediaIds={post.mediaIds} alt={post.title} className="max-w-sm" />
      )}

      {changeHints && changeHints.length > 0 && (
        <ul className="space-y-1.5">
          {changeHints.map((hint, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
              {hint}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <ActionButtons post={post} state={state} />
        {showReport && onReport && state === 'published' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReport(post)}
            className="rounded-lg"
          >
            Report
          </Button>
        )}
      </div>
    </div>
    </BorderGlow>
  );
}

function ActionButtons({ post, state }: { post: RoommatePost; state: PostUiState }) {
  const editHref = `/roommate-posts/${post.id}/edit`;
  const actions: React.ReactNode[] = [];

  if (state === 'changes-required' || state === 'rejected' || state === 'verification-required') {
    actions.push(
      <Link key="edit" href={editHref}>
        <Button variant="outline" size="sm" className="rounded-lg">
          <PencilLine className="size-3.5" />
          Edit post
        </Button>
      </Link>
    );
  }

  if (state === 'verification-required') {
    actions.push(
      <Link key="verify" href={`/roommate-posts/${post.id}/verify`}>
        <Button size="sm" className="rounded-lg">
          <ShieldCheck className="size-3.5" />
          Complete verification
        </Button>
      </Link>
    );
  }

  if (state === 'changes-required') {
    actions.push(
      <Link key="verify" href={`/roommate-posts/${post.id}/verify`}>
        <Button size="sm" className="rounded-lg">
          <ShieldCheck className="size-3.5" />
          Complete verification
        </Button>
      </Link>
    );
  }

  if (state === 'rejected') {
    // Redirect targets guide the user to the correct workflow.
    if (post.decision?.redirectTarget === 'PROPERTY_LISTING') {
      actions.push(
        <Link key="listing" href="/properties">
          <Button size="sm" className="rounded-lg">
            <FileQuestion className="size-3.5" />
            Create a property listing
          </Button>
        </Link>
      );
    } else if (post.decision?.redirectTarget === 'PARTNER_ADVERTISING') {
      actions.push(
        <Link key="ad" href="/ad-style-preview">
          <Button size="sm" className="rounded-lg">
            <Megaphone className="size-3.5" />
            Create a paid advertisement
          </Button>
        </Link>
      );
    }
    actions.push(
      <Link key="appeal" href={`/roommate-posts/${post.id}/appeal`}>
        <Button variant="secondary" size="sm" className="rounded-lg">
          <Sparkles className="size-3.5" />
          Appeal
        </Button>
      </Link>
    );
  }

  if (state === 'published' || state === 'limited-reach') {
    actions.push(
      <Link key="view" href="/roommates">
        <Button variant="outline" size="sm" className="rounded-lg">
          View in community
        </Button>
      </Link>
    );
  }

  return <>{actions}</>;
}

function postTypeLabel(postType: string): string {
  const labels: Record<string, string> = {
    NEED_ROOMMATE: 'I need a roommate',
    LEAVING_FLAT_NEED_REPLACEMENT: 'Leaving flat — need replacement',
    ROOM_AVAILABLE_IN_EXISTING_FLAT: 'Room available in my flat',
    LOOKING_TO_JOIN_EXISTING_FLAT: 'Looking to join a flat',
  };
  return labels[postType] ?? 'Personal post';
}

export { postTypeLabel, REDIRECT_COPY };
