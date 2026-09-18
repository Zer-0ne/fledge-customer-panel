'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, HandCoins, Loader2, Plus, RefreshCw, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MediaPicker } from '@/components/community/media-picker';
import { RoommatePostMedia } from '@/components/roommates/roommate-post-media';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import {
  RESALE_CATEGORIES, ResaleCategory, ResaleInterest, ResalePost,
  createResalePost, expressResaleInterest, fetchMyResaleInterests, fetchResalePosts, formatInr, markResaleSold,
} from '@/lib/api/services/marketplace';

const CATEGORY_LABEL = new Map<string, string>(RESALE_CATEGORIES.map((item) => [item.code, item.label]));

export default function ResalePage() {
  const router = useRouter();
  const [posts, setPosts] = React.useState<ResalePost[] | null>(null);
  const [interests, setInterests] = React.useState<ResaleInterest[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState<string>('');
  const [locality, setLocality] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async (signal?: { cancelled: boolean }) => {
    setError(null);
    try {
      const [page, myInterests] = await Promise.all([
        fetchResalePosts({ category: category || undefined, locality: locality.trim() || undefined }),
        fetchMyResaleInterests().catch(() => [] as ResaleInterest[]),
      ]);
      if (signal?.cancelled) return;
      setPosts(page.items);
      setInterests(myInterests);
    } catch (err) {
      if (signal?.cancelled) return;
      setError(err instanceof Error ? err.message : 'Could not load the marketplace');
    }
  }, [category, locality]);

  React.useEffect(() => {
    const signal = { cancelled: false };
    const timer = setTimeout(() => { void load(signal); }, locality ? 350 : 0);
    return () => { signal.cancelled = true; clearTimeout(timer); };
  }, [load, locality]);

  const mine = React.useMemo(() => (posts ?? []).filter((post) => interests.some((interest) => interest.postId === post.id)), [posts, interests]);

  const interested = async (post: ResalePost) => {
    setBusyId(post.id);
    try {
      await expressResaleInterest(post.id);
      showToast({ title: 'Interest sent', description: 'The seller has been notified. Contact details stay private until they accept.', variant: 'default' });
    } catch (err) {
      showToast({ title: 'Could not send interest', description: err instanceof Error ? err.message : 'Try again.', variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const sold = async (post: ResalePost) => {
    setBusyId(post.id);
    try {
      await markResaleSold(post.id);
      setPosts((prev) => (prev ?? []).map((item) => item.id === post.id ? { ...item, status: 'sold' } : item));
      showToast({ title: 'Marked sold', description: 'It is out of the marketplace. This is the bit WhatsApp never does.', variant: 'default' });
    } catch (err) {
      showToast({ title: 'Could not update', description: err instanceof Error ? err.message : 'Try again.', variant: 'error' });
    } finally {
      setBusyId(null);
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
            <Tag className="h-5 w-5" /> Second-hand market
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The semester-end scramble for coolers, almaris and beds — priced, and it disappears when it is sold.
          </p>
        </div>
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Sell
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${category === '' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}
        >
          All
        </button>
        {RESALE_CATEGORIES.map((item) => (
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
        placeholder="Filter by area / street (e.g. Gali 36)"
        className="mb-5 w-full rounded-2xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />

      {interests.length > 0 && (
        <section className="mb-6 rounded-3xl border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <HandCoins className="h-4 w-4" /> Buyers waiting on you ({interests.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {interests.map((interest) => (
              <li key={interest.id} className="flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm">
                <span className="truncate">{interest.postTitle}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${interest.status === 'pending' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {interest.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <ErrorState message={error} onRetry={() => { void load(); }} />}

      {!error && posts === null && (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => <Skeleton key={key} className="h-24 w-full rounded-3xl" />)}
        </div>
      )}

      {!error && posts !== null && posts.length === 0 && (
        <EmptyState
          title="Nothing on sale here yet"
          description="Be the first — list the cooler you will not carry to the next city."
          action={<Button onClick={() => setComposeOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> List an item</Button>}
        />
      )}

      {!error && posts !== null && posts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {posts.map((post, index) => {
            const isMine = mine.some((item) => item.id === post.id);
            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                className="flex flex-col rounded-3xl border bg-card p-4 shadow-sm"
              >
                {post.mediaIds && post.mediaIds.length > 0 && (
                  <RoommatePostMedia mediaIds={post.mediaIds} alt={post.title} className="mb-3" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{CATEGORY_LABEL.get(post.category) ?? post.category}</span>
                  {post.mediaState === 'pending' ? (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600" title="Photos are being checked — only you can see this item right now.">
                      Under review
                    </span>
                  ) : post.status !== 'active' && (
                    <span className="rounded-full border px-2 py-0.5 text-xs text-emerald-600">{post.status}</span>
                  )}
                </div>
                <h3 className="mt-2 line-clamp-2 text-sm font-semibold">{post.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.description}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-base font-semibold text-foreground">{formatInr(post.pricePaise)}</span>
                  {post.negotiable && <span>· negotiable</span>}
                  {post.locality && <span>· {post.locality}</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  {isMine ? (
                    post.status === 'active' && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { void sold(post); }} disabled={busyId === post.id}>
                        {busyId === post.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />}
                        Mark sold
                      </Button>
                    )
                  ) : (
                    <Button size="sm" className="flex-1" onClick={() => { void interested(post); }} disabled={busyId === post.id || post.status !== 'active'}>
                      {busyId === post.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <HandCoins className="mr-1.5 h-3.5 w-3.5" />}
                      I want this
                    </Button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <Button variant="ghost" size="sm" className="mt-6" onClick={() => { void load(); }}>
        <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
      </Button>

      <ComposeResaleDialog
        open={composeOpen}
        busy={creating}
        onClose={() => setComposeOpen(false)}
        onSubmit={async (input) => {
          setCreating(true);
          try {
            const created = await createResalePost(input);
            setPosts((prev) => [created, ...(prev ?? [])]);
            setComposeOpen(false);
            showToast({ title: 'Listed', description: 'Your item is live in the marketplace.', variant: 'default' });
          } catch (err) {
            showToast({ title: 'Could not list it', description: err instanceof Error ? err.message : 'Try again.', variant: 'error' });
          } finally {
            setCreating(false);
          }
        }}
      />
    </div>
  );
}

function ComposeResaleDialog({ open, busy, onClose, onSubmit }: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof createResalePost>[0]) => Promise<void>;
}) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [category, setCategory] = React.useState<ResaleCategory>('cooler');
  const [condition, setCondition] = React.useState<'new' | 'like_new' | 'used'>('used');
  const [negotiable, setNegotiable] = React.useState(true);
  const [locality, setLocality] = React.useState('');
  // Photos are moderated by the same pipeline as every other post (OCR /
  // safety checks run server-side); up to five per item.
  const [images, setImages] = React.useState<{ mediaId: string; url?: string }[]>([]);
  const [mediaChecking, setMediaChecking] = React.useState(false);

  const submit = async () => {
    const rupees = Number(price.replace(/[^0-9]/g, ''));
    if (mediaChecking) {
      showToast({ title: 'Photos are still being checked', description: 'Give it a few seconds — rejected photos are removed automatically.', variant: 'error' });
      return;
    }
    if (!title.trim() || !description.trim() || !locality.trim() || !Number.isFinite(rupees) || rupees <= 0) {
      showToast({ title: 'Fill everything in', description: 'Title, details, price and area are required.', variant: 'error' });
      return;
    }
    await onSubmit({
      category, title: title.trim(), description: description.trim(),
      pricePaise: rupees * 100, negotiable, condition, locality: locality.trim(),
      mediaIds: images.map((image) => image.mediaId),
    });
    setTitle(''); setDescription(''); setPrice(''); setLocality(''); setImages([]);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell an item</DialogTitle>
          <DialogDescription>
            A price is required — an unpriced post is the single biggest complaint about group posts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ResaleCategory)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          >
            {RESALE_CATEGORIES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What is it? (e.g. Symphony cooler, 1 season used)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Condition, why you are selling, anything buyers should know" className="w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input value={price} onChange={(event) => setPrice(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Price ₹" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
            <input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Area / street" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['new', 'like_new', 'used'] as const).map((value) => (
              <button key={value} type="button" onClick={() => setCondition(value)} className={`rounded-full border px-3 py-1.5 text-xs transition ${condition === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                {value === 'like_new' ? 'Like new' : value}
              </button>
            ))}
            <button type="button" onClick={() => setNegotiable(!negotiable)} className={`rounded-full border px-3 py-1.5 text-xs transition ${negotiable ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
              Negotiable
            </button>
          </div>

          {/* Photos — multi-image, same moderation pipeline as every other post. */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Photos (up to 5)</p>
            <MediaPicker value={images} onChange={setImages} maxCount={5} onUploadingChange={setMediaChecking} />
            <p className="text-xs text-muted-foreground">
              Every photo is checked as you add it. Promotional artwork, broker flyers, QR codes and
              images with contact details are removed right away — real photos of the item only.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => { void submit(); }} disabled={busy || mediaChecking}>
            {busy || mediaChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {busy ? 'Listing…' : mediaChecking ? 'Uploading photos…' : 'List it'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
