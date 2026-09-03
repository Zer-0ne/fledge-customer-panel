'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/toast';
import { Phone, Loader2, Copy, Check, Eye } from 'lucide-react';
import {
  fetchContactShareRequestDetail,
  approveContactShareRequest,
  rejectContactShareRequest,
  fetchRevealedContact,
} from '@/lib/api/services/contact';
import type { ContactShareRequest, RevealedContact } from '@/types';

function readDetail(event: Event): Record<string, string> {
  const detail = (event as CustomEvent).detail;
  if (detail && typeof detail === 'object') return detail as Record<string, string>;
  return {};
}

/** Owner side: incoming request + optional own number, approved in-dialog. */
function ApproverDialog({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [request, setRequest] = React.useState<ContactShareRequest | null>(null);
  const [phone, setPhone] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    fetchContactShareRequestDetail(requestId)
      .then((row) => { if (live) setRequest(row); })
      .catch(() => { if (live) setError('Could not load this request.'); });
    return () => { live = false; };
  }, [requestId]);

  const decide = async (ok: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (ok) await approveContactShareRequest(requestId, phone.trim() || undefined);
      else await rejectContactShareRequest(requestId);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onDone(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-4" /> Contact request
          </DialogTitle>
          <DialogDescription>
            Someone asked for your number. Type the number to share (or leave blank for your verified number), then approve.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {request && request.status !== 'pending' ? (
          <p className="text-xs text-muted-foreground">This request is already {request.status}.</p>
        ) : (
          <Input
            inputMode="tel"
            placeholder="98765 43210 (optional)"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Decline</Button>
          <Button disabled={busy || (request !== null && request.status !== 'pending')} onClick={() => decide(true)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Share number
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Requester side: one-time number view. Copy + close flushes it. */
function NumberDialog({ grantId, onDone }: { grantId: string; onDone: () => void }) {
  const [contact, setContact] = React.useState<RevealedContact | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState<'masked' | 'revealed' | 'done'>('masked');
  // Single-view grants: fetch exactly once (StrictMode double-mount must not
  // burn the only view).
  const fetchedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (fetchedRef.current === grantId) return;
    fetchedRef.current = grantId;
    let live = true;
    setMode('masked');
    return () => { live = false; };
  }, [grantId]);

  const reveal = () => {
    setBusy(true);
    setError(null);
    fetchRevealedContact(grantId)
      .then((row) => { setContact(row); setMode('revealed'); })
      .catch(() => { setError('This number is no longer available.'); setMode('done'); })
      .finally(() => setBusy(false));
  };

  const copy = async () => {
    if (!contact) return;
    try {
      await navigator.clipboard.writeText(contact.phoneNumber);
      setCopied(true);
    } catch {
      setError('Copy failed — note it down manually.');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onDone(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-4" /> Number shared
          </DialogTitle>
          <DialogDescription>
            One-time view — copy it now. Closing clears it; you will need a fresh request to see it again.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {mode === 'masked' ? (
          <Button disabled={busy} onClick={reveal} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />} {busy ? 'Revealing…' : 'Tap to view number'}
          </Button>
        ) : null}
        {mode === 'revealed' && contact ? (
          <p className="text-2xl font-semibold tracking-wide">{contact.phoneNumber}</p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>Close</Button>
          <Button disabled={!contact} onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Global listener: realtime contact-share events open the right dialog. */
export default function ContactShareDialogs() {
  const [approveId, setApproveId] = React.useState<string | null>(null);
  const [grantId, setGrantId] = React.useState<string | null>(null);
  const shownGrants = React.useRef(new Set<string>());

  React.useEffect(() => {
    const onRequested = (event: Event) => {
      const id = readDetail(event).shareRequestId;
      if (id) setApproveId(id);
    };
    const onApproved = (event: Event) => {
      const detail = readDetail(event);
      const id = detail.grantId;
      if (id && !shownGrants.current.has(id)) {
        shownGrants.current.add(id);
        setGrantId(id);
      }
    };
    const onRejected = () => {
      setApproveId(null);
      showToast({ title: 'Request declined', description: 'The owner declined your contact request.' });
    };
    const onSeen = () => {
      showToast({ title: 'Number viewed', description: 'The requester viewed your shared number.' });
    };
    window.addEventListener('contact:share_requested', onRequested);
    window.addEventListener('contact:share_approved', onApproved);
    window.addEventListener('contact:share_rejected', onRejected);
    window.addEventListener('contact:number_seen', onSeen);
    return () => {
      window.removeEventListener('contact:share_requested', onRequested);
      window.removeEventListener('contact:share_approved', onApproved);
      window.removeEventListener('contact:share_rejected', onRejected);
      window.removeEventListener('contact:number_seen', onSeen);
    };
  }, []);

  return (
    <>
      {approveId ? <ApproverDialog requestId={approveId} onDone={() => setApproveId(null)} /> : null}
      {grantId ? <NumberDialog grantId={grantId} onDone={() => setGrantId(null)} /> : null}
    </>
  );
}
