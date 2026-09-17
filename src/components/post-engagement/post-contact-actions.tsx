'use client';

import * as React from 'react';
import { Copy, Check, Eye, Loader2, Phone, ShieldOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import {
  PostSurface, PostRevealState, attachPostContact, fetchRevealStates, fetchPostContactAudit,
  friendlyPostContactError, removePostContact, revealPostContact, formatSeenAt,
  type PostContactAudit,
} from '@/lib/api/services/post-engagement';

/**
 * Number-on-a-post control.
 *
 * Viewer: "View number" → one reveal slot → the number (never shown in feeds).
 * Owner: attach / replace / remove the number, plus the audit of who unlocked
 * it, how many times they opened it, and when.
 *
 * The 5-viewer cap is enforced server-side; this component only renders the
 * state it is told.
 */
export function PostContactActions({ surface, postId, isOwner, onStateChange }: {
  surface: PostSurface;
  postId: string;
  isOwner: boolean;
  onStateChange?: (state: PostRevealState) => void;
}) {
  const [state, setState] = React.useState<PostRevealState | null>(null);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [auditOpen, setAuditOpen] = React.useState(false);
  const [phone, setPhone] = React.useState('');
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [audit, setAudit] = React.useState<PostContactAudit | null>(null);

  const apply = React.useCallback((next: PostRevealState) => {
    setState(next);
    onStateChange?.(next);
  }, [onStateChange]);

  React.useEffect(() => {
    let cancelled = false;
    void fetchRevealStates(surface, [postId])
      .then((states) => {
        if (cancelled) return;
        const next = states[postId];
        if (next) apply(next);
      })
      .catch(() => { /* silent — the button simply stays hidden */ });
    return () => { cancelled = true; };
  }, [apply, postId, surface]);

  const reveal = async () => {
    setBusy(true);
    try {
      const result = await revealPostContact(surface, postId);
      setRevealed(result.phoneNumber);
      apply({
        postId,
        configured: true,
        exhausted: result.remainingReveals <= 0,
        alreadyRevealed: true,
        ownedByCaller: false,
        remainingReveals: result.remainingReveals,
        maxReveals: state?.maxReveals ?? null,
      });
    } catch (error) {
      showToast({ title: 'Could not fetch the number', description: friendlyPostContactError(error), variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const attach = async () => {
    setBusy(true);
    try {
      const result = await attachPostContact(surface, postId, phone.trim());
      setAttachOpen(false);
      setPhone('');
      apply({ postId, configured: true, exhausted: false, alreadyRevealed: false, ownedByCaller: true, remainingReveals: result.maxReveals, maxReveals: result.maxReveals });
      showToast({ title: 'Number attached', description: `Up to ${result.maxReveals} people can unlock it — every unlock is shown to you.`, variant: 'default' });
    } catch (error) {
      showToast({ title: 'Could not attach the number', description: friendlyPostContactError(error), variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removePostContact(surface, postId);
      apply({ postId, configured: false, exhausted: false, alreadyRevealed: false, ownedByCaller: true, remainingReveals: 0, maxReveals: null });
      showToast({ title: 'Number removed', description: 'The previous audit (who viewed it) is kept in the record.', variant: 'default' });
    } catch (error) {
      showToast({ title: 'Could not remove the number', description: friendlyPostContactError(error), variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const openAudit = async () => {
    setAuditOpen(true);
    setAudit(null);
    try {
      setAudit(await fetchPostContactAudit(surface, postId));
    } catch (error) {
      showToast({ title: 'Could not load the audit', description: friendlyPostContactError(error), variant: 'error' });
      setAuditOpen(false);
    }
  };

  if (!state) return null;

  if (state.ownedByCaller && isOwner) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {state.configured ? (
          <>
            <button
              type="button"
              onClick={() => void openAudit()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
            >
              <Eye className="size-3.5 text-primary" />
              {state.remainingReveals === 0 ? 'Number ke viewers' : `Number — ${state.remainingReveals} reveal bache`}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAttachOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60"
            >
              <Phone className="size-3.5" /> Number badlo
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60"
            >
              <Trash2 className="size-3.5" /> Hatao
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAttachOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Phone className="size-3.5" /> Share your number
          </button>
        )}

        <Dialog open={attachOpen} onOpenChange={(open) => { if (!open) setAttachOpen(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share your number</DialogTitle>
              <DialogDescription>
                The number is never shown in feeds. Only people who unlock it can see it — 5 by default — and every unlock appears in your audit (who, how many times, when).
              </DialogDescription>
            </DialogHeader>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              placeholder="9876543210"
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAttachOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={() => void attach()} disabled={busy || phone.trim().length < 8}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Phone className="mr-2 size-4" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={auditOpen} onOpenChange={(open) => { if (!open) setAuditOpen(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Eye className="size-4" /> Who viewed the number</DialogTitle>
              <DialogDescription className="text-xs">
                Only you can see this. Every unlock shows how many times it was opened and when.
              </DialogDescription>
            </DialogHeader>
            {audit === null ? (
              <p className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 size-4 animate-spin" /> Loading…</p>
            ) : audit.viewers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nobody has unlocked your number yet.</p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {audit.viewers.map((viewer) => (
                  <div key={viewer.viewerId} className="flex items-center gap-3 rounded-2xl border p-2.5">
                    <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
                      {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="" className="size-9 object-cover" /> : viewer.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{viewer.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {viewer.viewCount > 1 ? `opened ${viewer.viewCount} times` : 'Opened once'} · first {formatSeenAt(viewer.firstViewedAt)}
                        {viewer.lastViewedAt !== viewer.firstViewedAt ? ` · last ${formatSeenAt(viewer.lastViewedAt)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-center text-[11px] text-muted-foreground">
                  {audit.totalReveals}/{audit.maxReveals ?? 5} reveals used
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!state.configured) return null;

  if (state.exhausted && !state.alreadyRevealed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
        <ShieldOff className="size-3.5" /> Number no longer available
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => void reveal()}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />}
        {state.alreadyRevealed ? 'View number again' : 'View number'}
      </button>

      <Dialog open={revealed !== null} onOpenChange={(open) => { if (!open) setRevealed(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Phone className="size-4" /> Number</DialogTitle>
            <DialogDescription className="text-xs">
              {state.remainingReveals > 0
                ? `You have ${state.remainingReveals} reveals left.`
                : 'This was the last available reveal.'}
            </DialogDescription>
          </DialogHeader>
          <p className="text-2xl font-semibold tracking-wide">{revealed}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevealed(null)}>Close</Button>
            <Button
              onClick={() => {
                if (!revealed) return;
                void navigator.clipboard.writeText(revealed).then(
                  () => showToast({ title: 'Copied', description: 'Number clipboard me hai.', variant: 'default' }),
                  () => showToast({ title: 'Copy failed', description: 'Manually note kar lo.', variant: 'error' }),
                );
              }}
            >
              <Copy className="mr-2 size-4" /> Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Small helper used by cards that want the raw state without the UI. */
export function useRevealState(surface: PostSurface, postIds: string[]): Record<string, PostRevealState> {
  const [states, setStates] = React.useState<Record<string, PostRevealState>>({});
  const key = postIds.join(',');
  React.useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void fetchRevealStates(surface, key.split(',')).then((next) => { if (!cancelled) setStates(next); }).catch(() => {});
    return () => { cancelled = true; };
  }, [key, surface]);
  return states;
}

export { Check };
