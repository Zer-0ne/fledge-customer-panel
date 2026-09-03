'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
  fetchRoommateInterests,
  updateRoommateInterestStatus,
  GroupedRoommateInterests,
} from '@/lib/api/services/roommates';
import { createConversation } from '@/lib/api/services/chat';
import { RoommateInterest } from '@/types';
import { formatPaiseToINR, formatDate } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrustBadge } from '@/components/trust/trust-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { showToast } from '@/components/ui/toast';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  UserCheck,
  Send,
  Inbox,
  Sparkles,
  Ban,
  Loader2,
  MapPin,
  Building2,
} from 'lucide-react';

export default function RoommateInterestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const [data, setData] = React.useState<GroupedRoommateInterests>({ incoming: [], outgoing: [] });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'outgoing' | 'incoming'>(
    tabParam === 'incoming' ? 'incoming' : 'outgoing'
  );
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (tabParam === 'incoming' || tabParam === 'outgoing') {
      const timer = window.setTimeout(() => setActiveTab(tabParam), 0);
      return () => window.clearTimeout(timer);
    }
  }, [tabParam]);

  const loadInterests = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchRoommateInterests(userId);
      if (res) {
        setData(res);
        if (!tabParam && res.incoming.length > 0) {
          setActiveTab('incoming');
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching roommate interests:', err);
      setError(err instanceof Error ? err.message : 'Could not load your interests');
    } finally {
      setIsLoading(false);
    }
  }, [userId, tabParam]);

  React.useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadInterests();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, loadInterests]);

  const handleStatusUpdate = async (
    interest: RoommateInterest,
    newStatus: 'accepted' | 'rejected' | 'withdrawn'
  ) => {
    const listKey = interest.direction === 'incoming' ? 'incoming' : 'outgoing';
    const oldStatus = interest.status;

    // Optimistic UI Update
    setData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((item) =>
        item.id === interest.id ? { ...item, status: newStatus } : item
      ),
    }));

    setActionLoadingId(interest.id);

    try {
      await updateRoommateInterestStatus(interest.id, newStatus);
      showToast({
        title: 'Status Updated',
        description: `Roommate request marked as ${newStatus}.`,
        variant: 'default',
      });
    } catch (err: unknown) {
      // Rollback optimistic update
      setData((prev) => ({
        ...prev,
        [listKey]: prev[listKey].map((item) =>
          item.id === interest.id ? { ...item, status: oldStatus } : item
        ),
      }));

      const msg = err instanceof Error ? err.message : 'Failed to update request status.';
      showToast({
        title: 'Action Failed',
        description: `${msg} Restored previous status.`,
        variant: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartChat = async (interestId: string) => {
    setActionLoadingId(interestId);
    try {
      const conv = await createConversation('roommate_interest', interestId);
      showToast({
        title: 'Conversation Initiated',
        description: 'Opening conversation thread...',
        variant: 'success',
      });
      router.push(`/messages/${conv.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start conversation.';
      showToast({
        title: 'Chat Error',
        description: msg,
        variant: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isAuthLoading || (isAuthenticated && isLoading)) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-80 rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sign in to View Roommate Requests</h1>
        <p className="text-sm text-muted-foreground">
          Manage your sent roommate connection requests and review incoming interest from students.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link href="/login">
            <Button size="lg" className="rounded-xl shadow-xs">
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" size="lg" className="rounded-xl">
              Create Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState
          title="Could Not Load Roommate Requests"
          description={error}
          onRetry={loadInterests}
        />
      </div>
    );
  }

  const currentRequests = activeTab === 'outgoing' ? data.outgoing : data.incoming;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Users className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Roommate Connect</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Roommate Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track outgoing roommate requests sent to other members and respond to incoming roommate inquiries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/interests">
            <Button variant="outline" className="gap-2 rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30">
              <Building2 className="size-4" />
              <span>Flat Listing Interests</span>
            </Button>
          </Link>
          <Link href="/roommates">
            <Button variant="outline" className="gap-2 rounded-xl">
              <Sparkles className="size-4 text-primary" />
              <span>Discover Roommates</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Segmented Control */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'outgoing'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Send className="size-4" />
          <span>Sent Requests</span>
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
            {data.outgoing.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'incoming'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Inbox className="size-4" />
          <span>Incoming Requests</span>
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
            {data.incoming.length}
          </span>
        </button>
      </div>

      {/* Requests List */}
      {error ? (
        <ErrorState
          title="Could not load your requests"
          message={error}
          onRetry={() => loadInterests()}
        />
      ) : currentRequests.length > 0 ? (
        <div className="space-y-4">
          {currentRequests.map((interest) => {
            const post = interest.post;
            const user = interest.user;
            const isProcessing = actionLoadingId === interest.id;

            return (
              <div
                key={interest.id}
                className="group relative flex flex-col md:flex-row items-start md:items-center justify-between rounded-2xl border border-border/80 bg-card p-5 gap-4 shadow-xs transition-all hover:shadow-md"
              >
                {/* Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={interest.status} />
                    <span className="text-xs text-muted-foreground">
                      Requested {formatDate(interest.createdAt)}
                    </span>
                  </div>

                  <h3 className="font-bold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {post?.title || `Roommate Request #${interest.id.slice(0, 8)}`}
                  </h3>

                  {post && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {post.budgetPaise ? (
                        <span>Budget: <strong>{formatPaiseToINR(post.budgetPaise)}</strong>/mo</span>
                      ) : null}
                      {post.locality && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-primary/70" />
                          {post.locality}
                        </span>
                      )}
                    </div>
                  )}

                  {interest.message && (
                    <p className="text-xs text-muted-foreground/90 italic bg-muted/40 p-2.5 rounded-xl line-clamp-2 max-w-2xl border border-border/40">
                      &quot;{interest.message}&quot;
                    </p>
                  )}

                  {user && activeTab === 'incoming' && (
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <UserCheck className="size-3.5 text-primary" />
                      <span>Applicant: <strong className="text-foreground">{user.displayName}</strong> <TrustBadge badge={user.trustBadge} size={12} /></span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto border-t md:border-t-0 border-border/60 pt-3 md:pt-0 justify-end shrink-0">
                  {/* Incoming Pending Actions */}
                  {activeTab === 'incoming' && interest.status === 'pending' && interest.canAccept !== false && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={() => handleStatusUpdate(interest, 'rejected')}
                        className="gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="size-3.5" />
                        <span>Decline</span>
                      </Button>

                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleStatusUpdate(interest, 'accepted')}
                        className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      >
                        {isProcessing ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        <span>Accept Request</span>
                      </Button>
                    </>
                  )}

                  {/* Outgoing Pending Actions */}
                  {activeTab === 'outgoing' && interest.status === 'pending' && interest.canWithdraw !== false && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isProcessing}
                      onClick={() => handleStatusUpdate(interest, 'withdrawn')}
                      className="gap-1.5 rounded-xl border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                    >
                      <Ban className="size-3.5" />
                      <span>Withdraw Request</span>
                    </Button>
                  )}

                  {/* Accepted State Action -> Chat */}
                  {interest.status === 'accepted' && (
                    <Button
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => handleStartChat(interest.id)}
                      className="gap-1.5 rounded-xl shadow-xs"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Chat with Roommate</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {activeTab === 'outgoing' ? <Send className="size-7" /> : <Inbox className="size-7" />}
          </div>
          <h3 className="text-xl font-bold text-foreground">
            {activeTab === 'outgoing' ? 'No Sent Requests' : 'No Incoming Requests'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'outgoing'
              ? 'You have not sent any roommate connection requests yet. Find active posts and express interest.'
              : 'You have not received any requests for your roommate posts yet.'}
          </p>
          {activeTab === 'outgoing' && (
            <Link href="/roommates" className="inline-block pt-2">
              <Button className="gap-2 rounded-xl shadow-xs">
                <Sparkles className="size-4" />
                <span>Browse Roommate Posts</span>
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RoommateInterest['status'] }) {
  switch (status) {
    case 'accepted':
      return (
        <Badge variant="success" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          <CheckCircle2 className="size-3" />
          <span>Accepted</span>
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="size-3" />
          <span>Declined</span>
        </Badge>
      );
    case 'withdrawn':
      return (
        <Badge variant="secondary" className="gap-1">
          <Ban className="size-3" />
          <span>Withdrawn</span>
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="warning" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          <Clock className="size-3" />
          <span>Pending Response</span>
        </Badge>
      );
  }
}
