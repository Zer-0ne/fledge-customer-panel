'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, BadgeCheck, Loader2, Plus, RefreshCw, Send, Star, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { PostContactActions } from '@/components/post-engagement/post-contact-actions';
import { PostSeenByEntry, recordSeen } from '@/components/post-engagement/post-seen-by';
import { useAuth } from '@/components/providers/auth-provider';
import {
  SERVICE_CATEGORIES, ServiceCategory, ServiceProvider, ServiceEnquiry,
  fetchServiceEnquiries, fetchServiceProviders, registerServiceProvider,
  sendServiceEnquiry,
} from '@/lib/api/services/marketplace';

const LABEL = new Map<string, string>(SERVICE_CATEGORIES.map((item) => [item.code, item.label]));

export default function ServicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [providers, setProviders] = React.useState<ServiceProvider[] | null>(null);
  const [enquiries, setEnquiries] = React.useState<ServiceEnquiry[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState('');
  const [locality, setLocality] = React.useState('');
  const [target, setTarget] = React.useState<ServiceProvider | null>(null);
  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async (signal?: { cancelled: boolean }) => {
    setError(null);
    try {
      const [page, received] = await Promise.all([
        fetchServiceProviders({ category: category || undefined, locality: locality.trim() || undefined }),
        fetchServiceEnquiries('received').catch(() => [] as ServiceEnquiry[]),
      ]);
      if (signal?.cancelled) return;
      setProviders(page.items);
      setEnquiries(received);
    } catch (err) {
      if (signal?.cancelled) return;
      setError(err instanceof Error ? err.message : 'Could not load the directory');
    }
  }, [category, locality]);

  React.useEffect(() => {
    const signal = { cancelled: false };
    const timer = setTimeout(() => { void load(signal); }, locality ? 350 : 0);
    return () => { signal.cancelled = true; clearTimeout(timer); };
  }, [load, locality]);

  const enquire = async (provider: ServiceProvider, message: string) => {
    setBusy(true);
    try {
      await sendServiceEnquiry(provider.id, message);
      setTarget(null);
      showToast({ title: 'Enquiry sent', description: 'They accept first, then contact details are shared. No numbers floating in a group.', variant: 'default' });
    } catch (err) {
      showToast({ title: 'Could not send', description: err instanceof Error ? err.message : 'Try again.', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-full border p-2 transition hover:bg-accent" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <Wrench className="h-5 w-5" /> Local services
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Maid, cook, tiffin, plumber, electrician — the same three numbers everyone keeps asking the group for.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setRegisterOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Offer service
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setCategory('')} className={`rounded-full border px-3 py-1.5 text-xs transition ${category === '' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}>All</button>
        {SERVICE_CATEGORIES.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => setCategory(item.code === category ? '' : item.code)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${category === item.code ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <input
        value={locality}
        onChange={(event) => setLocality(event.target.value)}
        placeholder="Filter by area (e.g. Gali 36)"
        className="mb-5 w-full rounded-2xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />

      {enquiries.length > 0 && (
        <section className="mb-6 rounded-3xl border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Send className="h-4 w-4" /> Enquiries for you ({enquiries.length})</h2>
          <ul className="mt-3 space-y-2">
            {enquiries.map((enquiry) => (
              <li key={enquiry.id} className="rounded-2xl border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{enquiry.message}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${enquiry.status === 'pending' ? 'text-amber-600' : 'text-emerald-600'}`}>{enquiry.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <ErrorState message={error} onRetry={() => { void load(); }} />}
      {!error && providers === null && <div className="space-y-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-20 w-full rounded-3xl" />)}</div>}

      {!error && providers !== null && providers.length === 0 && (
        <EmptyState
          title="No one listed in this area yet"
          description="If you know a good maid, cook or tiffin in your gali, registering them is the fastest way to help every neighbour."
          action={<Button onClick={() => setRegisterOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Register a service</Button>}
        />
      )}

      {!error && providers !== null && providers.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {providers.map((provider, index) => (
            <motion.article
              key={provider.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
              className="flex flex-col rounded-3xl border bg-card p-4 shadow-sm"
            >
              {(() => {
                const isOwner = Boolean(user?.id) && user?.id === provider.userId;
                return (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{LABEL.get(provider.category) ?? provider.category}</span>
                      {provider.verifiedAt && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold">{provider.displayName}</h3>
                    {provider.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{provider.description}</p>}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {provider.rating ? (
                        <span className="flex items-center gap-1 text-foreground"><Star className="h-3.5 w-3.5" /> {provider.rating} ({provider.ratingCount})</span>
                      ) : <span>No ratings yet</span>}
                      {provider.locality && <span>· {provider.locality}</span>}
                      {provider.priceNote && <span>· {provider.priceNote}</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <PostContactActions surface="SERVICE_PROVIDER" postId={provider.id} isOwner={isOwner} />
                      {isOwner && <PostSeenByEntry surface="SERVICE_PROVIDER" postId={provider.id} />}
                    </div>
                    {!isOwner && (
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          recordSeen('SERVICE_PROVIDER', provider.id);
                          setTarget(provider);
                        }}
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Enquire
                      </Button>
                    )}
                  </>
                );
              })()}
            </motion.article>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" className="mt-6" onClick={() => { void load(); }}>
        <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
      </Button>

      <EnquiryDialog provider={target} busy={busy} onClose={() => setTarget(null)} onSend={enquire} />
      <RegisterDialog
        open={registerOpen}
        busy={busy}
        onClose={() => setRegisterOpen(false)}
        onSubmit={async (input) => {
          setBusy(true);
          try {
            await registerServiceProvider(input);
            setRegisterOpen(false);
            showToast({ title: 'Submitted for review', description: 'A moderator activates it, then neighbours can find you.', variant: 'default' });
          } catch (err) {
            showToast({ title: 'Could not submit', description: err instanceof Error ? err.message : 'Try again.', variant: 'error' });
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function EnquiryDialog({ provider, busy, onClose, onSend }: {
  provider: ServiceProvider | null;
  busy: boolean;
  onClose: () => void;
  onSend: (provider: ServiceProvider, message: string) => Promise<void>;
}) {
  const [message, setMessage] = React.useState('Hi, are you available this week? I am nearby.');
  return (
    <Dialog open={provider !== null} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enquire — {provider?.displayName}</DialogTitle>
          <DialogDescription>
            They accept first, then contact details are shared. Nothing is exposed until both sides agree.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          className="w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => { if (provider) void onSend(provider, message.trim()); }} disabled={busy || message.trim().length < 5}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegisterDialog({ open, busy, onClose, onSubmit }: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof registerServiceProvider>[0]) => Promise<void>;
}) {
  const [category, setCategory] = React.useState<ServiceCategory>('maid');
  const [displayName, setDisplayName] = React.useState('');
  const [locality, setLocality] = React.useState('');
  const [priceNote, setPriceNote] = React.useState('');
  const [experienceYears, setExperienceYears] = React.useState('');

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offer a service</DialogTitle>
          <DialogDescription>You, or someone you recommend. A moderator reviews it before it appears.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <select value={category} onChange={(event) => setCategory(event.target.value as ServiceCategory)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm">
            {SERVICE_CATEGORIES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name neighbours will recognise" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          <input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Area / street you serve" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input value={priceNote} onChange={(event) => setPriceNote(event.target.value)} placeholder="Rate note (e.g. ₹300/visit)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
            <input value={experienceYears} onChange={(event) => setExperienceYears(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Years of experience" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={() => {
              if (!displayName.trim() || !locality.trim()) {
                showToast({ title: 'Name and area are required', variant: 'error' });
                return;
              }
              void onSubmit({
                category, displayName: displayName.trim(), locality: locality.trim(),
                priceNote: priceNote.trim() || undefined,
                experienceYears: experienceYears ? Number(experienceYears) : undefined,
              });
            }}
            disabled={busy}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
