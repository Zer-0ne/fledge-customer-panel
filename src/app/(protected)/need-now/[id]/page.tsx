'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  Bookmark,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  MapPin,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Timer,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrustBadge } from '@/components/trust/trust-badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import { UserAvatar } from '@/components/neednow/user-avatar';
import { useRemainingSeconds } from '@/components/neednow/use-remaining-time';
import { EditRequestDialog } from '@/components/neednow/edit-request-dialog';
import { NeedNowResponseRow } from '@/components/neednow/neednow-response-row';
import {
  getRequest,
  requestResponses,
  pauseRequest,
  resumeRequest,
  fulfilRequest,
  renewRequest,
  removeRequest,
  saveRequest,
  unsaveRequest,
  createResponse,
  fetchMyListings,
  friendlyNeedNowError,
  formatBudgetRangePaise,
  formatDistanceMeters,
  formatRemainingTime,
  NEED_NOW_INTENT_LABELS,
  NEED_NOW_VISIBILITY_LABELS,
  PREFERRED_ROOM_TYPE_LABELS,
  STAY_DURATION_LABELS,
  FURNISHING_LABELS,
  OCCUPANCY_LABELS,
  STUDENT_WORKING_LABELS,
  FOOD_PREFERENCE_LABELS,
  SLEEP_SCHEDULE_LABELS,
  CLEANLINESS_LABELS,
} from '@/lib/api/services/neednow';
import { NeedNowRequest, NeedNowResponse, Listing } from '@/types';

