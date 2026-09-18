'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ClipboardPaste, Copy, Eraser, Info,
  Loader2, MessageCircle, Pencil, Send, Sparkles, Timer, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { createRoommatePost } from '@/lib/api/services/roommates';
import {
  AmenityOption, INTENT_LABEL, ParsedCommunityPost, ShareCard, WARNING_COPY,
  buildShareCard, fetchAmenities, parseCommunityPost,
} from '@/lib/api/services/community-bridge';

type Step = 'paste' | 'review' | 'share';

const EXAMPLES = [
  'Room available in 3bhk flat. 3K separate room, Government meter, 5th floor, gali 34, Boys only',
  'Need 1 bhk or 2bhk flat for family, gali 28, budget 8k',
  'Kisi ko cooler chahiye, 1 season used, 1200 only',
];

const inr = (paise: number | null | undefined) =>
  paise == null ? '' : `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function ImportFromCommunityPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('paste');
  const [text, setText] = React.useState('');
  const [parsing, setParsing] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedCommunityPost | null>(null);
  const [amenities, setAmenities] = React.useState<AmenityOption[]>([]);
  const [publishing, setPublishing] = React.useState(false);
  const [card, setCard] = React.useState<ShareCard | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Editable draft (the parser output is a starting point, never the final word)
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [locality, setLocality] = React.useState('');
  const [gender, setGender] = React.useState<'any' | 'male' | 'female'>('any');
  const [codes, setCodes] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await fetchAmenities();
        if (!cancelled) setAmenities(catalog);
      } catch {
        // Catalog is a nicety — never block the flow on it.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const grouped = React.useMemo(() => {
    const map = new Map<string, AmenityOption[]>();
    for (const item of amenities) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [amenities]);

  const pasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) {
        showToast({ title: 'Clipboard is empty', description: 'Copy the group post first, then tap paste.', variant: 'error' });
        return;
      }
      setText(clip);
    } catch {
      showToast({ title: 'Could not read clipboard', description: 'Paste the text into the box manually (long-press → Paste).', variant: 'error' });
    }
  };

  const parse = async () => {
    if (text.trim().length < 12) {
      showToast({ title: 'That looks too short', description: 'Paste the whole post so nothing is missed.', variant: 'error' });
      return;
    }
    setParsing(true);
    try {
      const result = await parseCommunityPost(text.trim());
      setParsed(result);
      setTitle(result.title.slice(0, 200));
      setBody(result.description.slice(0, 5_000));
      const amountPaise = result.rentPerHeadPaise ?? result.rentPaise ?? result.pricePaise;
      setAmount(amountPaise ? String(Math.round(amountPaise / 100)) : '');
      setLocality(result.streetLabel ?? '');
      setGender(result.genderPreference ?? 'any');
      setCodes(result.amenityCodes);
      setStep('review');
    } catch (error) {
      showToast({
        title: 'Could not read that post',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setParsing(false);
    }
  };

  const publish = async () => {
    if (!parsed) return;
    if (!title.trim() || !body.trim()) {
      showToast({ title: 'Title and details are required', variant: 'error' });
      return;
    }
    if (!locality.trim()) {
      showToast({ title: 'Add the area / street', description: 'Neighbours search by area — it is how they will find you.', variant: 'error' });
      return;
    }
    setPublishing(true);
    try {
      const amountPaise = amount.trim() ? Math.round(Number(amount.replace(/[^0-9]/g, '')) * 100) : undefined;
      const result = await createRoommatePost({
        postType: parsed.roommatePostType ?? (parsed.intent === 'SEEK_ROOM' ? 'LOOKING_TO_JOIN_EXISTING_FLAT' : 'ROOM_AVAILABLE_IN_EXISTING_FLAT'),
        locality: locality.trim(),
        title: title.trim(),
        body: body.trim(),
        budgetPaise: Number.isFinite(amountPaise) ? amountPaise : undefined,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString(),
        // Market vocabulary travels with the post so filters can find it.
        preferences: {
          ...(codes.length ? { amenities: codes.join(',') } : {}),
          ...(gender !== 'any' ? { gender: gender } : {}),
          ...(parsed.floor ? { floor: parsed.floor } : {}),
          ...(parsed.furnishing ? { furnishing: parsed.furnishing } : {}),
        },
      });
      const id = result.postId || result.id;
      if (id) {
        try {
          setCard(await buildShareCard('roommate-post', id));
        } catch {
          // Published even if the card could not be built — the post is live.
        }
      }
      showToast({ title: 'Posted', description: 'Your post is live. Share it back to the group below.', variant: 'default' });
      setStep('share');
    } catch (error) {
      showToast({
        title: 'Could not publish',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setPublishing(false);
    }
  };

  // Prod may not have SHARE_PUBLIC_BASE_URL set: the backend then returns a
  // relative deep-link path. Compose the absolute link from our own origin so
  // the card is always clickable, regardless of that env var.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const absoluteCardText = (text: string) =>
    origin ? text.replace(/(^|\s)(\/(?:listings|roommate-posts|resale-posts)\/[^\s]+)/g, (_match, pre: string, path: string) => `${pre}${origin}${path}`) : text;

  // A SEEK post doubles as a 24-hour Need Now request: hand the parse off so the
  // Need Now form opens prefilled instead of making the user retype it.
  const handOffToNeedNow = () => {
    if (!parsed) return;
    try {
      const rentINR = parsed.rentPaise != null ? String(Math.round(parsed.rentPaise / 100)) : parsed.rentPerHeadPaise != null ? String(Math.round(parsed.rentPerHeadPaise / 100)) : '';
      const body = [parsed.title, parsed.description].filter(Boolean).join('\n').slice(0, 300);
      window.sessionStorage.setItem('fledge.neednow.draft', JSON.stringify({
        locationName: parsed.streetLabel ?? '',
        budgetMaxINR: rentINR,
        description: body,
      }));
      showToast({ title: 'Draft ready', description: 'Need Now form is prefilled from your post.', variant: 'default' });
      router.push('/need-now/new');
    } catch {
      router.push('/need-now/new');
    }
  };

  const copyCard = async () => {
    if (!card) return;
    try {
      await navigator.clipboard.writeText(absoluteCardText(card.body));
      setCopied(true);
      showToast({ title: 'Copied', description: 'Paste it into your group.', variant: 'default' });
      setTimeout(() => setCopied(false), 2_500);
    } catch {
      showToast({ title: 'Copy failed', description: 'Select the text and copy manually.', variant: 'error' });
    }
  };

  const reset = () => {
    setStep('paste'); setText(''); setParsed(null); setCard(null); setCodes([]); setAmount(''); setLocality('');
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'paste', label: 'Paste' },
    { key: 'review', label: 'Check' },
    { key: 'share', label: 'Share' },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border p-2 transition hover:bg-accent"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <Sparkles className="h-5 w-5" /> Post once, both places
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Paste the message you would send to the group. We turn it into a priced, searchable post — then hand you a card to share back.
          </p>
        </div>
      </div>

      {/* Step rail */}
      <div className="mb-6 flex items-center gap-2">
        {steps.map((item, index) => {
          const active = item.key === step;
          const done = steps.findIndex((s) => s.key === step) > index;
          return (
            <React.Fragment key={item.key}>
              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active ? 'border-primary bg-primary/10 text-primary' : done ? 'border-emerald-500/40 text-emerald-600' : 'text-muted-foreground'
                }`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full border text-xs">
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {item.label}
              </div>
              {index < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
            </React.Fragment>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 'paste' && (
          <motion.section
            key="paste"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6"
          >
            <label htmlFor="community-post" className="text-sm font-medium">
              Group message
            </label>
            <textarea
              id="community-post"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={7}
              placeholder="Room available in 3bhk flat. 3K separate room, Government meter, 5th floor, gali 34..."
              className="mt-2 w-full resize-y rounded-2xl border bg-background p-4 text-sm leading-relaxed outline-none transition focus:ring-2 focus:ring-primary/30"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={pasteFromClipboard}>
                <ClipboardPaste className="mr-1.5 h-4 w-4" /> Paste from clipboard
              </Button>
              {text && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setText('')}>
                  <Eraser className="mr-1.5 h-4 w-4" /> Clear
                </Button>
              )}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Try one of these shapes</p>
              <div className="flex flex-col gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setText(example)}
                    className="rounded-2xl border border-dashed p-3 text-left text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <Button className="mt-5 w-full" size="lg" onClick={parse} disabled={parsing}>
              {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {parsing ? 'Reading the post…' : 'Read this post'}
            </Button>
          </motion.section>
        )}

        {step === 'review' && parsed && (
          <motion.section
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{INTENT_LABEL[parsed.intent]}</span>
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                {parsed.confidence} confidence
              </span>
              {parsed.fieldsFound.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  read: {parsed.fieldsFound.join(' · ')}
                </span>
              )}
            </div>

            {parsed.warnings.length > 0 && (
              <div className="space-y-2">
                {parsed.warnings.map((warning) => (
                  <div key={warning} className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>{WARNING_COPY[warning] ?? warning}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm">
              <div>
                <label htmlFor="draft-title" className="text-xs font-medium text-muted-foreground">Headline</label>
                <input
                  id="draft-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="draft-amount" className="text-xs font-medium text-muted-foreground">
                    {parsed.rentPerHeadPaise ? 'Rent per head (₹ / month)' : 'Rent (₹ / month)'}
                  </label>
                  <input
                    id="draft-amount"
                    value={amount}
                    inputMode="numeric"
                    onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))}
                    className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label htmlFor="draft-locality" className="text-xs font-medium text-muted-foreground">Area / street</label>
                  <input
                    id="draft-locality"
                    value={locality}
                    onChange={(event) => setLocality(event.target.value)}
                    placeholder="Gali 34, Tughlakabad"
                    className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground">Who is it for</span>
                <div className="mt-1.5 flex gap-2">
                  {([['any', 'Anyone'], ['male', 'Boys'], ['female', 'Girls']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGender(value)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        gender === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="draft-body" className="text-xs font-medium text-muted-foreground">Details</label>
                <textarea
                  id="draft-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={5}
                  className="mt-1.5 w-full resize-y rounded-xl border bg-background p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {grouped.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    What it has — these are what people actually filter on
                  </p>
                  <div className="mt-2 space-y-3">
                    {grouped.map(([category, items]) => (
                      <div key={category}>
                        <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">{category}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((item) => {
                            const active = codes.includes(item.code);
                            return (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => setCodes((prev) => active ? prev.filter((c) => c !== item.code) : [...prev, item.code])}
                                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                                  active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                                }`}
                                aria-pressed={active}
                              >
                                {item.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="sm:w-40" onClick={reset} disabled={publishing}>
                <Pencil className="mr-2 h-4 w-4" /> Start over
              </Button>
              <Button className="flex-1" size="lg" onClick={publish} disabled={publishing}>
                {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {publishing ? 'Publishing…' : 'Publish post'}
              </Button>
            </div>
          </motion.section>
        )}

        {step === 'share' && (
          <motion.section
            key="share"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-4"
          >
            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-semibold">Your post is live</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Post it back into your group so the people who only use WhatsApp still see it.
              </p>

              {card ? (
                <>
                  <pre className="mt-4 whitespace-pre-wrap rounded-2xl border bg-background p-4 text-xs leading-relaxed">{absoluteCardText(card.body)}</pre>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" className="sm:w-40" onClick={copyCard}>
                      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copied ? 'Copied' : 'Copy card'}
                    </Button>
                    <a
                      className="flex-1"
                      href={card.deepLinkUrl ? card.whatsappUrl : `https://wa.me/?text=${encodeURIComponent(absoluteCardText(card.body))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="w-full" size="lg">
                        <MessageCircle className="mr-2 h-4 w-4" /> Share on WhatsApp
                      </Button>
                    </a>
                  </div>
                  {parsed?.intent === 'SEEK_ROOM' && (
                    <Button variant="secondary" className="w-full" onClick={handOffToNeedNow}>
                      <Timer className="mr-2 h-4 w-4" /> Faster: also post as a 24h Need Now
                    </Button>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm">Your post is published — open it from your posts list to share it.</p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="sm:w-40" onClick={reset}>
                <Sparkles className="mr-2 h-4 w-4" /> Post another
              </Button>
              <Link className="flex-1" href="/roommate-posts">
                <Button className="w-full" size="lg">
                  See my posts <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {amount && parsed && step === 'review' && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {inr(Number(amount) * 100)} per month · {locality || 'add an area'} · {codes.length} feature{codes.length === 1 ? '' : 's'} tagged
        </p>
      )}
    </div>
  );
}
