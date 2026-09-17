'use client';

import * as React from 'react';
import { Eye, Loader2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchPostViewers, formatSeenAt, recordPostView, type PostViewer } from '@/lib/api/services/post-engagement';

type SeenSurface = 'ROOMMATE_POST' | 'SERVICE_PROVIDER';

/**
 * Owner-only "N views" — the seen-by row for roommate posts and local
 * service listings (WhatsApp-status model, exactly like Need Now).
 *
 * Never rendered for anybody but the owner: the count is not public.
 */
export function PostSeenByEntry({ surface, postId }: { surface: SeenSurface; postId: string }) {
  const [total, setTotal] = React.useState<number | null>(null);
  const [open, setOpen] = React.useState(false);
  const [viewers, setViewers] = React.useState<PostViewer[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPostViewers(surface, postId);
      setViewers(result.viewers);
      setTotal(result.totalViewers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load viewers');
    } finally {
      setLoading(false);
    }
  }, [postId, surface]);

  React.useEffect(() => {
    let cancelled = false;
    void fetchPostViewers(surface, postId)
      .then((result) => { if (!cancelled) setTotal(result.totalViewers); })
      .catch(() => { /* silent — the chip simply stays count-less */ });
    return () => { cancelled = true; };
  }, [postId, surface]);

  React.useEffect(() => {
    if (open && viewers === null) void load();
  }, [load, open, viewers]);

  const label = total === null ? '— views' : total === 0 ? '0 views' : total === 1 ? '1 view' : `${total} views`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
        aria-label={`Viewers: ${label}`}
      >
        <Eye className="size-3.5 text-primary" />
        {total === null ? (
          <span className="inline-flex items-center gap-1">
            <span className="size-2 animate-pulse rounded-full bg-muted-foreground/30" /> views
          </span>
        ) : label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="size-4" /> Who viewed</DialogTitle>
            <DialogDescription className="text-xs">Only you can see this — viewers are never notified.</DialogDescription>
          </DialogHeader>

          {loading && (
            <p className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 size-4 animate-spin" /> Loading…</p>
          )}
          {error && !loading && (
            <p className="py-4 text-center text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && viewers !== null && viewers.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No views yet. When someone views your post, their name and time will appear here.
            </p>
          )}
          {!loading && !error && viewers !== null && viewers.length > 0 && (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {viewers.map((viewer) => (
                <div key={viewer.viewerId} className="flex items-center gap-3 rounded-2xl border p-2.5">
                  <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
                    {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="" className="size-9 object-cover" /> : viewer.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{viewer.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      pehli baar {formatSeenAt(viewer.firstSeenAt)}
                      {viewer.lastSeenAt !== viewer.firstSeenAt ? ` · last ${formatSeenAt(viewer.lastSeenAt)}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Fire-and-forget seen-by record; safe to call on every open. */
export function recordSeen(surface: SeenSurface, postId: string): void {
  void recordPostView(surface, postId).catch(() => {});
}
