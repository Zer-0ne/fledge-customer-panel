'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PublicUser } from '@/types';
import { fetchPublicUser } from '@/lib/api/services/discovery';
import { formatDate } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/trust/trust-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Calendar, GraduationCap, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PublicUserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Invalid user ID.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchPublicUser(id)
      .then((data) => {
        if (!data) {
          setError('User profile not found.');
        } else {
          setUser(data);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to fetch user profile.';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <ErrorState
          title="Profile Not Found"
          description={error || 'The requested user profile does not exist.'}
          onRetry={() => router.push('/')}
        />
      </div>
    );
  }

  const firstInitial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {/* Profile Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary text-3xl font-extrabold shadow-sm shrink-0 border-2 border-primary/20">
            {firstInitial}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {user.displayName}
              </h1>
              <TrustBadge badge={user.trustBadge} size={26} />
              <ShieldCheck className="size-5 text-primary" />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Member since {formatDate(user.createdAt)}
              </span>
              {user.collegeId && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="size-3.5" />
                  Student Member
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {user.bio ? (
          <div className="border-t border-border/40 pt-4 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">About</span>
            <p className="text-sm text-foreground leading-relaxed">{user.bio}</p>
          </div>
        ) : (
          <div className="border-t border-border/40 pt-4 text-xs text-muted-foreground italic">
            This user has not added a bio yet.
          </div>
        )}
      </div>
    </div>
  );
}
