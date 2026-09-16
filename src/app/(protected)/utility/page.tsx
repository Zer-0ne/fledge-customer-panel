'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Loader2, RefreshCw, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import {
  UTILITY_KINDS, UTILITY_STATUSES, UtilityReport,
  fetchUtilityBoard, postUtilityReport, retractUtilityReport, timeLeft, voteUtilityReport,
} from '@/lib/api/services/marketplace';

const KIND_META: Record<string, { label: string; tone: string }> = {
  water: { label: 'Water', tone: 'bg-sky-500' },
  power: { label: 'Power', tone: 'bg-amber-500' },
  gas: { label: 'Gas', tone: 'bg-orange-500' },
  other: { label: 'Other', tone: 'bg-slate-400' },
};

const STATUS_TONE: Record<string, string> = {
  available: 'text-emerald-600 border-emerald-500/40',
  restored: 'text-emerald-600 border-emerald-500/40',
  unavailable: 'text-rose-600 border-rose-500/40',
  intermittent: 'text-amber-600 border-amber-500/40',
};

export default function UtilityBoardPage() {
  const router = useRouter();
  const [reports, setReports] = React.useState<UtilityReport[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState('');
  const [locality, setLocality] = React.useState('');
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async (signal?: { cancelled: boolean }) => {
    setError(null);
    try {
      const board = await fetchUtilityBoard({ kind: kind || undefined, locality: locality.trim() || undefined });
      if (signal?.cancelled) return;
      setReports(board);
    } catch (err) {
      if (signal?.cancelled) return;
      setError(err instanceof Error ? err.message : 'Could not load the board');
    }
  }, [kind, locality]);

  React.useEffect(() => {
    const signal = { cancelled: false };
    const timer = setTimeout(() => { void load(signal); }, locality ? 350 : 0);
    return () => { signal.cancelled = true; clearTimeout(timer); };
  }, [load, locality]);

  const vote = async (report: UtilityReport, value: 'confirm' | 'dispute') => {
    setBusy(report.id);
    try {
      await voteUtilityReport(report.id, value);
      setReports((prev) => (prev ?? []).map((item) => item.id === report.id
        ? { ...item, confirmations: item.confirmations + (value === 'confirm' ? 1 : 0), disputes: item.disputes + (value === 'dispute' ? 1 : 0) }
        : item));
    } catch (err) {
      showToast({ title: 'Could not vote', description: err instanceof Error ? err.message : 'Try again.', variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const retract = async (report: UtilityReport) => {
    setBusy(report.id);
    try {
      await retractUtilityReport(report.id);
      setReports((prev) => (prev ?? []).filter((item) => item.id !== report.id));
      showToast({ title: 'Removed', variant: 'default' });
    } catch (err) {
      showToast({ title: 'Could not remove', description: err instanceof Error ? err.message : 'Try again.', variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-full border p-2 transition hover:bg-accent" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Right now in the gali</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Water, power and gas — reported by neighbours, and gone from the board after a few hours so nobody acts on stale news.
          </p>
        </div>
        <Button size="sm" onClick={() => setComposeOpen(true)}><Send className="mr-1.5 h-4 w-4" /> Post</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setKind('')} className={`rounded-full border px-3 py-1.5 text-xs transition ${kind === '' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}>Everything</button>
        {UTILITY_KINDS.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => setKind(item.code === kind ? '' : item.code)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${kind === item.code ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <input
        value={locality}
        onChange={(event) => setLocality(event.target.value)}
        placeholder="Your area / street"
        className="mb-5 w-full rounded-2xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />

      {error && <ErrorState message={error} onRetry={() => { void load(); }} />}
      {!error && reports === null && <div className="space-y-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-20 w-full rounded-3xl" />)}</div>}

      {!error && reports !== null && reports.length === 0 && (
        <EmptyState
          title="Nothing to report"
          description="When the tanker does not turn up or the power goes, say so here — your neighbours will confirm it."
          action={<Button onClick={() => setComposeOpen(true)}><Send className="mr-1.5 h-4 w-4" /> Post an update</Button>}
        />
      )}

      <AnimatePresence initial={false}>
        {!error && reports !== null && reports.length > 0 && (
          <div className="space-y-3">
            {reports.map((report, index) => {
              const meta = KIND_META[report.kind] ?? { label: report.kind, tone: 'bg-slate-400' };
              const statusLabel = UTILITY_STATUSES.find((item) => item.code === report.status)?.label ?? report.status;
              return (
                <motion.article
                  key={report.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                  className="rounded-3xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${meta.tone}`} aria-hidden />
                      <span className="text-sm font-semibold">{meta.label}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_TONE[report.status] ?? ''}`}>{statusLabel}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> {timeLeft(report.expiresAt)}</span>
                  </div>
                  {report.note && <p className="mt-2 text-xs text-muted-foreground">{report.note}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">{report.locality ?? 'area not set'}{report.streetLabel ? ` · ${report.streetLabel}` : ''}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { void vote(report, 'confirm'); }} disabled={busy === report.id}>
                      {busy === report.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />} Confirm ({report.confirmations})
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { void vote(report, 'dispute'); }} disabled={busy === report.id}>
                      <ThumbsDown className="mr-1.5 h-3.5 w-3.5" /> Not here ({report.disputes})
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { void retract(report); }} disabled={busy === report.id}>Remove</Button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <Button variant="ghost" size="sm" className="mt-6" onClick={() => { void load(); }}>
        <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
      </Button>

      <ComposeUtilityDialog
        open={composeOpen}
        busy={busy === 'compose'}
        onClose={() => setComposeOpen(false)}
        onSubmit={async (input) => {
          setBusy('compose');
          try {
            const created = await postUtilityReport(input);
            setReports((prev) => [created, ...(prev ?? [])]);
            setComposeOpen(false);
            showToast({ title: 'Posted', description: 'Neighbours can confirm it — it will fade off the board on its own.', variant: 'default' });
          } catch (err) {
            showToast({ title: 'Could not post', description: err instanceof Error ? err.message : 'Try again.', variant: 'error' });
          } finally {
            setBusy(null);
          }
        }}
      />
    </div>
  );
}

function ComposeUtilityDialog({ open, busy, onClose, onSubmit }: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof postUtilityReport>[0]) => Promise<void>;
}) {
  const [kind, setKind] = React.useState('water');
  const [status, setStatus] = React.useState('unavailable');
  const [locality, setLocality] = React.useState('');
  const [note, setNote] = React.useState('');
  const [ttlHours, setTtlHours] = React.useState('12');

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post an update</DialogTitle>
          <DialogDescription>Keep it short and factual. It expires automatically — the board is about right now.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {UTILITY_KINDS.map((item) => (
              <button key={item.code} type="button" onClick={() => setKind(item.code)} className={`rounded-full border px-3 py-1.5 text-xs transition ${kind === item.code ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}>{item.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {UTILITY_STATUSES.map((item) => (
              <button key={item.code} type="button" onClick={() => setStatus(item.code)} className={`rounded-full border px-3 py-1.5 text-xs transition ${status === item.code ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}>{item.label}</button>
            ))}
          </div>
          <input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Area / street" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Optional detail (e.g. tanker did not come since morning)" className="w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm" />
          <div>
            <label htmlFor="utility-ttl" className="text-xs text-muted-foreground">Stays on the board for (hours)</label>
            <input id="utility-ttl" value={ttlHours} onChange={(event) => setTtlHours(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={() => {
              if (!locality.trim()) {
                showToast({ title: 'Add your area', description: 'A utility update without an area helps nobody.', variant: 'error' });
                return;
              }
              const hours = Number(ttlHours) || 12;
              void onSubmit({
                kind, status, locality: locality.trim(), note: note.trim() || undefined,
                ttlMinutes: Math.min(Math.max(hours, 1), 72) * 60,
              });
            }}
            disabled={busy}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
