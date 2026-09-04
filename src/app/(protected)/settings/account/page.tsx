'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { deleteAccount } from '@/lib/api/services/account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast';
import { AlertTriangle } from 'lucide-react';

const CONFIRM_PHRASE = 'DELETE';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [confirmText, setConfirmText] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      showToast({
        title: 'Account deletion started',
        description: 'Your account deletion request has been submitted.',
        variant: 'info',
      });
      try {
        await logout();
      } catch {
        // Session may already be invalidated
      }
      router.replace('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not delete account.';
      showToast({
        title: 'Deletion failed',
        description: msg,
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Delete account</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Permanently request deletion of your Fledge account
          {user?.displayName ? ` (${user.displayName})` : ''}. This cannot be undone.
        </p>
      </div>

      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">What happens when you delete</p>
            <ul className="list-disc pl-4 text-muted-foreground space-y-1">
              <li>Your profile and login access will be removed</li>
              <li>Saved favorites, interests, and chats may become inaccessible</li>
              <li>Active sessions on other devices will end</li>
            </ul>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label htmlFor="delete-confirm" className="text-sm font-medium text-foreground">
            Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm
          </label>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            className="max-w-xs rounded-xl"
          />
        </div>

        <Button
          variant="destructive"
          className="rounded-xl"
          disabled={!canDelete}
          onClick={() => setIsDialogOpen(true)}
        >
          Delete my account
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => !isDeleting && setIsDialogOpen(false)}
        onConfirm={handleDelete}
        title="Permanently delete account?"
        description="This starts permanent account deletion. You will be signed out immediately."
        confirmLabel="Delete account"
        isDestructive
        isLoading={isDeleting}
      />
    </section>
  );
}
