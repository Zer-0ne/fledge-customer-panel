'use client';

import * as React from 'react';
import {
  ContactShareRequest,
  ContactAccessGrantSummary,
  RevealedContact,
} from '@/types';
import {
  createContactShareRequest,
  fetchContactShareRequests,
  fetchContactShareRequestDetail,
  approveContactShareRequest,
  rejectContactShareRequest,
  revokeContactShareRequest,
  fetchRevealedContact,
  revokeContactAccessGrant,
  normalizeContactError,
} from '@/lib/api/services/contact';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import {
  PhoneCall,
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Eye,
  Lock,
  Ban,
  RefreshCw,
} from 'lucide-react';

export interface ContactShareCardProps {
  conversationId: string;
  currentUserId?: string;
  listingInterestId?: string;
  roommateInterestId?: string;
  housingResponseId?: string;
  initialRequest?: ContactShareRequest | null;
  grantId?: string | null;
}

export function ContactShareCard({
  conversationId,
  currentUserId,
  listingInterestId,
  roommateInterestId,
  housingResponseId,
  initialRequest = null,
  grantId: initialGrantId = null,
}: ContactShareCardProps) {
  const [request, setRequest] = React.useState<ContactShareRequest | null>(initialRequest);
  const [grant, setGrant] = React.useState<ContactAccessGrantSummary | null>(
    initialGrantId ? ({ id: initialGrantId, status: 'approved', contactSource: 'OWNER', expiresAt: '', maximumViewCount: 3 } as ContactAccessGrantSummary) : null
  );
  // PRIVACY MANDATE: revealed phone number is kept ONLY in component state
  const [revealedContact, setRevealedContact] = React.useState<RevealedContact | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRevealing, setIsRevealing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [remainingTime, setRemainingTime] = React.useState<string | null>(null);
  const [isDisabledByPlatform, setIsDisabledByPlatform] = React.useState(false);

  // Stub grants (id only, no expiry) resolve to live status once — otherwise
  // a stale approved stub renders an active card with a phantom timer.
  React.useEffect(() => {
    if (!grant || grant.expiresAt !== '' || !request?.id) return;
    let live = true;
    fetchContactShareRequestDetail(request.id)
      .then((detail) => { if (live && detail.accessGrant) setGrant(detail.accessGrant); })
      .catch(() => {});
    return () => { live = false; };
  }, [grant, request?.id]);

  // Sync initial request
  React.useEffect(() => {
    if (initialRequest) {
      const timer = window.setTimeout(() => setRequest(initialRequest), 0);
      return () => window.clearTimeout(timer);
    }
  }, [initialRequest]);

  // Auto-fetch active request/grant from backend for this conversation/context
  React.useEffect(() => {
    if (initialRequest) return;
    let isMounted = true;

    async function loadExistingRequest() {
      try {
        const list = await fetchContactShareRequests();
        if (!isMounted) return;
        const matching = list.find((r) => {
          if (listingInterestId && r.listingInterestId === listingInterestId) return true;
          if (roommateInterestId && r.roommateInterestId === roommateInterestId) return true;
          if (housingResponseId && r.housingResponseId === housingResponseId) return true;
          if (conversationId && r.conversationId === conversationId) return true;
          return false;
        });

        if (matching) {
          setRequest(matching);
          if (matching.status === 'approved' && matching.accessGrant) {
            setGrant(matching.accessGrant);
          }
        }
      } catch (err: unknown) {
        const msg = String((err as { message?: string })?.message || err);
        if (msg.includes('Contact sharing is disabled') || (err as { status?: number })?.status === 403) {
          if (isMounted) setIsDisabledByPlatform(true);
        }
      }
    }

    loadExistingRequest();
    return () => {
      isMounted = false;
    };
  }, [initialRequest, listingInterestId, roommateInterestId, housingResponseId, conversationId]);

  // Mandatory privacy cleanup: clear revealed phone on unmount
  React.useEffect(() => {
    return () => {
      setRevealedContact(null);
    };
  }, []);

  // Expiry countdown timer based on server timestamp
  React.useEffect(() => {
    const expiresAtStr = revealedContact?.expiresAt || grant?.expiresAt;
    if (!expiresAtStr) {
      const timer = window.setTimeout(() => setRemainingTime(null), 0);
      return () => window.clearTimeout(timer);
    }

    const updateTimer = () => {
      const expTime = new Date(expiresAtStr).getTime();
      const now = Date.now();
      const diffMs = expTime - now;

      if (diffMs <= 0) {
        setRemainingTime('Expired');
        setRevealedContact(null);
        return;
      }

      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      if (mins > 60) {
        const hours = Math.floor(mins / 60);
        setRemainingTime(`${hours}h ${mins % 60}m`);
      } else {
        setRemainingTime(`${mins}m ${secs}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [revealedContact, grant]);

  // Request contact share
  const handleCreateRequest = async () => {
    if (!listingInterestId && !roommateInterestId && !housingResponseId) {
      showToast({
        title: 'Action Unavailable',
        description: 'An accepted response or interest is required to request contact details.',
        variant: 'error',
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = housingResponseId
        ? { housingResponseId }
        : listingInterestId
          ? { listingInterestId }
          : { roommateInterestId: roommateInterestId! };
      const res = await createContactShareRequest(payload);
      setRequest(res);
      showToast({
        title: 'Request Sent',
        description: 'Contact share request sent to the owner.',
        variant: 'success',
      });
    } catch (err: unknown) {
      const safeMsg = normalizeContactError(err);
      showToast({
        title: 'Request Failed',
        description: safeMsg,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fresh request after expiry: same context, resets state to pending.
  const handleRequestAgain = async () => {
    const ctxListingId = request?.listingInterestId ?? listingInterestId;
    const ctxRoommateId = request?.roommateInterestId ?? roommateInterestId;
    const ctxHousingId = request?.housingResponseId ?? housingResponseId;
    if (!ctxListingId && !ctxRoommateId && !ctxHousingId) {
      showToast({
        title: 'Action Unavailable',
        description: 'An accepted response or interest is required to request contact details.',
        variant: 'error',
      });
      return;
    }
    setIsLoading(true);
    try {
      const payload = ctxHousingId
        ? { housingResponseId: ctxHousingId }
        : ctxListingId
          ? { listingInterestId: ctxListingId }
          : { roommateInterestId: ctxRoommateId! };
      const res = await createContactShareRequest(payload);
      setRequest(res);
      setGrant(res.accessGrant ?? null);
      setRevealedContact(null);
      showToast({
        title: 'Request Sent',
        description: 'Fresh contact share request sent to the owner.',
        variant: 'success',
      });
    } catch (err: unknown) {
      showToast({
        title: 'Request Failed',
        description: normalizeContactError(err),
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Approve request
  const handleApprove = async () => {
    if (!request?.id) return;
    setIsLoading(true);
    try {
      const grantSummary = await approveContactShareRequest(request.id);
      setGrant(grantSummary);
      setRequest({ ...request, status: 'approved' });
      showToast({
        title: 'Contact Share Approved',
        description: 'Temporary contact access grant issued.',
        variant: 'success',
      });
    } catch (err: unknown) {
      const safeMsg = normalizeContactError(err);
      showToast({
        title: 'Approval Failed',
        description: safeMsg,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reject request
  const handleReject = async () => {
    if (!request?.id) return;
    setIsLoading(true);
    try {
      const updated = await rejectContactShareRequest(request.id);
      setRequest(updated);
      showToast({
        title: 'Request Declined',
        description: 'You declined the contact share request.',
        variant: 'info',
      });
    } catch (err: unknown) {
      const safeMsg = normalizeContactError(err);
      showToast({
        title: 'Action Failed',
        description: safeMsg,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke pending/approved request
  const handleRevokeRequest = async () => {
    if (!request?.id) return;
    setIsLoading(true);
    try {
      const updated = await revokeContactShareRequest(request.id);
      setRequest(updated);
      setGrant(null);
      setRevealedContact(null);
      showToast({
        title: 'Request Revoked',
        description: 'Contact share request revoked.',
        variant: 'info',
      });
    } catch (err: unknown) {
      const safeMsg = normalizeContactError(err);
      showToast({
        title: 'Action Failed',
        description: safeMsg,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Explicitly fetch unmasked contact number
  const handleRevealContact = async () => {
    // Never use the REQUEST id as a grant id (backend looks up grants only) —
    // resolve the real grant id from the request detail when missing.
    let activeGrantId = grant?.id ?? null;
    if (!activeGrantId && request?.status === 'approved' && request.id) {
      try {
        const detail = await fetchContactShareRequestDetail(request.id);
        activeGrantId = detail.accessGrant?.id ?? null;
        if (detail.accessGrant) setGrant(detail.accessGrant);
      } catch {
        activeGrantId = null;
      }
    }
    if (!activeGrantId) {
      showToast({ title: 'Not ready yet', description: 'Grant is not available — ask for a fresh share.', variant: 'error' });
      return;
    }

    setIsRevealing(true);
    try {
      const data = await fetchRevealedContact(activeGrantId);
      setRevealedContact(data);
      showToast({
        title: 'Contact Number Revealed',
        description: 'Number visible in memory for this session.',
        variant: 'success',
      });
    } catch (err: unknown) {
      const safeMsg = normalizeContactError(err);
      if (safeMsg.includes('Expired') || safeMsg.includes('403')) {
        setGrant(null);
        setRequest((prev) => (prev ? { ...prev, status: 'expired' } : null));
        setRevealedContact(null);
      }
      showToast({
        title: 'Contact Reveal Failed',
        description: safeMsg,
        variant: 'error',
      });
    } finally {
      setIsRevealing(false);
    }
  };

  // Revoke grant
  const handleRevokeGrant = async () => {
    if (!grant?.id) return;
    setIsLoading(true);
    try {
      await revokeContactAccessGrant(grant.id);
      setGrant(null);
      setRevealedContact(null);
      if (request) setRequest({ ...request, status: 'revoked' });
      showToast({
        title: 'Grant Revoked',
        description: 'Access grant revoked successfully.',
        variant: 'info',
      });
    } catch (err: unknown) {
      const safeMsg = normalizeContactError(err);
      if (safeMsg.includes('disabled')) {
        setIsDisabledByPlatform(true);
      }
      showToast({
        title: 'Request Failed',
        description: safeMsg,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    showToast({
      title: 'Copied',
      description: 'Phone number copied to clipboard.',
      variant: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const isIncoming = request && request.recipientId === currentUserId;
  const isRequester = request && request.requesterId === currentUserId;

  // 0. Disabled State by Platform / Owner Preference
  if (isDisabledByPlatform) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <Lock className="size-4 text-muted-foreground shrink-0" />
          <div>
            <h4 className="font-semibold text-foreground text-xs">In-App Chat Only</h4>
            <p className="text-[11px] text-muted-foreground">
              Direct phone contact sharing is currently disabled by the owner or platform.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 bg-background">
          Chat Only
        </Badge>
      </div>
    );
  }

  // 1. Initial State: No Request
  if (!request && !grant) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Share2 className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Controlled Contact Fallback</h4>
            <p className="text-[11px] text-muted-foreground">
              Request direct phone contact when chatting is insufficient.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateRequest}
          disabled={isLoading}
          className="shrink-0 gap-1.5 text-xs border-primary/30 hover:bg-primary/10"
        >
          {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" />}
          Request Phone Number
        </Button>
      </div>
    );
  }

  // 2. Grant Active or Approved Request State
  // Sync rule: revoked/time-expired/views-exhausted grants render the expired
  // state (no timer, no View button) instead of a live-looking active card.
  const grantLive = grant?.status === 'approved' && grant.remainingViews !== 0;
  // Owner side never shows the requester's view-expiry: views consumed means
  // the requester saw the number (success), not an expired access.
  const grantTimeExpired = grant?.status === 'expired' && (grant.remainingViews ?? 1) > 0;
  if (isIncoming && grant && grant.status !== 'revoked' && !grantTimeExpired) {
    const consumed = grant.status === 'expired';
    return (
      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
            <ShieldCheck className="size-4 shrink-0" />
            Number {consumed ? 'viewed by requester' : 'shared with requester'}
          </div>
          {!consumed ? (
            <Button variant="ghost" size="sm" onClick={handleRevokeGrant} disabled={isLoading} className="text-xs h-7 text-rose-600 hover:bg-rose-500/10">
              <Ban className="size-3 mr-1" /> Revoke
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {consumed ? 'The requester has seen your number. Nothing more to do.' : 'The requester can view your number once. Revoke anytime to cancel access.'}
        </p>
      </div>
    );
  }
  if (grant?.status === 'expired' || grant?.status === 'revoked' || (request?.status === 'approved' && !grantLive)) {
    return (
      <div className="p-4 rounded-xl border border-border/60 bg-muted/30 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold text-xs">
          <ShieldCheck className="size-4 shrink-0" />
          Temporary Contact Access {grant?.status === 'revoked' ? 'Revoked' : 'Expired'}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {grant?.status === 'revoked' ? 'The owner revoked this access.' : 'Views are used up or the time limit passed. Send a fresh request to see the number again.'}
        </p>
        {!isIncoming ? (
        <Button size="sm" variant="outline" disabled={isLoading} onClick={handleRequestAgain} className="text-xs h-8 gap-1.5">
          {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Request again
        </Button>
        ) : null}
      </div>
    );
  }
  if (grantLive || request?.status === 'approved') {
    const contactSource = grant?.contactSource || 'OWNER';
    return (
      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
            <ShieldCheck className="size-4 shrink-0" />
            Temporary Contact Access Granted
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
              {contactSource === 'FALLBACK_CONTACT' ? 'Fallback Contact' : 'Owner Contact'}
            </Badge>
            {remainingTime && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Clock className="size-3" /> {remainingTime}
              </Badge>
            )}
          </div>
        </div>

        {revealedContact ? (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-2 overflow-hidden text-xs">
              <PhoneCall className="size-4 text-emerald-600 shrink-0" />
              <a href={`tel:${revealedContact.phoneNumber}`} className="font-semibold text-foreground hover:underline text-sm truncate">
                {revealedContact.phoneNumber}
              </a>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => copyPhone(revealedContact.phoneNumber)}
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              </Button>
              {isIncoming && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevokeGrant}
                  disabled={isLoading}
                  className="text-xs h-7 text-rose-600 hover:bg-rose-500/10"
                >
                  <Ban className="size-3 mr-1" /> Revoke
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-muted-foreground" />
              <span>Contact details masked until explicit view tap</span>
            </div>
            <Button
              size="sm"
              onClick={handleRevealContact}
              disabled={isRevealing}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isRevealing ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
              View Contact Number
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 3. Incoming Pending Request
  if (request?.status === 'pending' && isIncoming) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="size-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-foreground truncate">
              Contact Share Request Received
            </h4>
            <p className="text-[11px] text-muted-foreground truncate">
              Requester is asking for direct phone contact permission.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={isLoading}
            className="text-xs h-8 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
          >
            <XCircle className="size-3.5 mr-1" />
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isLoading}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5 mr-1" />}
            Approve Access
          </Button>
        </div>
      </div>
    );
  }

  // 4. Outgoing Pending Request
  if (request?.status === 'pending' && isRequester) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="size-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Contact Share Request Sent</h4>
            <p className="text-[11px] text-muted-foreground">
              Waiting for recipient to review and approve access.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
            Pending
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRevokeRequest}
            disabled={isLoading}
            className="text-xs h-7 text-muted-foreground hover:text-rose-600"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // 5. Declined / Revoked / Expired State
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-muted bg-muted/20 text-xs">
      <span className="text-muted-foreground">
        Contact request is <span className="font-semibold text-foreground">{request?.status || 'inactive'}</span>.
      </span>
      <Button variant="ghost" size="sm" onClick={handleCreateRequest} disabled={isLoading} className="text-xs h-7">
        Request Again
      </Button>
    </div>
  );
}