export default function NeedNowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const id = React.use(params).id;

  const [request, setRequest] = React.useState<NeedNowRequest | null>(null);
  const [responses, setResponses] = React.useState<NeedNowResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [offerOpen, setOfferOpen] = React.useState(false);
  // const [joinOpen, setJoinOpen] = React.useState(false); // JOIN_SEARCH disabled — not needed yet

  const load = React.useCallback(async () => {
    try {
      const req = await getRequest(id);
      setRequest(req);
      if (req.viewerRelationship.isOwner) {
        const resps = await requestResponses(id);
        setResponses(resps);
      } else {
        setResponses([]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this requirement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const remaining = useRemainingSeconds(request?.expiresAt);
  const timeLabel = request ? formatRemainingTime(remaining ?? request.remainingSeconds, request.status) : '';

  const runOwnerAction = async (action: string, fn: () => Promise<unknown>, successTitle: string) => {
    setBusyAction(action);
    try {
      await fn();
      showToast({ title: successTitle, variant: 'success' });
      await load();
    } catch (err) {
      showToast({ title: 'Action failed', description: friendlyNeedNowError(err), variant: 'error' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleSave = async () => {
    if (!request) return;
    const wasSaved = request.viewerRelationship.isSaved;
    setBusyAction('save');
    setRequest((prev) =>
      prev
        ? { ...prev, viewerRelationship: { ...prev.viewerRelationship, isSaved: !wasSaved } }
        : prev
    );
    try {
      if (wasSaved) {
        await unsaveRequest(request.id);
        showToast({ title: 'Removed from saved', variant: 'success' });
      } else {
        await saveRequest(request.id);
        showToast({ title: 'Requirement saved', description: 'You can find it again later.', variant: 'success' });
      }
    } catch (err) {
      setRequest((prev) =>
        prev
          ? { ...prev, viewerRelationship: { ...prev.viewerRelationship, isSaved: wasSaved } }
          : prev
      );
      showToast({ title: 'Could not update saved state', description: friendlyNeedNowError(err), variant: 'error' });
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 space-y-4">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6">
          <ErrorState
            title="Could not load this requirement"
            message={error ?? 'Requirement not found'}
            onRetry={() => {
              setLoading(true);
              void load();
            }}
          />
        </div>
      </div>
    );
  }

  const rel = request.viewerRelationship;
  const isEditable = ['DRAFT', 'ACTIVE', 'PAUSED'].includes(request.status);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {/* Seeker summary */}
        <div className="flex items-center gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-xs">
          <UserAvatar name={request.owner.displayName} avatarUrl={request.owner.avatarUrl} verified={request.owner.verified} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-base font-bold text-foreground">
              {request.owner.displayName}
              <TrustBadge userId={request.owner.id} size={16} />
              {request.owner.verified && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="size-3" />
                  Verified
                </Badge>
              )}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Looking for {NEED_NOW_INTENT_LABELS[request.intentType].toLowerCase()} · posted{' '}
              {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-sm font-bold ${request.status === 'ACTIVE' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              {timeLabel}
            </p>
            <p className="text-[11px] text-muted-foreground">{NEED_NOW_VISIBILITY_LABELS[request.visibility]}</p>
          </div>
        </div>

        {/* State banners */}
        {rel.isBlocked && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
            <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">
              You cannot respond to or interact with this requirement.
            </p>
          </div>
        )}

        {request.status === 'EXPIRED' && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              This requirement has expired. The seeker can renew it for another 24 hours.
            </p>
          </div>
        )}

        {request.status === 'REMOVED' && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">This requirement was removed by its owner.</p>
          </div>
        )}

        {request.status === 'FULFILLED' && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              The seeker has marked this requirement as fulfilled.
            </p>
          </div>
        )}

        {/* Owner / viewer actions */}
        {!rel.isBlocked && (
          <div className="flex flex-wrap items-center gap-2">
            {rel.isOwner ? (
              <>
                {isEditable && (
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5 rounded-xl">
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                )}
                {request.status === 'ACTIVE' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyAction === 'pause'}
                    onClick={() => runOwnerAction('pause', () => pauseRequest(request.id), 'Requirement paused')}
                    className="gap-1.5 rounded-xl"
                  >
                    {busyAction === 'pause' ? <Loader2 className="size-3.5 animate-spin" /> : <Pause className="size-3.5" />}
                    Pause
                  </Button>
                )}
                {request.status === 'PAUSED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyAction === 'resume'}
                    onClick={() => runOwnerAction('resume', () => resumeRequest(request.id), 'Requirement resumed')}
                    className="gap-1.5 rounded-xl"
                  >
                    {busyAction === 'resume' ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                    Resume
                  </Button>
                )}
                {(request.status === 'ACTIVE' || request.status === 'PAUSED') && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyAction === 'fulfil'}
                    onClick={() => runOwnerAction('fulfil', () => fulfilRequest(request.id), 'Marked as fulfilled')}
                    className="gap-1.5 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    {busyAction === 'fulfil' ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                    Mark fulfilled
                  </Button>
                )}
                {(request.status === 'EXPIRED' || request.status === 'FULFILLED') && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyAction === 'renew'}
                    onClick={() => runOwnerAction('renew', () => renewRequest(request.id), 'Requirement renewed for 24 hours')}
                    className="gap-1.5 rounded-xl"
                  >
                    {busyAction === 'renew' ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                    Renew
                  </Button>
                )}
                {responses.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => document.getElementById('responses')?.scrollIntoView({ behavior: 'smooth' })}
                    className="gap-1.5 rounded-xl text-muted-foreground"
                  >
                    <Eye className="size-3.5" />
                    View responses ({responses.length})
                  </Button>
                )}
                {request.status !== 'REMOVED' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRemoveOpen(true)}
                    className="gap-1.5 rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </>
            ) : (
              <>
                {rel.canOfferListing && (
                  <Button size="sm" onClick={() => setOfferOpen(true)} className="gap-1.5 rounded-xl font-semibold">
                    <Building2 className="size-3.5" />
                    Offer a listing
                  </Button>
                )}
                {/* JOIN_SEARCH disabled — not needed yet
                {rel.canJoinSearch && (
                  <Button size="sm" variant="outline" onClick={() => setJoinOpen(true)} className="gap-1.5 rounded-xl">
                    <Users className="size-3.5" />
                    Join this search
                  </Button>
                )}
                */}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyAction === 'save'}
                  onClick={() => void handleToggleSave()}
                  className="gap-1.5 rounded-xl text-muted-foreground"
                  aria-pressed={rel.isSaved}
                >
                  {busyAction === 'save' ? <Loader2 className="size-3.5 animate-spin" /> : <Bookmark className={`size-3.5 ${rel.isSaved ? 'fill-current' : ''}`} />}
                  {rel.isSaved ? 'Saved' : 'Save'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Requirement details */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" />
            {NEED_NOW_INTENT_LABELS[request.intentType]}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3.5 text-primary/70" />
                Location
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {request.location.name}
                {request.location.distanceMeters !== null && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {formatDistanceMeters(request.location.distanceMeters)}
                  </span>
                )}
                <span className="block text-[11px] font-normal text-muted-foreground">
                  Search radius: {request.radiusMeters >= 1000 ? `${(request.radiusMeters / 1000).toFixed(0)} km` : `${request.radiusMeters} m`}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="size-3.5 text-primary/70" />
                Budget
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatBudgetRangePaise(request.budget.minimumPaise, request.budget.maximumPaise)}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="size-3.5 text-primary/70" />
                Move-in
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {request.moveInDate
                  ? new Date(`${request.moveInDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Flexible'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <Timer className="size-3.5 text-primary/70" />
                Stay duration
              </dt>
              <dd className="mt-1 font-medium text-foreground">{STAY_DURATION_LABELS[request.stayDurationType]}</dd>
            </div>
          </dl>

          {request.preferredRoomTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {request.preferredRoomTypes.map((type) => (
                <Badge key={type} variant="secondary" className="text-[11px]">
                  {PREFERRED_ROOM_TYPE_LABELS[type]}
                </Badge>
              ))}
            </div>
          )}

          {request.preferences && (
            <div className="flex flex-wrap gap-1.5">
              {request.preferences.furnishing && request.preferences.furnishing !== 'ANY' && (
                <Badge variant="outline" className="text-[11px]">{FURNISHING_LABELS[request.preferences.furnishing]}</Badge>
              )}
              {request.preferences.occupancy && request.preferences.occupancy !== 'ANY' && (
                <Badge variant="outline" className="text-[11px]">{OCCUPANCY_LABELS[request.preferences.occupancy]}</Badge>
              )}
              {request.preferences.studentOrProfessional && request.preferences.studentOrProfessional !== 'ANY' && (
                <Badge variant="outline" className="text-[11px]">{STUDENT_WORKING_LABELS[request.preferences.studentOrProfessional]}</Badge>
              )}
              {request.preferences.foodPreference && request.preferences.foodPreference !== 'ANY' && (
                <Badge variant="outline" className="text-[11px]">{FOOD_PREFERENCE_LABELS[request.preferences.foodPreference]}</Badge>
              )}
              {request.preferences.sleepSchedule && (
                <Badge variant="outline" className="text-[11px]">Sleep: {SLEEP_SCHEDULE_LABELS[request.preferences.sleepSchedule]}</Badge>
              )}
              {request.preferences.cleanliness && (
                <Badge variant="outline" className="text-[11px]">Cleanliness: {CLEANLINESS_LABELS[request.preferences.cleanliness]}</Badge>
              )}
              {request.preferences.smokingOk && <Badge variant="outline" className="text-[11px]">Non-smoker home</Badge>}
              {request.preferences.petsOk && <Badge variant="outline" className="text-[11px]">Pets allowed</Badge>}
              {request.preferences.visitorsOk && <Badge variant="outline" className="text-[11px]">Visitors allowed</Badge>}
            </div>
          )}

          {request.description && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">About this need</p>
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{request.description}</p>
            </div>
          )}

          {request.areas.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Also looking in</p>
              <ul className="flex flex-wrap gap-1.5">
                {request.areas.map((area) => (
                  <li key={area.id}>
                    <Badge variant="outline" className="text-[11px]">{area.locationName}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Responses (owner only) */}
        {rel.isOwner && (
          <div id="responses" className="space-y-4 scroll-mt-24">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Responses
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">{responses.length}</span>
            </h2>
            {responses.length > 0 ? (
              <div className="space-y-4">
                {responses.map((response) => (
                  <NeedNowResponseRow key={response.id} response={response} onChanged={() => void load()} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No responses yet"
                description="When students respond to your requirement, they will appear here."
              />
            )}
          </div>
        )}

        {!rel.isOwner && rel.existingResponseId && (
          <p className="text-xs text-muted-foreground text-center">
            You have already responded to this requirement.
          </p>
        )}
      </div>

      <EditRequestDialog
        request={request}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        isOpen={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => {
          setRemoveOpen(false);
          return runOwnerAction('remove', () => removeRequest(request.id), 'Requirement removed');
        }}
        title="Remove this requirement?"
        description="Removing hides it from everyone, including you. This cannot be undone."
        confirmLabel="Remove"
        isDestructive
        isLoading={busyAction === 'remove'}
      />

      <OfferListingDialog
        open={offerOpen}
        onOpenChange={setOfferOpen}
        requestId={request.id}
        onResponded={() => void load()}
      />

      {/* JOIN_SEARCH disabled — not needed yet
      <JoinSearchDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        requestId={request.id}
        onResponded={() => void load()}
      />
      */}
    </div>
  );
}

// ─── Offer listing dialog ───────────────────────────────────────────────────

function OfferListingDialog({
  open,
  onOpenChange,
  requestId,
  onResponded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onResponded: () => void;
}) {
  const [listings, setListings] = React.useState<Listing[] | null>(null);
  const [selectedListingId, setSelectedListingId] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListings(null);
    setSelectedListingId('');
    setMessage('');
    let cancelled = false;
    (async () => {
      const mine = await fetchMyListings();
      if (!cancelled) {
        setListings(mine);
        setSelectedListingId(mine[0]?.id ?? '');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedListingId) {
      showToast({ title: 'Choose a listing', description: 'Pick which listing you want to offer.', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await createResponse(requestId, {
        responseType: 'OFFER_LISTING',
        listingId: selectedListingId,
        message: message.trim() || undefined,
      });
      showToast({ title: 'Listing offered', description: 'The seeker will see your offer.', variant: 'success' });
      onResponded();
      onOpenChange(false);
    } catch (err) {
      showToast({ title: 'Could not send offer', description: friendlyNeedNowError(err), variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !submitting && onOpenChange(false)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Offer a listing</DialogTitle>
          <DialogDescription>
            The seeker will see your listing and can accept or decline your offer.
          </DialogDescription>
        </DialogHeader>

        {listings === null ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No listings to offer"
            description="You don't have any published listings yet. Publish a listing first, then come back to offer it."
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2" role="radiogroup" aria-label="Choose a listing">
              {listings.map((listing) => {
                const selected = selectedListingId === listing.id;
                return (
                  <button
                    key={listing.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedListingId(listing.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      selected ? 'border-primary/60 bg-primary/5' : 'border-border/60 bg-card hover:border-border'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{listing.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(listing.monthlyRentPaise / 100)} ₹/mo
                      </span>
                    </span>
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`}
                      aria-hidden
                    >
                      {selected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="offer-message">
                Message <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="offer-message"
                rows={3}
                maxLength={1000}
                placeholder="e.g. My flat is 10 minutes from your area, fully furnished…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-xl resize-none text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || !selectedListingId} className="rounded-xl gap-2">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? 'Offering…' : 'Offer listing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Join search dialog ─────────────────────────────────────────────────────
// JOIN_SEARCH disabled — not needed yet. Kept for future re-enable.
/*
function JoinSearchDialog({
  open,
  onOpenChange,
  requestId,
  onResponded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onResponded: () => void;
}) {
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage('');
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await createResponse(requestId, {
        responseType: 'JOIN_SEARCH',
        message: message.trim() || undefined,
      });
      showToast({ title: 'Request sent', description: 'The seeker will see your interest.', variant: 'success' });
      onResponded();
      onOpenChange(false);
    } catch (err) {
      showToast({ title: 'Could not join', description: friendlyNeedNowError(err), variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !submitting && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join this search</DialogTitle>
          <DialogDescription>
            The seeker is looking for flatmates. Let them know why you would be a
            good fit for their search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="join-message">
            Message <span className="text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id="join-message"
            rows={3}
            maxLength={1000}
            placeholder="e.g. I am also looking to move in mid-month with a similar budget…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded-xl resize-none text-sm"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting} className="rounded-xl gap-2">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? 'Sending…' : 'Send request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
*/
