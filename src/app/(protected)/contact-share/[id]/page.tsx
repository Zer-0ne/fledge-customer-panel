'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Phone, Copy, Check } from 'lucide-react';
import {
  fetchContactShareRequestDetail,
  approveContactShareRequest,
  rejectContactShareRequest,
  fetchRevealedContact,
} from '@/lib/api/services/contact';
import type { ContactShareRequest, RevealedContact } from '@/types';

/**
 * Deep-link target for contact-share push/mail taps (offline path).
 */
export default function ContactShareDeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [request, setRequest] = React.useState<ContactShareRequest | null>(null);
  const [contact, setContact] = React.useState<RevealedContact | null>(null);
  const [phone, setPhone] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'loading' | 'approve' | 'reveal' | 'done'>('loading');

  React.useEffect(() => {
    if (!id) return;
    let live = true;
    (async () => {
      try {
        const row = await fetchContactShareRequestDetail(id);
        if (!live) return;
        setRequest(row);
        if (row.status === 'pending') setMode('approve');
        else if (row.accessGrant) {
          const revealed = await fetchRevealedContact(row.accessGrant.id);
          if (!live) return;
          setContact(revealed);
          setMode('reveal');
        } else setMode('done');
      } catch {
        if (live) {
          setError('This request is unavailable (expired or decided).');
          setMode('done');
        }
      }
    })();
    return () => { live = false; };
  }, [id]);

  const decide = async (ok: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (ok) await approveContactShareRequest(id, phone.trim() || undefined);
      else await rejectContactShareRequest(id);
      setMode('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
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
    <div className="mx-auto max-w-md space-y-4 px-4 py-8">
      <h1 className="flex items-center gap-2 text-lg font-semibold">
        <Phone className="size-5" /> Contact share
      </h1>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {mode === 'loading' ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : null}
      {mode === 'approve' && request ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Someone asked for your number. Type it below (or leave blank for your verified number).
          </p>
          <Input inputMode="tel" placeholder="98765 43210 (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Decline</Button>
            <Button disabled={busy} onClick={() => decide(true)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Share number
            </Button>
          </div>
        </div>
      ) : null}
      {mode === 'reveal' && contact ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">One-time view — copy it now, closing clears it.</p>
          <p className="text-2xl font-semibold tracking-wide">{contact.phoneNumber}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/messages')}>Back to chat</Button>
            <Button onClick={copy}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy'}</Button>
          </div>
        </div>
      ) : null}
      {mode === 'done' && !error ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Done.</p>
          <Button variant="outline" onClick={() => router.push('/messages')}>Back to chat</Button>
        </div>
      ) : null}
    </div>
  );
}
