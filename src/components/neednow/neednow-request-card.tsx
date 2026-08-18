'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Eye,
  Loader2,
  MapPin,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast';
import { EditRequestDialog } from './edit-request-dialog';
import { useRemainingSeconds } from './use-remaining-time';
import {
  formatBudgetRangePaise,
  formatRemainingTime,
  friendlyNeedNowError,
  NEED_NOW_INTENT_LABELS,
  NEED_NOW_STATUS_LABELS,
  PREFERRED_ROOM_TYPE_LABELS,
  pauseRequest,
  resumeRequest,
  fulfilRequest,
  renewRequest,
  removeRequest,
  publishRequest,
} from '@/lib/api/services/neednow';
import { STAY_DURATION_LABELS } from '@/lib/api/services/neednow';
import { NeedNowRequest } from '@/types';

export interface NeedNowRequestCardProps {
  request: NeedNowRequest;
  onChanged?: () => void;
}

const EDITABLE_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED'];

export function NeedNowRequestCard({ request, onChanged }: NeedNowRequestCardProps) {
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const remaining = useRemainingSeconds(request.expiresAt);
  const timeLabel = formatRemainingTime(remaining ?? request.remainingSeconds, request.status);

  const runAction = async (action: string, fn: () => Promise<unknown>, successTitle: string) => {
    setBusyAction(action);
    try {
      await fn();
      showToast({ title: successTitle, variant: 'success' });
      onChanged?.();
    } catch (err) {
      showToast({ title: 'Action failed', description: friendlyNeedNowError(err), variant: 'error' });
    } finally {
      setBusyAction(null);
    }
  };

  const busy = (action: string) => busyAction === action;

  const status = request.status;
  const isEditable = EDITABLE_STATUSES.includes(status);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Summary */}
        <Link href={`/need-now/${request.id}`} className="min-w-0 flex-1 space-y-2 group">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs text-muted-foreground">
              {status === 'ACTIVE' ? timeLabel : NEED_NOW_STATUS_LABELS[status]}
            </span>
          </div>
          <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
            {NEED_NOW_INTENT_LABELS[request.intentType]}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="size-3.5 text-primary/70 shrink-0" />
              <span className="truncate">{request.location.name}</span>
            </span>
            <span className="font-semibold text-foreground">
              {formatBudgetRangePaise(request.budget.minimumPaise, request.budget.maximumPaise)}
              <span className="font-normal text-muted-foreground">/mo</span>
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5 text-primary/70" />
              {request.moveInDate || 'Flexible move-in'}
            </span>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          {status === 'DRAFT' && (
            <Button
              size="sm"
              disabled={busy('publish')}
              onClick={() => runAction('publish', () => publishRequest(request.id), 'Requirement is live for 24 hours')}
              className="gap-1.5 rounded-xl font-semibold"
            >
              {busy('publish') ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Publish
            </Button>
          )}

          {isEditable && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5 rounded-xl">
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}

          {status === 'ACTIVE' && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy('pause')}
              onClick={() => runAction('pause', () => pauseRequest(request.id), 'Requirement paused')}
              className="gap-1.5 rounded-xl"
            >
              {busy('pause') ? <Loader2 className="size-3.5 animate-spin" /> : <Pause className="size-3.5" />}
              Pause
            </Button>
          )}

          {status === 'PAUSED' && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy('resume')}
              onClick={() => runAction('resume', () => resumeRequest(request.id), 'Requirement resumed')}
              className="gap-1.5 rounded-xl"
            >
              {busy('resume') ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              Resume
            </Button>
          )}

          {(status === 'ACTIVE' || status === 'PAUSED') && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy('fulfil')}
              onClick={() => runAction('fulfil', () => fulfilRequest(request.id), 'Marked as fulfilled')}
              className="gap-1.5 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              {busy('fulfil') ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Mark fulfilled
            </Button>
          )}

          {(status === 'EXPIRED' || status === 'FULFILLED') && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy('renew')}
              onClick={() => runAction('renew', () => renewRequest(request.id), 'Requirement renewed for 24 hours')}
              className="gap-1.5 rounded-xl"
            >
              {busy('renew') ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              Renew
            </Button>
          )}

          <Link href={`/need-now/${request.id}`}>
            <Button size="sm" variant="ghost" className="gap-1.5 rounded-xl text-muted-foreground">
              <Eye className="size-3.5" />
              View
            </Button>
          </Link>

          {status !== 'REMOVED' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRemoveOpen(true)}
              className="gap-1.5 rounded-xl text-destructive hover:bg-destructive/10"
              aria-label={`Remove ${NEED_NOW_INTENT_LABELS[request.intentType]} requirement`}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {request.preferredRoomTypes && request.preferredRoomTypes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {request.preferredRoomTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-[11px]">
              {PREFERRED_ROOM_TYPE_LABELS[type]}
            </Badge>
          ))}
          <Badge variant="secondary" className="text-[11px]">
            {STAY_DURATION_LABELS[request.stayDurationType]}
          </Badge>
        </div>
      )}

      <EditRequestDialog
        request={request}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onChanged ? () => onChanged() : () => undefined}
      />

      <ConfirmDialog
        isOpen={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => {
          setRemoveOpen(false);
          return runAction('remove', () => removeRequest(request.id), 'Requirement removed');
        }}
        title="Remove this requirement?"
        description="Removing hides it from everyone, including you. This cannot be undone."
        confirmLabel="Remove"
        isDestructive
        isLoading={busy('remove')}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: NeedNowRequest['status'] }) {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success" className="gap-1">Active</Badge>;
    case 'DRAFT':
      return <Badge variant="secondary" className="gap-1">Draft</Badge>;
    case 'PAUSED':
      return <Badge variant="warning" className="gap-1">Paused</Badge>;
    case 'FULFILLED':
      return <Badge variant="info" className="gap-1">Fulfilled</Badge>;
    case 'EXPIRED':
      return <Badge variant="outline" className="gap-1">Expired</Badge>;
    case 'REMOVED':
      return <Badge variant="destructive" className="gap-1">Removed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
