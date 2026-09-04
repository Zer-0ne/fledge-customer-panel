'use client';

/**
 * HousingResponseBanner — the in-chat approval strip for Need Now threads.
 *
 * Chat-first UX: a response opens a conversation at respond time; this banner
 * (mounted in the thread when contextType === 'housing_request_response')
 * carries the request lifecycle into the chat:
 *   owner     + PENDING  → Accept / Decline inline
 *   responder + PENDING  → "Waiting for approval" + Withdraw
 *   ACCEPTED             → subtle "Requirement accepted" chip
 *   closed states        → read-only note (thread is retired server-side)
 */

import * as React from 'react';
import {
  fetchHousingResponse,
  acceptResponse,
  declineResponse,
  withdrawResponse,
} from '@/lib/api/services/neednow';
import type { NeedNowResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { CheckCircle2, Clock3, Loader2, XCircle, Undo2 } from 'lucide-react';

export function HousingResponseBanner({
  responseId,
  currentUserId,
  onChanged,
}: {
  responseId: string;
  currentUserId?: string;
  onChanged?: () => void;
}) {
  const [response, setResponse] = React.useState<NeedNowResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetchHousingResponse(responseId);
      setResponse(res);
    } catch {
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [responseId]);

  React.useEffect(() => {
    let cancelled = false;
    void load().then(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (loading) {
    return <Skeleton className="h-14 rounded-xl" />;
  }
  if (!response) return null;

  const isOwner = response.direction === 'received';
  const status = response.status;
  const responderName = response.responder?.displayName || 'Someone';

  const run = async (action: 'accept' | 'decline' | 'withdraw') => {
    setBusy(action);
    try {
      if (action === 'accept') {
        await acceptResponse(response.id);
        showToast({ title: 'Response accepted', description: 'You can now share contact details.', variant: 'success' });
      } else if (action === 'decline') {
        await declineResponse(response.id);
        showToast({ title: 'Response declined', variant: 'success' });
      } else {
        await withdrawResponse(response.id);
        showToast({ title: 'Response withdrawn', variant: 'success' });
      }
      await load();
      onChanged?.();
    } catch (err: unknown) {
      showToast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  // ACCEPTED — static chip, no actions needed.
  if (status === 'ACCEPTED') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/5 px-3.5 py-2.5 text-xs text-foreground">
        <CheckCircle2 className="size-4 text-success shrink-0" />
        <span className="font-medium">Requirement accepted — you&apos;re in touch now.</span>
      </div>
    );
  }

  // Closed states — the thread is retired, just explain.
  if (status === 'DECLINED') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
        <XCircle className="size-4 shrink-0" />
        This offer was declined by the requirement owner.
      </div>
    );
  }
  if (status === 'WITHDRAWN' || status === 'EXPIRED') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
        <Undo2 className="size-4 shrink-0" />
        This response was {status === 'WITHDRAWN' ? 'withdrawn' : 'expired'} — the chat is closed.
      </div>
    );
  }

  // PENDING — the decision strip.
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Clock3 className="size-3.5 text-primary" />
            {isOwner ? (
              <>{responderName} wants to respond to your requirement</>
            ) : (
              <>Waiting for the owner to accept your response</>
            )}
          </p>
          {response.message && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              &quot;{response.message}&quot;
            </p>
          )}
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          Pending
        </Badge>
      </div>

      {isOwner ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="rounded-lg flex-1 gap-1.5"
            disabled={busy !== null}
            onClick={() => void run('accept')}
          >
            {busy === 'accept' ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg flex-1 gap-1.5"
            disabled={busy !== null}
            onClick={() => void run('decline')}
          >
            Decline
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg gap-1.5"
            disabled={busy !== null}
            onClick={() => void run('withdraw')}
          >
            {busy === 'withdraw' ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
            Withdraw response
          </Button>
        </div>
      )}
    </div>
  );
}