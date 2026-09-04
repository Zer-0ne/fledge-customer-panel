'use client';

import * as React from 'react';
import { RoommatePost } from '@/types';
import { submitRoommateInterest } from '@/lib/api/services/roommates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/toast';
import { Sparkles, Send } from 'lucide-react';
import { LimitReachedDialog, type LimitFailure } from '@/components/limits/limit-reached-dialog';
import { parseLimitError } from '@/lib/limits/unverified-limits';

export interface RoommateInterestDialogProps {
  post: RoommatePost | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function RoommateInterestDialog({
  post,
  isOpen,
  onClose,
  onSubmitted,
}: RoommateInterestDialogProps) {
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [limitFailure, setLimitFailure] = React.useState<LimitFailure | null>(null);

  React.useEffect(() => {
    if (post) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(`Hi! I saw your post "${post.title}" looking for a roommate. I would love to connect!`);
    } else {
      setMessage('');
    }
  }, [post]);

  if (!post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitRoommateInterest(post.id, message.trim());
      showToast({
        title: 'Interest Expressed!',
        description: `Your request has been sent to the post creator.`,
        variant: 'default',
      });
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err: unknown) {
      const parsed = parseLimitError(err);
      if (parsed && parsed.kind === 'contacts') {
        onClose();
        setLimitFailure({ kind: 'contacts', current: parsed.current, max: parsed.max });
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Could not submit interest';
        showToast({
          title: 'Submission Failed',
          description: errorMsg,
          variant: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <Sparkles className="size-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Connect with Roommate
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            Send a message to introduce yourself and express interest in this roommate post.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs space-y-1">
            <p className="font-semibold text-foreground">{post.title}</p>
            <p className="text-muted-foreground line-clamp-1">
              {post.user?.displayName ? `By ${post.user.displayName}` : 'Roommate seeking post'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Introductory Message</label>
            <Textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell them a bit about yourself, course/occupation, and move-in timeline..."
              className="rounded-xl resize-none text-sm"
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="rounded-xl gap-1.5 font-medium"
            >
              <Send className="size-4" />
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <LimitReachedDialog failure={limitFailure} onClose={() => setLimitFailure(null)} />
    </>
  );
}
