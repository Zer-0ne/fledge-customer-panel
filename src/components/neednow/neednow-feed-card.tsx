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

export interface NeedNowFeedCardProps {
  request: NeedNowRequest;
}

/** Compact card for the home-page "Need Now" rail. */
export function NeedNowFeedCard({ request }: NeedNowFeedCardProps) {
  const remaining = useRemainingSeconds(request.expiresAt);
  const timeLabel = formatRemainingTime(remaining ?? request.remainingSeconds, request.status);

  return (
    <Link
      href={`/need-now/${request.id}`}
      className="group flex w-64 shrink-0 snap-start flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-primary/30 hover:shadow-md"
    >
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
    </Link>
  );
}
