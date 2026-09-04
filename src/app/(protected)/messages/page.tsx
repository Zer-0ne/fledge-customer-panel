'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchConversations, enrichConversations } from '@/lib/api/services/chat';
import { ConversationUpdatedState, ConversationCreatedState } from '@/lib/api/services/chat-socket';
import {
  fetchMessageRequests,
  fetchMessageRequest,
  acceptMessageRequest,
  declineMessageRequest,
  type MessageRequestItem,
} from '@/lib/api/services/chat';
import {
  receivedResponses,
  sentResponses,
  getRequest,
  acceptResponse,
  declineResponse,
  friendlyNeedNowError,
} from '@/lib/api/services/neednow';
import { Conversation, NeedNowResponse } from '@/types';
import { formatDate } from '@/lib/formatting';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrustBadge } from '@/components/trust/trust-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import BorderGlow from '@/components/BorderGlow'
import {
  MessageSquare,
  Search,
  Building2,
  Users,
  UserPlus,
  ChevronRight,
  User,
  Shield,
} from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | 'listing_interest' | 'roommate_interest' | 'requests'>('all');
  // Insta-style requests: unknown senders land here, never the inbox.
  const [needNowRequests, setNeedNowRequests] = React.useState<NeedNowResponse[]>([]);
  const [messageRequests, setMessageRequests] = React.useState<MessageRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = React.useState(false);
  const [requestsError, setRequestsError] = React.useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = React.useState<string | null>(null);

  const userId = user?.id;
  // Need Now threads: responseId (= housing contextId) → actual peer + location.
  // enrichConversations listing/roommate interests ko resolve karta hai, housing
  // ko nahi — isliye list me "Chat Participant"/"Roommate" generic dikhta tha.
  const [housingMeta, setHousingMeta] = React.useState<Map<string, { peerId?: string; peerName?: string; location?: string; accepted?: boolean }>>(new Map());
  const loadConversations = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchConversations();
      const enriched = userId ? await enrichConversations(data, userId) : data;
      setConversations(enriched);
      // Housing meta best-effort: owner view me responder, responder view me
      // request owner (getRequest) — taaki same user ke alag threads bhi
      // actual naam + Need Now context ke saath dikhein.
      try {
        const [recAll, sentAll] = await Promise.all([receivedResponses(), sentResponses()]);
        const meta = new Map<string, { peerId?: string; peerName?: string; location?: string; accepted?: boolean }>();
        const locOf = (r: unknown): string => {
          const req = (r as { request?: unknown })?.request as Record<string, unknown> | undefined;
          if (!req) return '';
          const loc = req.location as { name?: unknown } | undefined;
          if (loc && typeof loc.name === 'string') return loc.name;
          return typeof req.primaryLocationName === 'string' ? req.primaryLocationName : '';
        };
        for (const r of recAll as unknown[]) {
          const rec = r as { id?: string; status?: string; responder?: { id?: string; displayName?: string } };
          if (!rec?.id) continue;
          meta.set(rec.id, {
            peerId: rec.responder?.id,
            peerName: rec.responder?.displayName,
            location: locOf(r),
            accepted: rec.status === 'ACCEPTED',
          });
        }
        const sentList = sentAll as unknown[];
        const needOwner = sentList.filter((s) => {
          const rec = s as { id?: string; housingRequestId?: string };
          return rec?.id && rec?.housingRequestId && !meta.has(rec.id);
        });
        const owners = await Promise.allSettled(
          needOwner.map(async (s) => {
            const rec = s as { id: string; status?: string; housingRequestId: string };
            const req = await getRequest(rec.housingRequestId);
            return { id: rec.id, accepted: rec.status === 'ACCEPTED', owner: req.owner, location: req.location?.name || locOf(s) };
          })
        );
        for (const o of owners) {
          if (o.status !== 'fulfilled') continue;
          meta.set(o.value.id, {
            peerId: o.value.owner?.id,
            peerName: o.value.owner?.displayName,
            location: o.value.location,
            accepted: o.value.accepted,
          });
        }
        // Pending sent jinka request fetch fail ho (expired/removed) — location fallback.
        for (const s of sentList) {
          const rec = s as { id?: string; status?: string };
          if (!rec?.id || meta.has(rec.id)) continue;
          meta.set(rec.id, { location: locOf(s), accepted: rec.status === 'ACCEPTED' });
        }
        setHousingMeta(meta);
      } catch {
        // Meta na mile to list generic fallback par chalegi — thread nahi tootega.
      }
      // Note: the header/nav unread message badge is driven exclusively by the
      // socket-pushed `user:unread_counts` event via AuthProvider. Do not overwrite
      // it here with a locally-derived sum, or it will race with the server's count.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load conversations.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, [loadConversations]);

  const loadRequests = React.useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const [received, msgReqs] = await Promise.all([
        receivedResponses(),
        fetchMessageRequests(),
      ]);
      setNeedNowRequests(received.filter((r) => r.status === 'PENDING'));
      // Pending message requests, newest first, with bodies for preview.
      const pending = msgReqs
        .filter((m) => m.status === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const withBodies = await Promise.all(
        pending.map(async (m) => {
          if (m.body) return m;
          try {
            return await fetchMessageRequest(m.id);
          } catch {
            return m;
          }
        })
      );
      setMessageRequests(withBodies);
    } catch (err: unknown) {
      setRequestsError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRequests();
  }, [loadRequests]);

  const handleAcceptNeedNow = React.useCallback(async (id: string) => {
    setBusyRequestId(id);
    try {
      const updated = await acceptResponse(id);
      if (updated.conversationId) {
        router.push(`/messages/${updated.conversationId}`);
        return;
      }
      await loadRequests();
      await loadConversations();
    } catch (err: unknown) {
      setRequestsError(friendlyNeedNowError(err));
    } finally {
      setBusyRequestId(null);
    }
  }, [router, loadRequests, loadConversations]);

  const handleDeclineNeedNow = React.useCallback(async (id: string) => {
    setBusyRequestId(id);
    try {
      await declineResponse(id);
      await loadRequests();
    } catch (err: unknown) {
      setRequestsError(friendlyNeedNowError(err));
    } finally {
      setBusyRequestId(null);
    }
  }, [loadRequests]);

  const handleAcceptMessageRequest = React.useCallback(async (id: string) => {
    setBusyRequestId(id);
    try {
      const updated = await acceptMessageRequest(id);
      if (updated.conversationId) {
        router.push(`/messages/${updated.conversationId}`);
        return;
      }
      await loadRequests();
      await loadConversations();
    } catch (err: unknown) {
      setRequestsError(err instanceof Error ? err.message : 'Could not accept the request.');
    } finally {
      setBusyRequestId(null);
    }
  }, [router, loadRequests, loadConversations]);

  const handleDeclineMessageRequest = React.useCallback(async (id: string) => {
    setBusyRequestId(id);
    try {
      await declineMessageRequest(id);
      await loadRequests();
    } catch (err: unknown) {
      setRequestsError(err instanceof Error ? err.message : 'Could not decline the request.');
    } finally {
      setBusyRequestId(null);
    }
  }, [loadRequests]);

  // Jisse pehle se hi chat ho rha hai, woh request me nahi jana chahiye:
  // established threads (listing/roommate/message-request, ya ACCEPTED Need Now)
  // wale peers ke Need Now PENDING Requests tab me nahi dikhenge — unka thread
  // inbox me already hai aur accept/decline banner wahin milta hai.
  const establishedPeerIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const conv of conversations) {
      if (conv.contextType !== 'housing_request_response') {
        for (const p of conv.participants) {
          if (p.id && p.id !== userId && !p.id.startsWith('listing-') && !p.id.startsWith('roommate-')) {
            set.add(p.id);
          }
        }
      }
    }
    for (const [, m] of housingMeta) {
      if (m.accepted && m.peerId) set.add(m.peerId);
    }
    return set;
  }, [conversations, housingMeta, userId]);

  const visibleNeedNowRequests = React.useMemo(
    () => needNowRequests.filter((r) => !establishedPeerIds.has(r.responder.id)),
    [needNowRequests, establishedPeerIds]
  );
  const visibleRequestsCount = visibleNeedNowRequests.length + messageRequests.length;

  // Listen for realtime conversation updates over socket
  React.useEffect(() => {
    const handleConversationUpdated = (evt: Event) => {
      const customEvt = evt as CustomEvent<ConversationUpdatedState>;
      const detail = customEvt.detail;
      if (!detail || !detail.conversationId) return;

      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === detail.conversationId);
        if (existingIndex === -1) {
          void loadConversations();
          return prev;
        }

        const updated = [...prev];
        const item = { ...updated[existingIndex] };
        item.lastMessage = detail.lastMessage;
        item.unreadCount = detail.unreadCount;
        item.updatedAt = detail.lastMessage.createdAt || new Date().toISOString();
        updated[existingIndex] = item;

        // WhatsApp-style sorting: move updated thread to top of list
        updated.sort((a, b) => {
          const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt).getTime();
          return timeB - timeA;
        });

        return updated;
      });
    };

    window.addEventListener('app:conversation_updated', handleConversationUpdated);
    return () => {
      window.removeEventListener('app:conversation_updated', handleConversationUpdated);
    };
  }, [loadConversations]);

  // A newly opened chat (request accepted anywhere) lands in the inbox live.
  React.useEffect(() => {
    const handleConversationCreated = (evt: Event) => {
      const customEvt = evt as CustomEvent<ConversationCreatedState>;
      if (!customEvt.detail?.conversationId) return;
      void loadConversations();
      void loadRequests();
    };
    window.addEventListener('app:conversation_created', handleConversationCreated);
    return () => {
      window.removeEventListener('app:conversation_created', handleConversationCreated);
    };
  }, [loadConversations, loadRequests]);

  // Filter conversations & sort by newest message
  const filteredConversations = React.useMemo(() => {
    const list = conversations.filter((conv) => {
      // Tab filter
      if (activeTab !== 'all' && conv.contextType !== activeTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const peer = conv.participants.find((p) => p.id !== user?.id) || conv.participants[0];
        const housing = conv.contextType === 'housing_request_response' ? housingMeta.get(conv.contextId) : undefined;
        const peerName = housing?.peerName || peer?.displayName?.toLowerCase() || '';
        const lastMsg = conv.lastMessage?.content?.toLowerCase() || '';
        const listTitle = conv.listingTitle?.toLowerCase() || conv.listing?.title?.toLowerCase() || '';
        const rmTitle = conv.roommatePostTitle?.toLowerCase() || conv.roommatePost?.title?.toLowerCase() || '';
        const housingTitle = housing?.location?.toLowerCase() || '';
        return (
          peerName.includes(query) ||
          lastMsg.includes(query) ||
          listTitle.includes(query) ||
          rmTitle.includes(query) ||
          housingTitle.includes(query)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [conversations, activeTab, searchQuery, user?.id, housingMeta]);

  const totalUnread = React.useMemo(() => {
    return conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
  }, [conversations]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorState
          title="Unable to Load Messages"
          description={error}
          onRetry={loadConversations}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Messages
            </h1>
            {totalUnread > 0 && (
              <Badge variant="default" className="bg-primary text-primary-foreground font-semibold">
                {totalUnread} new
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Chat with flat owners, room seekers, and potential roommates safely.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs sm:text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <MessageSquare className="size-4" />
          All Threads
          <span className="ml-1 text-xs opacity-80">({conversations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('listing_interest')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'listing_interest'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Building2 className="size-4" />
          Listings
        </button>

        <button
          onClick={() => setActiveTab('roommate_interest')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'roommate_interest'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Users className="size-4" />
          Roommates
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'requests'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <UserPlus className="size-4" />
          Requests
          {visibleRequestsCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
              {visibleRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* Requests (insta-style) / Conversation List */}
      {activeTab === 'requests' ? (
        <RequestsPanel
          needNowRequests={visibleNeedNowRequests}
          messageRequests={messageRequests}
          loading={requestsLoading}
          error={requestsError}
          busyId={busyRequestId}
          onRetry={loadRequests}
          onAcceptNeedNow={handleAcceptNeedNow}
          onDeclineNeedNow={handleDeclineNeedNow}
          onAcceptMessageRequest={handleAcceptMessageRequest}
          onDeclineMessageRequest={handleDeclineMessageRequest}
        />
      ) : (
      <>
      {/* Conversation List */}
      {filteredConversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={searchQuery ? 'No matching conversations' : 'No active conversations'}
          description={
            searchQuery
              ? `No messages found matching "${searchQuery}".`
              : 'Conversations unlock automatically when an interest request is accepted.'
          }
          action={
            searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/search"
                  className={buttonVariants({ variant: 'default', size: 'sm' })}
                >
                  Browse Listings
                </Link>
                <Link
                  href="/roommates"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Find Roommates
                </Link>
              </div>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv) => {
            const peer =
              conv.participants.find(
                (p) => p.id !== user?.id && !p.id.startsWith('listing-') && !p.id.startsWith('roommate-')
              ) || conv.participants.find((p) => p.id !== user?.id) || conv.participants[0];

            const isHousing = conv.contextType === 'housing_request_response';
            const housing = isHousing ? housingMeta.get(conv.contextId) : undefined;

            const contextTitle = isHousing
              ? housing?.location || 'Need Now requirement'
              : conv.contextType === 'listing_interest'
                ? conv.listingTitle || conv.listing?.title
                : conv.roommatePostTitle || conv.roommatePost?.title;

            const peerName =
              housing?.peerName && housing.peerName !== 'User'
                ? housing.peerName
                : peer?.displayName && peer.displayName !== 'User'
                  ? peer.displayName
                  : isHousing
                    ? 'Need Now chat'
                    : contextTitle || peer?.displayName || 'User';

            const peerAvatar = peer?.avatarUrl;

            const trustUserId =
              peer?.id && !peer.id.startsWith('listing-') && !peer.id.startsWith('roommate-')
                ? peer.id
                : housing?.peerId;

            const listingLabel = isHousing
              ? 'Need Now'
              : conv.contextType === 'listing_interest'
                ? contextTitle
                  ? `Listing: ${contextTitle}`
                  : 'Listing'
                : contextTitle
                  ? `Roommate: ${contextTitle}`
                  : 'Roommate';

            const isLastFromMe = conv.lastMessage?.senderId === user?.id;
            const effectiveUnread = conv.unreadCount || 0;
            const hasUnread = effectiveUnread > 0;
            const lastMsgContent = conv.lastMessage
              ? `${isLastFromMe ? 'You: ' : ''}${conv.lastMessage.content}`
              : 'Conversation started.';
            const msgTime = conv.lastMessage?.createdAt || conv.updatedAt || conv.createdAt;

            return (
              <BorderGlow key={conv.id} className='rounded-xl!'>
              <Link
                href={`/messages/${conv.id}`}
                className={`group flex items-center justify-between p-4 rounded-xl border transition-all shadow-xs ${
                  hasUnread
                    ? 'border-primary/40 bg-primary/[0.03] dark:bg-primary/[0.05] hover:border-primary hover:bg-primary/[0.06]'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  {/* User Avatar */}
                  <div className="relative shrink-0">
                    <div className="size-12 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center">
                      {peerAvatar ? (
                        <Image
                          src={peerAvatar}
                          alt={peerName}
                          width={48}
                          height={48}
                          className="size-full object-cover"
                        />
                      ) : (
                        <User className="size-6 text-primary" />
                      )}
                    </div>
                    {hasUnread ? (
                      <span className="absolute -top-1 -right-1 size-5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center border-2 border-background shadow-xs sm:hidden">
                        {effectiveUnread > 99 ? '99+' : effectiveUnread}
                      </span>
                    ) : null}
                  </div>

                  {/* Info & Message Preview */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate ${
                        hasUnread ? 'font-bold' : 'font-semibold'
                      }`}>
                        {peerName}
                      </h3>
                      {trustUserId ? (
                        <TrustBadge userId={trustUserId} size={15} />
                      ) : null}
                      <Badge
                        variant="outline"
                        title={listingLabel}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium max-w-[150px] truncate ${
                          conv.contextType === 'listing_interest'
                            ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : isHousing
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        {listingLabel}
                      </Badge>
                      {conv.contextState === 'expired' && (
                        <Badge
                          variant="warning"
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        >
                          Post expired
                        </Badge>
                      )}
                    </div>

                    <p className={`text-xs sm:text-sm truncate ${
                      hasUnread
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground'
                    }`}>
                      {lastMsgContent}
                    </p>
                  </div>
                </div>

                {/* Date & WhatsApp-Style Unread Count Badge */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                  <span className={`text-[11px] sm:text-xs ${
                    hasUnread ? 'text-primary font-bold' : 'text-muted-foreground'
                  }`}>
                    {formatDate(msgTime)}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasUnread ? (
                      <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] flex items-center justify-center shadow-xs">
                        {effectiveUnread > 99 ? '99+' : effectiveUnread}
                      </span>
                    ) : null}
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
              </BorderGlow>
            );
          })}
        </div>
      )}
      </>)}

      {/* Safety Notice Footer */}
      <div className="p-4 rounded-xl border border-border bg-card/50 flex items-start gap-3 text-xs text-muted-foreground">
        <Shield className="size-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Safety Tip: </span>
          Never transfer funds or share financial details prior to inspecting the property or verifying credentials. Use the Contact Share feature to exchange phone numbers securely.
        </div>
      </div>
    </main>
  );
}

// ─── Requests panel (insta-style) ───────────────────────────────────────────
// Unknown senders land here. Accept opens the chat, decline removes the
// request. The sender never sees read receipts while pending.

function RequestsPanel({
  needNowRequests,
  messageRequests,
  loading,
  error,
  busyId,
  onRetry,
  onAcceptNeedNow,
  onDeclineNeedNow,
  onAcceptMessageRequest,
  onDeclineMessageRequest,
}: {
  needNowRequests: NeedNowResponse[];
  messageRequests: MessageRequestItem[];
  loading: boolean;
  error: string | null;
  busyId: string | null;
  onRetry: () => void;
  onAcceptNeedNow: (id: string) => void;
  onDeclineNeedNow: (id: string) => void;
  onAcceptMessageRequest: (id: string) => void;
  onDeclineMessageRequest: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to Load Requests"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (needNowRequests.length === 0 && messageRequests.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="No message requests"
        description="When someone new messages you, it will appear here first. Nothing is marked seen until you accept."
      />
    );
  }

  const responseKindLabel = (r: NeedNowResponse): string => {
    if (r.listing) return `Offered: ${r.listing.title}`;
    if (r.roommatePost) return `Shared post: ${r.roommatePost.title}`;
    return 'Sent you a message';
  };

  const msgRequestSubtitle = (m: MessageRequestItem): string => {
    if (m.body) return m.body;
    if (m.listingTitle) return `Offered: ${m.listingTitle}`;
    if (m.roommatePostTitle) return `Shared post: ${m.roommatePostTitle}`;
    return 'Sent you a message request';
  };

  return (
    <div className="space-y-6">
      {needNowRequests.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Need Now responses ({needNowRequests.length})
          </h2>
          {needNowRequests.map((r) => {
            const busy = busyId === r.id;
            return (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {r.responder.displayName}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-medium border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {responseKindLabel(r)}
                    </Badge>
                  </div>
                  {r.message ? (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {r.message}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => onDeclineNeedNow(r.id)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => onAcceptNeedNow(r.id)}
                    className="rounded-xl"
                  >
                    Accept
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {messageRequests.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Direct messages ({messageRequests.length})
          </h2>
          {messageRequests.map((m) => {
            const busy = busyId === m.id;
            return (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {m.sender?.displayName || 'User'}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-medium border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Message request
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {msgRequestSubtitle(m)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(m.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => onDeclineMessageRequest(m.id)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => onAcceptMessageRequest(m.id)}
                    className="rounded-xl"
                  >
                    Accept
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
