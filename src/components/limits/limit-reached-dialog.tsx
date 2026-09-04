'use client';

/**
 * Limit-reached dialog — shown when an unverified cap blocks an action.
 * Numbers come from the backend error body / limits endpoint (dynamic),
 * with a Verify CTA into the verification hub.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { limitReachedCopy, type LimitKind } from '@/lib/limits/unverified-limits';

export interface LimitFailure {
  kind: LimitKind;
  current?: number | null;
  max?: number | null;
}

export function LimitReachedDialog({
  failure,
  onClose,
}: {
  failure: LimitFailure | null;
  onClose: () => void;
}) {
  const copy = React.useMemo(
    () => (failure ? limitReachedCopy(failure.kind, { current: failure.current, max: failure.max }) : null),
    [failure],
  );
  const router = useRouter();
  return (
    <Dialog open={failure !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <BadgeCheck className="size-6" />
          </div>
          <DialogTitle className="text-center">{copy?.title ?? 'Limit reached'}</DialogTitle>
          <DialogDescription className="text-center">{copy?.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => { onClose(); router.push('/settings/verify/student'); }}
          >
            Verify Now — it&apos;s free
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
