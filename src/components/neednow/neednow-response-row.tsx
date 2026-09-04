'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  XCircle,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import { UserAvatar } from './user-avatar';
import { useRemainingSeconds } from './use-remaining-time';
import {
  acceptResponse,
  declineResponse,
  withdrawResponse,
  friendlyNeedNowError,
  formatBudgetRangePaise,
  formatRemainingTime,
  NEED_NOW_INTENT_LABELS,
  NEED_NOW_RESPONSE_TYPE_LABELS,
} from '@/lib/api/services/neednow';
import { NeedNowResponse } from '@/types';

export interface NeedNowResponseRowProps {
  response: NeedNowResponse;
  onChanged?: (updated?: NeedNowResponse) => void;
}

export function NeedNowResponseRow({ response, onChanged }: NeedNowResponseRowProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const remaining = useRemainingSeconds(response.request.expiresAt);
  const requestTimeLabel = formatRemainingTime(
    remaining ?? response.request.remainingSeconds,
    response.request.status
  );

  // Message-only responses are chats, not listing offers — label honestly.
  const kindLabel =
    response.responseType === 'OFFER_LISTING' && !response.listing && !response.roommatePost
      ? 'Sent a message'
      : (NEED_NOW_RESPONSE_TYPE_LABELS[response.responseType] ?? response.responseType);

  const runAction = async (
    action: 'accept' | 'decline' | 'withdraw',
    fn: () => Promise<NeedNowResponse>,
    successTitle: string
  ) => {
    setBusyAction(action);
    try {
      const updated = await fn();
      showToast({ title: successTitle, variant: 'success' });
      onChanged?.(updated);
      // Accept opens the chat straight away (insta-style request → inbox).
      if (action === 'accept' && updated.conversationId) {
        router.push(`/messages/${updated.conversationId}`);
      }
    } catch (err) {
      showToast({ title: 'Action failed', description: friendlyNeedNowError(err), variant: 'error' });
    } finally {
      setBusyAction(null);
    }
  };

  const busy = (action: string) => busyAction === action;
  // `direction` is computed by the backend — never inferred from labels.
  const isSent = response.direction === 'sent';
  const isPending = response.status === 'PENDING';

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Responder */}
          <div className="flex flex-wrap items-center gap-2.5">
            <UserAvatar
              name={response.responder.displayName}
              avatarUrl={response.responder.avatarUrl}
              verified={response.responder.verified}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {response.responder.displayName}
                {response.responder.verified && (
                  <span className="ml-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ✓ Verified
                  </span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Badge variant="secondary" className="text-[10px]">
                  {kindLabel}
                </Badge>
                {isPending && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {isSent ? 'Waiting for seeker' : 'Waiting for your response'}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Request summary */}
          <Link href={`/need-now/${response.request.id}`} className="block rounded-xl bg-muted/40 p-3 space-y-1 hover:bg-muted/70 transition-colors group">
            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {NEED_NOW_INTENT_LABELS[response.request.intentType]}
              <span className="ml-2 text-[10px] font-medium text-muted-foreground">
                {requestTimeLabel}
              </span>
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 min-w-0">
                <MapPin className="size-3 text-primary/70 shrink-0" />
                <span className="truncate">{response.request.location.name}</span>
              </span>
              <span>
                {formatBudgetRangePaise(response.request.budget.minimumPaise, response.request.budget.maximumPaise)}
              </span>
            </p>
          </Link>

          {response.responseType === 'OFFER_LISTING' && response.listing && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="size-3.5 text-primary/70" />
              <span className="truncate">
                <strong className="text-foreground">{response.listing.title}</strong>
                {' · '}
                {formatBudgetRangePaise(response.listing.rentPaise, response.listing.rentPaise)}
                /mo
              </span>
            </p>
          )}

          {response.responseType === 'OFFER_LISTING' && !response.listing && response.roommatePost && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="size-3.5 text-primary/70" />
              <span className="truncate">
                Shared post: <strong className="text-foreground">{response.roommatePost.title}</strong>
              </span>
            </p>
          )}

          {response.message && (
            <p className="text-xs text-muted-foreground/90 italic bg-muted/40 p-2.5 rounded-xl line-clamp-2 border border-border/40">
              &quot;{response.message}&quot;
            </p>
          )}
        </div>

        {/* Status + actions */}
        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
          <ResponseStatusBadge status={response.status} />

          {response.status === 'ACCEPTED' && response.conversationId && (
            <Link
              href={`/messages/${response.conversationId}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <MessageCircle className="size-3.5" />
              Open chat
            </Link>
          )}

          {isPending && response.canWithdraw && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy('withdraw')}
              onClick={() => runAction('withdraw', () => withdrawResponse(response.id), 'Response withdrawn')}
              className="gap-1.5 rounded-xl border-muted-foreground/30 text-muted-foreground hover:bg-muted"
            >
              {busy('withdraw') ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
              {busy('withdraw') ? 'Withdrawing…' : 'Withdraw'}
            </Button>
          )}

          {isPending && response.canAccept && (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {response.canDecline && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy('decline')}
                  onClick={() => runAction('decline', () => declineResponse(response.id), 'Response declined')}
                  className="gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  {busy('decline') ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                  {busy('decline') ? 'Declining…' : 'Decline'}
                </Button>
              )}
              <Button
                size="sm"
                disabled={busy('accept')}
                onClick={() => runAction('accept', () => acceptResponse(response.id), 'Response accepted')}
                className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {busy('accept') ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                {busy('accept') ? 'Accepting…' : 'Accept'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResponseStatusBadge({ status }: { status: NeedNowResponse['status'] }) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="warning" className="gap-1"><Clock className="size-3" />Pending</Badge>;
    case 'ACCEPTED':
      return <Badge variant="success" className="gap-1"><CheckCircle2 className="size-3" />Accepted</Badge>;
    case 'DECLINED':
      return <Badge variant="destructive" className="gap-1"><XCircle className="size-3" />Declined</Badge>;
    case 'WITHDRAWN':
      return <Badge variant="secondary" className="gap-1"><Ban className="size-3" />Withdrawn</Badge>;
    case 'EXPIRED':
      return <Badge variant="outline" className="gap-1">Expired</Badge>;
    case 'REMOVED':
      return <Badge variant="destructive" className="gap-1">Removed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
