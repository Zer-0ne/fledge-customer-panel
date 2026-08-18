'use client';

import * as React from 'react';
import { fetchSessions, revokeSession } from '@/lib/api/services/account';
import { AuthSession } from '@/types';
import { formatDateTime, formatRelativeTime } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast';
import { MonitorSmartphone, Shield } from 'lucide-react';

export default function SessionsSettingsPage() {
  const [sessions, setSessions] = React.useState<AuthSession[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = React.useState<AuthSession | null>(null);
  const [isRevoking, setIsRevoking] = React.useState(false);

  const loadSessions = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load sessions.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
  }, [loadSessions]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    const id = revokeTarget.id;

    try {
      await revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setRevokeTarget(null);
      showToast({
        title: 'Session revoked',
        description: 'That device has been signed out.',
        variant: 'success',
      });
    } catch {
      showToast({
        title: 'Revoke failed',
        description: 'Could not revoke this session. Try again.',
        variant: 'error',
      });
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Sessions unavailable" description={error} onRetry={loadSessions} />;
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Active sessions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Devices currently signed into your account. Revoke any session you do not recognize.
        </p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={MonitorSmartphone}
          title="No sessions found"
          description="Your active login sessions will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="rounded-xl border border-border/80 bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                  <MonitorSmartphone className="size-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {session.deviceLabel}
                    </p>
                    {session.isCurrent && (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="size-3" />
                        This device
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last active {formatRelativeTime(session.lastActiveAt)} ·{' '}
                    {formatDateTime(session.lastActiveAt)}
                  </p>
                  {session.ipAddress && (
                    <p className="text-xs text-muted-foreground">IP {session.ipAddress}</p>
                  )}
                </div>
              </div>

              {!session.isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setRevokeTarget(session)}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={Boolean(revokeTarget)}
        onClose={() => !isRevoking && setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke this session?"
        description="The selected device will be signed out immediately and will need to log in again."
        confirmLabel="Revoke session"
        isDestructive
        isLoading={isRevoking}
      />
    </section>
  );
}
