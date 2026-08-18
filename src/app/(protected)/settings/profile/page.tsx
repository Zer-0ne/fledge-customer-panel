'use client';

import * as React from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchOwnProfile } from '@/lib/api/services/account';
import { User } from '@/types';
import { formatDate } from '@/lib/formatting';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { UserRound } from 'lucide-react';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-foreground break-words">{value}</dd>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user: sessionUser } = useAuth();
  const [profile, setProfile] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchOwnProfile();
      setProfile(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile.';
      setError(msg);
      if (sessionUser) setProfile(sessionUser);
    } finally {
      setIsLoading(false);
    }
  }, [sessionUser]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (error && !profile) {
    return <ErrorState title="Profile unavailable" description={error} onRetry={loadProfile} />;
  }

  const data = profile || sessionUser;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your account details are read-only. Contact support if you need changes.
        </p>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {data?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.avatarUrl}
                alt=""
                className="size-14 rounded-2xl object-cover"
              />
            ) : (
              <UserRound className="size-7" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{data?.displayName || 'User'}</h3>
            <Badge variant="secondary" className="mt-1">
              Read-only profile
            </Badge>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-border/60">
          <Field label="Display name" value={data?.displayName || '—'} />
          <Field label="Email" value={data?.email || 'Not provided'} />
          <Field label="Phone" value={data?.phone || 'Not provided'} />
          <Field label="Member since" value={formatDate(data?.createdAt)} />
          <Field label="College ID" value={data?.collegeId || 'Not set'} />
          <Field label="Campus ID" value={data?.campusId || 'Not set'} />
        </dl>

        {data?.bio && (
          <div className="pt-2 border-t border-border/60 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bio</p>
            <p className="text-sm text-foreground leading-relaxed">{data.bio}</p>
          </div>
        )}
      </div>
    </section>
  );
}
