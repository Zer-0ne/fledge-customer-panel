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
import { reportContent } from '@/lib/api/services/chat';
import { showToast } from '@/components/ui/toast';
import { ShieldAlert, Flag, Loader2 } from 'lucide-react';

export interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'user' | 'listing' | 'roommate_post' | 'message';
  targetId: string;
  targetTitle?: string;
}

const PRESET_REASONS = [
  'Spam, advertising, or unwanted solicitation',
  'Inappropriate or offensive content',
  'Scam, fraud, or suspicious activity',
  'Harassment or disrespectful behavior',
  'Misleading or inaccurate details',
];

export function ReportDialog({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = React.useState<string>(PRESET_REASONS[0]);
  const [customDetail, setCustomDetail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    const finalReason = customDetail.trim()
      ? `${selectedReason}: ${customDetail.trim()}`
      : selectedReason;

    setIsSubmitting(true);
    try {
      await reportContent({
        targetType,
        targetId,
        reason: finalReason,
      });

      showToast({
        title: 'Report Submitted',
        description: 'Thank you for helping keep our community safe. Our moderation team will review this report.',
        variant: 'success',
      });
      onClose();
      setCustomDetail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report. Please try again.';
      showToast({
        title: 'Report Failed',
        description: msg,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedType =
    targetType === 'roommate_post'
      ? 'roommate post'
      : targetType;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert className="size-5 shrink-0" />
            Report {formattedType}
          </DialogTitle>
          <DialogDescription>
            {targetTitle
              ? `You are reporting "${targetTitle}". Please select the issue you encountered.`
              : `Help us keep FlatSystem safe by reporting inappropriate content.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Reason
            </label>
            <div className="space-y-2">
              {PRESET_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer text-xs sm:text-sm transition-colors ${
                    selectedReason === reason
                      ? 'border-red-500/50 bg-red-500/5 dark:bg-red-500/10 font-medium'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-red-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Context (Optional)
            </label>
            <Textarea
              placeholder="Provide any additional details to help our moderation team..."
              value={customDetail}
              onChange={(e) => setCustomDetail(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none text-xs sm:text-sm"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Flag className="size-4" />
                  Submit Report
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
