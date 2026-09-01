'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapPin, Timer } from 'lucide-react';
import { UserAvatar } from './user-avatar';
import { useRemainingSeconds } from './use-remaining-time';
import {
  formatBudgetRangePaise,
  formatRemainingTime,
  NEED_NOW_INTENT_LABELS,
} from '@/lib/api/services/neednow';
import { NeedNowRequest } from '@/types';
import { MagicCard } from '@/components/ui/magic-card';

export interface NeedNowFeedCardProps {
  request: NeedNowRequest;
  /** Optional click handler — when provided, overrides the default Link navigation. */
  onClick?: () => void;
}

/** Compact card for the home-page "Need Now" rail. */
export function NeedNowFeedCard({ request, onClick }: NeedNowFeedCardProps) {
  const remaining = useRemainingSeconds(request.expiresAt);
  const timeLabel = formatRemainingTime(remaining ?? request.remainingSeconds, request.status);

  const content = (
    <div className="group flex snap-start flex-col gap-3 bg-card p-4">
      <div className="flex items-center gap-2.5">
        <UserAvatar
          name={request.owner.displayName}
          avatarUrl={request.owner.avatarUrl}
          verified={request.owner.verified}
          size="sm"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {request.owner.displayName}
          </p>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Timer className="size-3 text-primary/70" />
            <span className={request.status === 'ACTIVE' ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
              {timeLabel}
            </span>
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
          {NEED_NOW_INTENT_LABELS[request.intentType]}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground min-w-0">
          <MapPin className="size-3 text-primary/70 shrink-0" />
          <span className="truncate">{request.location.name}</span>
        </p>
      </div>

      <p className="text-xs font-semibold text-foreground">
        {formatBudgetRangePaise(request.budget.minimumPaise, request.budget.maximumPaise)}
        <span className="font-normal text-muted-foreground">/mo</span>
      </p>
    </div>
  );

  return (
    <MagicCard className="w-64 shrink-0 rounded-2xl">
      {onClick ? (
        <button type="button" onClick={onClick} className="w-full text-left">
          {content}
        </button>
      ) : (
        <Link href={`/need-now/${request.id}`}>
          {content}
        </Link>
      )}
    </MagicCard>
  );
}
