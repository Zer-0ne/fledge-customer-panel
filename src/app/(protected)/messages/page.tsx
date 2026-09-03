'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchConversations, enrichConversations } from '@/lib/api/services/chat';
import { ConversationUpdatedState } from '@/lib/api/services/chat-socket';
import { Conversation } from '@/types';
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
  ChevronRight,
  User,
  Shield,
} from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | 'listing_interest' | 'roommate_interest'>('all');

  const userId = user?.id;
  const loadConversations = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchConversations();
      const enriched = userId ? await enrichConversations(data, userId) : data;
      setConversations(enriched);
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
        const peerName = peer?.displayName?.toLowerCase() || '';
        const lastMsg = conv.lastMessage?.content?.toLowerCase() || '';
        const listTitle = conv.listingTitle?.toLowerCase() || conv.listing?.title?.toLowerCase() || '';
        const rmTitle = conv.roommatePostTitle?.toLowerCase() || conv.roommatePost?.title?.toLowerCase() || '';
        return (
          peerName.includes(query) ||
          lastMsg.includes(query) ||
          listTitle.includes(query) ||
          rmTitle.includes(query)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [conversations, activeTab, searchQuery, user?.id]);

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
      </div>

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

            const contextTitle =
              conv.contextType === 'listing_interest'
                ? conv.listingTitle || conv.listing?.title
                : conv.roommatePostTitle || conv.roommatePost?.title;

            const peerName =
              peer?.displayName && peer.displayName !== 'User'
                ? peer.displayName
                : contextTitle || peer?.displayName || 'User';

            const peerAvatar = peer?.avatarUrl;

            const listingLabel =
              conv.contextType === 'listing_interest'
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
                      {peer?.id && !peer.id.startsWith('listing-') ? (
                        <TrustBadge userId={peer.id} size={15} />
                      ) : null}
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          conv.contextType === 'listing_interest'
                            ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
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
