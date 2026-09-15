'use client';

import * as React from 'react';
import { Eye, MapPin, RefreshCw, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/neednow/user-avatar';
import { getNeedNowViewers, formatViewerSeenAt, type NeedNowViewer } from '@/lib/api/services/neednow';

export interface ViewersSheetProps {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ViewerRow({ viewer }: { viewer: NeedNowViewer }) {
  const distanceLabel = viewer.distance.state === 'available' ? viewer.distance.label : 'Location unavailable';
  const relative = formatViewerSeenAt(viewer.lastSeenAt);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-3">
      <UserAvatar name={viewer.displayName} avatarUrl={viewer.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{viewer.displayName}</p>
        <p className="text-xs text-muted-foreground">{relative || 'abhi'}</p>
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
          viewer.distance.state === 'available'
            ? 'border-border bg-muted/60 text-foreground'
            : 'border-border bg-muted/40 text-muted-foreground'
        }`}
      >
        <MapPin className="size-3.5 shrink-0" />
        <span className="truncate max-w-[140px]">{distanceLabel}</span>
      </span>
    </div>
  );
}

export function ViewersSheet({ requestId, open, onOpenChange }: ViewersSheetProps) {
  const [viewers, setViewers] = React.useState<NeedNowViewer[] | null>(null);
  const [total, setTotal] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchViewers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNeedNowViewers(requestId);
      setViewers(res.viewers);
      setTotal(res.totalViewers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Viewers load nahi ho paaye');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  // Fetch only on open — no polling, no setInterval
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void fetchViewers();
    else {
      // keep data cached until next open; reset error only
      setError(null);
    }
  }, [open, fetchViewers]);

  const isEmpty = !loading && !error && viewers !== null && viewers.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4 text-primary" />
            Dekha kisne
            {total !== null && !loading && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{total}</span>}
          </DialogTitle>
          <DialogDescription className="text-xs">Sirf aap dekh sakte hain — viewers ko pata nahi chalega.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[180px]">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-center space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button size="sm" variant="outline" onClick={() => void fetchViewers()} className="gap-1.5 rounded-xl">
                <RefreshCw className="size-3.5" />
                Retry
              </Button>
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Users className="size-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">Abhi tak kisi ne nahi dekha</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">Jab koi aapki requirement dekhega, yahan uska naam aur time dikhega.</p>
            </div>
          )}

          {!loading && !error && viewers !== null && viewers.length > 0 && (
            <>
              <div className="space-y-2">
                {viewers.map((v) => (
                  <ViewerRow key={v.viewerId} viewer={v} />
                ))}
              </div>
              {total !== null && total > viewers.length && (
                <p className="text-center text-xs text-muted-foreground pt-2">and {total - viewers.length} more</p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <p className="text-[11px] text-muted-foreground">Tap outside to close</p>
          <Button size="sm" variant="ghost" onClick={() => void fetchViewers()} disabled={loading} className="gap-1.5 rounded-xl text-xs">
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Owner-only entry row: "N ne dekha" — tappable to open ViewersSheet.
 * Fetches totalViewers on mount (once, no polling) when isOwner.
 * Returns null when not owner — never leaks counts on public feed.
 */
export function SeenByEntry({ requestId, isOwner }: { requestId: string; isOwner: boolean }) {
  const [total, setTotal] = React.useState<number | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    void getNeedNowViewers(requestId)
      .then((res) => {
        if (!cancelled) setTotal(res.totalViewers);
      })
      .catch(() => {
        // silent — chip stays without count, sheet will show error on open
      });
    return () => {
      cancelled = true;
    };
  }, [isOwner, requestId]);

  if (!isOwner) return null;

  const label = total === null ? '— ne dekha' : total === 0 ? '0 ne dekha' : total === 1 ? '1 ne dekha' : `${total} ne dekha`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
        aria-label={`Viewers: ${label}`}
      >
        <Eye className="size-3.5 text-primary" />
        {total === null ? (
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-muted-foreground/30 animate-pulse" />
            ne dekha
          </span>
        ) : (
          label
        )}
      </button>
      <ViewersSheet requestId={requestId} open={open} onOpenChange={setOpen} />
    </>
  );
}
