'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { ContactApprovalContext } from '@/types';
import {
  fetchContactApprovalContext,
  approveContactApprovalToken,
  rejectContactApprovalToken,
  normalizeContactError,
} from '@/lib/api/services/contact';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Building,
  User,
} from 'lucide-react';

export default function ContactApprovalPage() {
  const params = useParams();
  const token = String(params.token || '');

  const [context, setContext] = React.useState<ContactApprovalContext | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<'pending' | 'approved' | 'rejected' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadContext = React.useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchContactApprovalContext(token);
      setContext(data);
    } catch (err: unknown) {
      const safeMsg = normalizeContactError(err);
      setErrorMessage(safeMsg);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      loadContext();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadContext]);

  const handleApprove = async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await approveContactApprovalToken(token);
      setStatus('approved');
      showToast({
        title: 'Approved Successfully',
        description: 'Temporary contact access grant has been issued to the requester.',
        variant: 'success',
      });
    } catch (err: unknown) {
      const safeMsg = normalizeContactError(err);
      setErrorMessage(safeMsg);
      showToast({ title: 'Approval Failed', description: safeMsg, variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await rejectContactApprovalToken(token);
      setStatus('rejected');
      showToast({
        title: 'Request Declined',
        description: 'You have declined this contact share request.',
        variant: 'info',
      });
    } catch (err: unknown) {
      const safeMsg = normalizeContactError(err);
      setErrorMessage(safeMsg);
      showToast({ title: 'Action Failed', description: safeMsg, variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 flex flex-col items-center justify-center text-center space-y-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading approval request details...</p>
      </main>
    );
  }

  if (status === 'error' || !context) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
        <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Approval Link Invalid or Expired</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          {errorMessage || 'This contact approval link is invalid, already consumed, or has expired.'}
        </p>
      </main>
    );
  }

  if (status === 'approved') {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
        <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Contact Access Approved</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          A temporary, bounded contact access grant was granted for <strong>{context.entityTitle}</strong>.
        </p>
      </main>
    );
  }

  if (status === 'rejected') {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
        <div className="size-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
          <XCircle className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Request Declined</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          You declined the contact share request from {context.requesterDisplayName}.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Contact Share Request</h1>
            <p className="text-xs text-muted-foreground">External Notification Approval Link</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <User className="size-3.5" /> Requester
            </span>
            <span className="font-semibold text-foreground">{context.requesterDisplayName}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Building className="size-3.5" /> Property / Post
            </span>
            <span className="font-semibold text-foreground truncate max-w-[200px]">{context.entityTitle}</span>
          </div>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-muted-foreground space-y-1">
            <span className="font-semibold text-foreground block">Explanation</span>
            <p>{context.explanation}</p>
          </div>

          {context.tokenExpiresAt && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Clock className="size-3" /> Token Expires
              </span>
              <Badge variant="outline" className="text-[10px]">
                {new Date(context.tokenExpiresAt).toLocaleString()}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isSubmitting}
            className="flex-1 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-500/10 h-10"
          >
            <XCircle className="size-4 mr-1.5" /> Decline Request
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-10"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <CheckCircle2 className="size-4 mr-1.5" />
            )}
            Approve Access
          </Button>
        </div>
      </div>
    </main>
  );
}
