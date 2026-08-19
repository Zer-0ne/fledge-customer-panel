'use client';

import * as React from 'react';
import { AvailabilityConfirmationChoice } from '@/types';
import {
  confirmListingAvailability,
  confirmRoommatePostAvailability,
  closeListing,
  closeRoommatePost,
} from '@/lib/api/services/availability';
import { normalizeContactError } from '@/lib/api/services/contact';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import {
  CalendarCheck,
  CheckCircle2,
  FileEdit,
  XCircle,
  UserCheck,
  Ban,
  Loader2,
} from 'lucide-react';
import BorderGlow from '@/components/BorderGlow'

export interface AvailabilityConfirmationCardProps {
  entityType: 'listing' | 'roommate_post';
  entityId: string;
  expiresAt?: string;
  onUpdated?: () => void;
}

export function AvailabilityConfirmationCard({
  entityType,
  entityId,
  expiresAt,
  onUpdated,
}: AvailabilityConfirmationCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [detailsNeedUpdate, setDetailsNeedUpdate] = React.useState(false);

  const handleChoice = async (choice: AvailabilityConfirmationChoice) => {
    setIsLoading(true);
    try {
      const res =
        entityType === 'listing'
          ? await confirmListingAvailability(entityId, choice)
          : await confirmRoommatePostAvailability(entityId, choice);

      setDetailsNeedUpdate(Boolean(res.detailsNeedUpdate));
      showToast({
        title: 'Availability Confirmed',
        description: choice === 'DETAILS_CHANGED'
          ? 'Availability confirmed. Please update listing details if needed.'
          : 'Availability status updated successfully.',
        variant: 'success',
      });
      if (onUpdated) onUpdated();
    } catch (err: unknown) {
      showToast({
        title: 'Confirmation Failed',
        description: normalizeContactError(err),
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    setIsClosing(true);
    try {
      if (entityType === 'listing') {
        await closeListing(entityId);
      } else {
        await closeRoommatePost(entityId);
      }
      showToast({
        title: 'Post Closed',
        description: 'Post closed immediately and pending contact requests invalidated.',
        variant: 'info',
      });
      if (onUpdated) onUpdated();
    } catch (err: unknown) {
      showToast({
        title: 'Closure Failed',
        description: normalizeContactError(err),
        variant: 'error',
      });
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <BorderGlow className='rounded-2xl!'>
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="size-4 text-primary" />
            Availability Lifecycle & Confirmation
          </h3>
          <p className="text-xs text-muted-foreground">
            Confirm whether your {entityType === 'listing' ? 'listing' : 'roommate post'} is still available.
          </p>
        </div>
        {expiresAt && (
          <Badge variant="outline" className="text-[10px] bg-muted/20">
            Expires: {new Date(expiresAt).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {detailsNeedUpdate && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-center gap-2">
          <FileEdit className="size-4 shrink-0" />
          <span>Details change flagged. Remember to edit your post details if price or availability date changed.</span>
        </div>
      )}

      {/* Confirmation Options */}
      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <Button
          variant="outline"
          onClick={() => handleChoice('STILL_AVAILABLE')}
          disabled={isLoading}
          className="h-auto p-3 justify-start text-left border-border hover:border-emerald-500/50 hover:bg-emerald-500/5"
        >
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mr-2" />
          <div>
            <span className="font-semibold block text-foreground">Still Available</span>
            <span className="text-[11px] text-muted-foreground font-normal">Extend availability period</span>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => handleChoice('DETAILS_CHANGED')}
          disabled={isLoading}
          className="h-auto p-3 justify-start text-left border-border hover:border-amber-500/50 hover:bg-amber-500/5"
        >
          <FileEdit className="size-4 text-amber-600 shrink-0 mr-2" />
          <div>
            <span className="font-semibold block text-foreground">Details Changed</span>
            <span className="text-[11px] text-muted-foreground font-normal">Extend & flag edit required</span>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => handleChoice('NO_LONGER_AVAILABLE')}
          disabled={isLoading}
          className="h-auto p-3 justify-start text-left border-border hover:border-rose-500/50 hover:bg-rose-500/5"
        >
          <XCircle className="size-4 text-rose-600 shrink-0 mr-2" />
          <div>
            <span className="font-semibold block text-foreground">No Longer Available</span>
            <span className="text-[11px] text-muted-foreground font-normal">Archive post & cancel requests</span>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => handleChoice('MOVED_OUT_USE_FALLBACK')}
          disabled={isLoading}
          className="h-auto p-3 justify-start text-left border-border hover:border-blue-500/50 hover:bg-blue-500/5"
        >
          <UserCheck className="size-4 text-blue-600 shrink-0 mr-2" />
          <div>
            <span className="font-semibold block text-foreground">Moved Out (Use Fallback)</span>
            <span className="text-[11px] text-muted-foreground font-normal">Route inquiries to backup contact</span>
          </div>
        </Button>
      </div>

      {/* Immediate Close */}
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Close post immediately to stop all inquiries:</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClose}
          disabled={isClosing}
          className="text-xs h-8 gap-1.5"
        >
          {isClosing ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
          Close Post
        </Button>
      </div>
    </div>
    </BorderGlow>
  );
}
