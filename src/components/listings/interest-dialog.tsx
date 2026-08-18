'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { submitListingInterest } from '@/lib/api/services/discovery';
import { showToast } from '@/components/ui/toast';
import { Send, Loader2 } from 'lucide-react';
import { Listing } from '@/types';

export interface InterestDialogProps {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InterestDialog({
  listing,
  open,
  onOpenChange,
  onSuccess,
}: InterestDialogProps) {
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage('Hi! I am interested in this flat listing. Could we connect?');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    setIsSubmitting(true);
    try {
      await submitListingInterest(listing.id, message.trim());
      showToast({
        title: 'Interest Submitted!',
        description: 'The property manager has been notified of your interest.',
        variant: 'success',
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit interest';
      showToast({
        title: 'Error',
        description: errorMsg,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Express Interest</DialogTitle>
          <DialogDescription>
            Send a message regarding &quot;{listing?.title}&quot; to connect with the owner or manager.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="interest-message" className="text-sm font-medium text-foreground">
              Your Message
            </label>
            <Textarea
              id="interest-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself and share any questions..."
              rows={4}
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !message.trim()} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send Interest
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
