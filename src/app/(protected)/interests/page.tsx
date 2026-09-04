'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
  fetchListingInterests,
  updateListingInterestStatus,
  startConversationFromInterest,
  GroupedListingInterests,
} from '@/lib/api/services/interests';
import { ListingInterest } from '@/types';
import { formatPaiseToINR, formatDate } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrustBadge } from '@/components/trust/trust-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { showToast } from '@/components/ui/toast';
import BorderGlow from '@/components/BorderGlow'
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  ArrowRight,
  UserCheck,
  Send,
  Inbox,
  Sparkles,
  Ban,
  Loader2,
  Users,
} from 'lucide-react';

export default function InterestsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = React.useState<GroupedListingInterests>({ incoming: [], outgoing: [] });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'outgoing' | 'incoming'>('outgoing');
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const loadInterests = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchListingInterests();
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load listing interests.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadInterests();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, loadInterests]);

  // Optimistic status update with rollback
  const handleStatusUpdate = async (
    interest: ListingInterest,
    newStatus: 'accepted' | 'rejected' | 'withdrawn'
  ) => {
    const listKey = interest.direction === 'incoming' ? 'incoming' : 'outgoing';
    const oldStatus = interest.status;

    // Optimistic update
    setData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((item) =>
        item.id === interest.id ? { ...item, status: newStatus } : item
      ),
    }));

    setActionLoadingId(interest.id);

    try {
      await updateListingInterestStatus(interest.id, newStatus);
      showToast({
        title: 'Status Updated',
        description: `Interest request marked as ${newStatus}.`,
        variant: 'success',
      });
    } catch (err: unknown) {
      // Rollback
      setData((prev) => ({
        ...prev,
        [listKey]: prev[listKey].map((item) =>
          item.id === interest.id ? { ...item, status: oldStatus } : item
        ),
      }));

      const msg = err instanceof Error ? err.message : 'Failed to update interest status.';
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
      const res = await startConversationFromInterest(interestId);
      showToast({
        title: 'Conversation Initiated',
        description: 'Navigating to chat...',
        variant: 'success',
      });
      router.push(`/messages/${res.id}`);
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
          {Array.from({ length: 4 }).map((_, i) => (
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
          <Building2 className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sign in to View Listing Interests</h1>
        <p className="text-sm text-muted-foreground">
          Track your inquiries sent to flat owners and manage incoming requests for your listings.
        </p>
        <div className="pt-2 flex justify-center">
          <Link href="/login">
            <Button size="lg" className="rounded-xl shadow-xs">
              Sign In
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
          title="Could Not Load Interests"
          description={error}
          onRetry={loadInterests}
        />
      </div>
    );
  }

  const currentListings = activeTab === 'outgoing' ? data.outgoing : data.incoming;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Building2 className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Listing Inquiries</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Flat Listing Interests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your outgoing inquiries sent to property managers and incoming requests from interested renters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/roommate-interests">
            <Button variant="outline" className="gap-2 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
              <Users className="size-4" />
              <span>Roommate Requests</span>
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" className="gap-2 rounded-xl">
              <Sparkles className="size-4 text-primary" />
              <span>Explore More Flats</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Segmented Tab Controls */}
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
          <span>My Inquiries Sent</span>
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

      {/* Interests List */}
      {currentListings.length > 0 ? (
        <div className="space-y-4">
          {currentListings.map((interest) => {
            const listing = interest.listing;
            const listingImage =
              listing?.images && listing.images.length > 0
                ? listing.images[0]
                : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&auto=format&fit=crop&q=80';

            const user = interest.user;
            const isProcessing = actionLoadingId === interest.id;

            return (
              <BorderGlow key={interest.id} className='rounded-2xl!'>
              <div
                className="group relative flex flex-col md:flex-row items-start md:items-center justify-between rounded-2xl border border-border/80 bg-card p-5 gap-4 shadow-xs transition-all hover:shadow-md"
              >
                {/* Left Section: Listing Thumbnail + Metadata */}
                <div className="flex items-start sm:items-center gap-4 w-full md:w-auto">
                  <div className="relative aspect-video sm:aspect-square size-20 sm:size-24 rounded-xl overflow-hidden bg-muted shrink-0">
                    <Image
                      src={listingImage}
                      alt={listing?.title || 'Listing Image'}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={interest.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(interest.createdAt)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {listing?.title || `Listing Inquiry #${interest.id.slice(0, 8)}`}
                    </h3>

                    {listing && (
                      <p className="text-xs text-muted-foreground font-medium">
                        {formatPaiseToINR(listing.monthlyRentPaise)} / month • {listing.bedrooms} BHK
                      </p>
                    )}

                    {interest.message && (
                      <p className="text-xs text-muted-foreground/90 italic bg-muted/40 p-2 rounded-lg line-clamp-2 max-w-xl">
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
                </div>

                {/* Right Section: Action Controls */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto border-t md:border-t-0 border-border/60 pt-3 md:pt-0 justify-end">
                  {listing?.id && (
                    <Link href={`/listings/${listing.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1 rounded-xl text-xs">
                        <span>View Flat</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                  )}

                  {/* Incoming Pending Actions */}
                  {activeTab === 'incoming' && interest.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={() => handleStatusUpdate(interest, 'rejected')}
                        className="gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="size-3.5" />
                        <span>Reject</span>
                      </Button>

                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleStatusUpdate(interest, 'accepted')}
                        className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
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
                  {activeTab === 'outgoing' && interest.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isProcessing}
                      onClick={() => handleStatusUpdate(interest, 'withdrawn')}
                      className="gap-1.5 rounded-xl border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                    >
                      <Ban className="size-3.5" />
                      <span>Withdraw Inquiry</span>
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
                      {isProcessing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <MessageSquare className="size-3.5" />
                      )}
                      <span>Start Chat</span>
                    </Button>
                  )}
                </div>
              </div>
              </BorderGlow>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {activeTab === 'outgoing' ? <Send className="size-7" /> : <Inbox className="size-7" />}
          </div>
          <h3 className="text-xl font-bold text-foreground">
            {activeTab === 'outgoing' ? 'No Sent Inquiries' : 'No Incoming Requests'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'outgoing'
              ? 'You have not submitted interest in any flat listings yet. Browse available listings and express interest.'
              : 'You have not received any inquiry requests for your property listings yet.'}
          </p>
          {activeTab === 'outgoing' && (
            <Link href="/search" className="inline-block pt-2">
              <Button className="gap-2 rounded-xl shadow-xs">
                <Sparkles className="size-4" />
                <span>Browse Flat Listings</span>
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ListingInterest['status'] }) {
  switch (status) {
    case 'accepted':
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="size-3" />
          <span>Accepted</span>
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="size-3" />
          <span>Rejected</span>
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
        <Badge variant="warning" className="gap-1">
          <Clock className="size-3" />
          <span>Pending</span>
        </Badge>
      );
  }
}
