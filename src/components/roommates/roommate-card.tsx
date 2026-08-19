'use client';

import * as React from 'react';
import { RoommatePost } from '@/types';
import { formatPaiseToINR, formatDate } from '@/lib/formatting';
import { isRoommatePostExpired } from '@/lib/api/services/roommates';
import { RoommatePostMedia } from '@/components/roommates/roommate-post-media';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MagicCard } from '@/components/ui/magic-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { showToast } from '@/components/ui/toast';
import Link from 'next/link';
import {
  Users,
  MapPin,
  Calendar,
  IndianRupee,
  Sparkles,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  Inbox,
} from 'lucide-react';

export interface RoommateCardProps {
  post: RoommatePost;
  onInterestClick?: (post: RoommatePost) => void;
  isOwner?: boolean;
  hasExpressedInterest?: boolean;
  /** Home-featured context: adds a "Roommate" chip stacked above the status badge (never overlapping it). */
  showRoommateBadge?: boolean;
}

export function RoommateCard({ post, onInterestClick, isOwner = false, hasExpressedInterest = false, showRoommateBadge = false }: RoommateCardProps) {
  const expired = isRoommatePostExpired(post);

  const handleInterest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (expired) {
      showToast({
        title: 'Post Expired',
        description: 'This roommate post has expired and is no longer accepting interest requests.',
        variant: 'info',
      });
      return;
    }

    if (onInterestClick) {
      onInterestClick(post);
    }
  };

  const prefs = post.preferences || {};
  const moveInDateText = post.targetMoveInDate
    ? formatDate(post.targetMoveInDate)
    : post.moveInFrom
    ? formatDate(post.moveInFrom)
    : 'Flexible';

  const locationText = [
    post.locality || post.locationPreference,
    post.campusName,
    post.collegeName,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <MagicCard className="rounded-2xl">
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
      expired ? 'opacity-80 bg-muted/20' : ''
    }`}>
      {/* Cover image — only when the author actually uploaded media (edge-to-edge, home-style) */}
      {post.mediaIds && post.mediaIds.length > 0 && (
        <RoommatePostMedia mediaIds={post.mediaIds} alt={post.title} fullBleed />
      )}

      <div className="flex flex-1 flex-col justify-between p-5">
      {/* Header & Badges */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {post.user?.displayName ? (
                post.user.displayName.charAt(0).toUpperCase()
              ) : (
                <User className="size-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {post.user?.displayName || 'Student / Seeking Roommate'}
              </p>
              <p className="text-xs text-muted-foreground">
                Posted {formatDate(post.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {showRoommateBadge && (
              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary font-medium text-[11px] px-2 py-0.5">
                <Users className="size-3" />
                Roommate
              </Badge>
            )}
            {expired ? (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
                <Clock className="mr-1 size-3" />
                Expired
              </Badge>
            ) : post.status === 'fulfilled' ? (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
                <CheckCircle2 className="mr-1 size-3" />
                Fulfilled
              </Badge>
            ) : (
              <Badge variant="default" className="bg-primary/90 text-primary-foreground font-medium">
                <Users className="mr-1 size-3" />
                Active
              </Badge>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {post.description || post.body || 'Looking for a flatmate/roommate to share accommodation.'}
          </p>
        </div>

        {/* Key Info Pills */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {post.budgetPaise ? (
            <div className="flex items-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-foreground">
              <IndianRupee className="size-3.5 text-emerald-600 shrink-0" />
              <span>{formatPaiseToINR(post.budgetPaise)}/mo</span>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-foreground">
            <Calendar className="size-3.5 text-primary shrink-0" />
            <span>Move in: {moveInDateText}</span>
          </div>
        </div>

        {/* Location */}
        {locationText && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{locationText}</span>
          </p>
        )}

        {/* Preference Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(prefs.vegetarian || prefs.vegetarianOnly) && (
            <Badge variant="outline" className="text-[11px] font-normal border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
              Vegetarian
            </Badge>
          )}
          {prefs.studentOnly && (
            <Badge variant="outline" className="text-[11px] font-normal border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">
              Students Only
            </Badge>
          )}
          {prefs.nonSmokerOnly && (
            <Badge variant="outline" className="text-[11px] font-normal border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">
              Non-Smoker
            </Badge>
          )}
          {prefs.gender && prefs.gender !== 'any' && (
            <Badge variant="outline" className="capitalize text-[11px] font-normal">
              {prefs.gender} Only
            </Badge>
          )}
        </div>
      </div>

      {/* Footer / Action */}
      <div className="mt-4 border-t border-border/40 pt-3">
        {isOwner ? (
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs px-2.5 py-1">
              <ShieldCheck className="size-3.5" />
              Your Post
            </Badge>
            {expired ? (
              <span className="text-xs text-muted-foreground">Expired</span>
            ) : (
              <Link href="/roommate-interests?tab=incoming">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 rounded-lg border-primary/30 text-primary hover:bg-primary/10">
                  <Inbox className="size-3.5" />
                  View Requests
                </Button>
              </Link>
            )}
          </div>
        ) : hasExpressedInterest ? (
          <Link href="/roommate-interests?tab=outgoing" className="w-full">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-center gap-1.5 rounded-xl font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
            >
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              Interest Sent (View Request)
            </Button>
          </Link>
        ) : (
          <ShimmerButton
            type="button"
            disabled={expired}
            className="h-8 w-full gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            onClick={handleInterest}
          >
            <Sparkles />
            {expired ? 'Post Expired' : 'Connect / Express Interest'}
          </ShimmerButton>
        )}
      </div>
      </div>
    </div>
    </MagicCard>
  );
}
