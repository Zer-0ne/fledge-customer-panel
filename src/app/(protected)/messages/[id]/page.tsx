'use client';

import * as React from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
  fetchConversations,
  fetchMessageHistory,
  sendMessage,
  markMessageDelivered,
  markMessageRead,
  blockUser,
  unblockUser,
  fetchBlockedUsers,
  fetchBlockedByUsers,
  enrichConversations,
  isChatClosedError,
  isConversationExpired,
} from '@/lib/api/services/chat';
import {
  ConversationSocket,
  type SocketStatus,
} from '@/lib/api/services/chat-socket';
import { Conversation, ChatMessage, MessageReceiptStatus } from '@/types';
import { formatDate, formatDateTime } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ReportDialog } from '@/components/chat/report-dialog';
import { ContactShareCard } from '@/components/chat/contact-share-card';
import { showToast } from '@/components/ui/toast';
import { InfoBanner } from '@/components/ui/info-banner';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  User,
  Users,
  Ban,
  Check,
  CheckCheck,
  Loader2,
  MoreVertical,
  Flag,
  Lock,
} from 'lucide-react';

function receiptStatus(msg: ChatMessage): MessageReceiptStatus {
  if (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read') {
    return msg.status;
  }
  if (msg.readAt || msg.isRead) return 'read';
  if (msg.deliveredAt) return 'delivered';
  return 'sent';
}

function receiptLabel(msg: ChatMessage): string {
  const status = receiptStatus(msg);
  if (status === 'read') {
    const when = msg.readAt ? formatDateTime(msg.readAt) : '';
    return when ? ` · Read ${when}` : ' · Read';
  }
  if (status === 'delivered') return ' · Delivered';
  return ' · Sent';
}

function applyDelivered(
  messages: ChatMessage[],
  messageIds: string[],
  deliveredAt: string
): ChatMessage[] {
  if (!messageIds.length) return messages;
  const idSet = new Set(messageIds);
  return messages.map((m) => {
    if (!idSet.has(m.id)) return m;
    if (receiptStatus(m) === 'read') return m;
    return {
      ...m,
      deliveredAt,
      status: 'delivered',
      isRead: false,
    };
  });
}

function applyRead(
  messages: ChatMessage[],
  messageIds: string[],
  readAt: string
): ChatMessage[] {
  if (!messageIds.length) return messages;
  const idSet = new Set(messageIds);
  return messages.map((m) => {
    if (!idSet.has(m.id)) return m;
    return {
      ...m,
      readAt,
      deliveredAt: m.deliveredAt || readAt,
      status: 'read',
      isRead: true,
    };
  });
}

function ackPeerReceipts(
  conversationId: string,
  messageId: string,
  socket: ConversationSocket | null
): void {
  if (!conversationId || !messageId) return;
  markMessageDelivered(conversationId, messageId).catch(() => {});
  markMessageRead(conversationId, messageId).catch(() => {});
  if (socket?.connected) {
    socket.markDelivered(conversationId, messageId).catch(() => {});
    socket.markRead(conversationId, messageId).catch(() => {});
  }
}

export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const conversationId = String(params.id || '');

  const [conversation, setConversation] = React.useState<Conversation | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [composerText, setComposerText] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [socketStatus, setSocketStatus] = React.useState<SocketStatus>('disconnected');
  const [realtimeNotice, setRealtimeNotice] = React.useState<string | null>(null);
  const [peerTyping, setPeerTyping] = React.useState(false);

  // Safety actions modal state
  const [showBlockConfirm, setShowBlockConfirm] = React.useState(false);
  const [isBlocking, setIsBlocking] = React.useState(false);
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [isBlockedByPeer, setIsBlockedByPeer] = React.useState(false);
  const [showReportDialog, setShowReportDialog] = React.useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const socketRef = React.useRef<ConversationSocket | null>(null);
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClientIdsRef = React.useRef<Set<string>>(new Set());
  const [listingTitle, setListingTitle] = React.useState<string | null>(null);

  // Peer participant
  const peer = React.useMemo(() => {
    if (!conversation) return null;
    const real = conversation.participants.find(
      (p) => p.id && p.id !== user?.id && !p.id.startsWith('listing-') && !p.id.startsWith('roommate-')
    );
    return real || conversation.participants.find((p) => p.id !== user?.id) || conversation.participants[0] || null;
  }, [conversation, user?.id]);

  const peerDisplayName = React.useMemo(() => {
    if (
      peer?.displayName &&
      peer.displayName !== 'User' &&
      peer.id &&
      !peer.id.startsWith('listing-') &&
      !peer.id.startsWith('roommate-')
    ) {
      return peer.displayName;
    }
    const contextTitle =
      listingTitle ||
      conversation?.listingTitle ||
      conversation?.listing?.title ||
      conversation?.roommatePostTitle ||
      conversation?.roommatePost?.title;

    if (contextTitle) return contextTitle;
    if (peer?.displayName && peer.displayName !== 'User') return peer.displayName;
    return conversation?.contextType === 'roommate_interest' ? 'Roommate' : 'Chat Participant';
  }, [peer, listingTitle, conversation]);

  // Block state comes from the SERVER (GET /users/blocked + /users/blocked-by),
  // never local storage — reloads and other devices must show the same truth.
  React.useEffect(() => {
    if (!peer?.id || peer.id.startsWith('listing-') || peer.id.startsWith('roommate-')) return;
    let cancelled = false;
    Promise.all([fetchBlockedUsers(), fetchBlockedByUsers()])
      .then(([mine, theirs]) => {
        if (cancelled) return;
        setIsBlocked(mine.includes(peer.id));
        setIsBlockedByPeer(theirs.includes(peer.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [peer?.id]);

  const cannotMessage = isBlocked || isBlockedByPeer;
  // Chat closed because the source post expired — history stays readable,
  // but the composer is replaced with an info banner.
  const chatClosed = isConversationExpired(conversation);

  const sortMessages = React.useCallback((list: ChatMessage[]) => {
    return [...list].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id.localeCompare(b.id)
    );
  }, []);

  const mergeMessages = React.useCallback(
    (incoming: ChatMessage[]) => {
      setMessages((prev) => {
        let next = [...prev];
        for (const msg of incoming) {
          if (!msg.id) continue;
          next = next.filter((m) => {
            if (m.id === msg.id) return false;
            // Drop optimistic temp rows (id was clientId)
            if (pendingClientIdsRef.current.has(m.id) && m.id !== msg.id) {
              // only drop if this incoming supersedes a pending send from us
              if (msg.senderId && msg.senderId === m.senderId) return false;
            }
            return true;
          });
          next.push(msg);
        }
        const byId = new Map<string, ChatMessage>();
        for (const m of next) byId.set(m.id, m);
        return sortMessages([...byId.values()]);
      });
    },
    [sortMessages]
  );

  const confirmOutgoing = React.useCallback(
    (clientId: string, confirmed: ChatMessage) => {
      pendingClientIdsRef.current.delete(clientId);
      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => m.id !== clientId && m.id !== confirmed.id
        );
        return sortMessages([...filtered, confirmed]);
      });
    },
    [sortMessages]
  );

  // Load conversation meta & initial message history + Socket.IO (no polling)
  const loadInitialData = React.useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    setError(null);
    setRealtimeNotice(null);
    try {
      const convList = await fetchConversations();
      const enriched = userId
        ? await enrichConversations(convList, userId)
        : convList;
      const currentConv = enriched.find((c) => c.id === conversationId);
      
      if (currentConv) {
        setConversation(currentConv);
        if (currentConv.listingTitle) {
          setListingTitle(currentConv.listingTitle);
        } else if (currentConv.listing?.title) {
          setListingTitle(currentConv.listing.title);
        }
      } else {
        setConversation({
          id: conversationId,
          contextType: 'listing_interest',
          contextId: '',
          participants: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const history = await fetchMessageHistory(conversationId, { limit: 30 });
      const sortedMessages = [...history.items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sortedMessages);
      setNextCursor(history.nextCursor);
      setHasMore(history.hasMore);

      // Connect Socket.IO for realtime updates
      socketRef.current?.disconnect();
      setPeerTyping(false);
      const me = userId;
      const socket = new ConversationSocket({
        onStatus: setSocketStatus,
        onError: (message) => setError(message),
        onMessage: (message) => {
          const normalized = {
            ...message,
            conversationId: message.conversationId || conversationId,
          };
          if (normalized.conversationId && normalized.conversationId !== conversationId) {
            return;
          }

          // Own echo from server room broadcast — replace optimistic temp row
          if (me && normalized.senderId === me && pendingClientIdsRef.current.size > 0) {
            const pendingId = [...pendingClientIdsRef.current][0];
            confirmOutgoing(pendingId, normalized);
            return;
          }

          mergeMessages([normalized]);
          if (me && normalized.senderId !== me) {
            setPeerTyping(false);
            ackPeerReceipts(conversationId, normalized.id, socketRef.current);
          }
        },
        onDelivered: (state) => {
          if (state.conversationId !== conversationId) return;
          if (me && state.userId === me) return;
          setMessages((prev) =>
            applyDelivered(prev, state.messageIds, state.deliveredAt)
          );
        },
        onRead: (state) => {
          if (state.conversationId !== conversationId) return;
          if (me && state.userId === me) return;
          const readAt = state.readAt || state.updatedAt;
          setMessages((prev) => {
            if (state.messageIds && state.messageIds.length > 0) {
              return applyRead(prev, state.messageIds, readAt);
            }
            // Fallback: mark own messages up to lastReadMessageId by createdAt cutoff
            const cutoff = prev.find((m) => m.id === state.lastReadMessageId);
            const cutoffTime = cutoff
              ? new Date(cutoff.createdAt).getTime()
              : null;
            return prev.map((m) => {
              if (!me || m.senderId !== me) return m;
              const shouldRead =
                m.id === state.lastReadMessageId ||
                (cutoffTime !== null &&
                  new Date(m.createdAt).getTime() <= cutoffTime);
              if (!shouldRead) return m;
              return {
                ...m,
                readAt,
                deliveredAt: m.deliveredAt || readAt,
                status: 'read' as const,
                isRead: true,
              };
            });
          });
        },
        onTyping: (event) => {
          if (event.conversationId !== conversationId) return;
          if (me && event.userId === me) return;
          setPeerTyping(event.active);
        },
      });
      socketRef.current = socket;

      const lastIncoming = [...sortedMessages]
        .reverse()
        .find((m) => me && m.senderId !== me);

      try {
        await socket.connect();
        await socket.join(conversationId);
        socket.setPresence(conversationId, true);
        if (lastIncoming) {
          ackPeerReceipts(conversationId, lastIncoming.id, socket);
        }
      } catch (value) {
        const message =
          value instanceof Error ? value.message : 'Realtime is unavailable.';
        setRealtimeNotice(
          /realtime|socket|websocket|origin|unauthorized|timed out/i.test(message)
            ? 'Realtime delivery unavailable — messages still send over secure REST.'
            : message
        );
        setSocketStatus('failed');
        // Socket failed — still ack newest peer message via REST
        if (lastIncoming) {
          ackPeerReceipts(conversationId, lastIncoming.id, null);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load conversation thread.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, userId, mergeMessages, confirmOutgoing]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitialData();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [loadInitialData]);

  // Auto scroll to bottom when initial messages load or when user sends message
  React.useEffect(() => {
    if (!isLoading && (messages.length > 0 || peerTyping)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading, messages.length, peerTyping]);

  const emitTyping = React.useCallback(
    (active: boolean) => {
      if (!conversationId || socketStatus !== 'connected') return;
      socketRef.current?.setTyping(conversationId, active);
    },
    [conversationId, socketStatus]
  );

  const handleComposerChange = (value: string) => {
    setComposerText(value);
    if (!conversationId || socketStatus !== 'connected' || cannotMessage) return;
    emitTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitTyping(false), 1200);
  };

  // Load older messages via cursor
  const handleLoadOlderMessages = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const history = await fetchMessageHistory(conversationId, {
        cursor: nextCursor,
        limit: 30,
      });

      const sortedOlder = [...history.items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newUnique = sortedOlder.filter((m) => !existingIds.has(m.id));
        return [...newUnique, ...prev];
      });

      setNextCursor(history.nextCursor);
      setHasMore(history.hasMore);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const body = composerText.trim();
    if (!body || isSending || cannotMessage || chatClosed) return;

    const clientId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg-${Date.now()}`;

    // Optimistic message update — Sent until peer acks
    const tempMsg: ChatMessage = {
      id: clientId,
      conversationId,
      senderId: user?.id || 'me',
      content: body,
      isRead: false,
      deliveredAt: null,
      readAt: null,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    mergeMessages([tempMsg]);
    pendingClientIdsRef.current.add(clientId);
    setComposerText('');
    setIsSending(true);
    emitTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    try {
      const socket = socketRef.current;
      const confirmed =
        socket?.connected && socketStatus === 'connected'
          ? await socket.send(conversationId, clientId, body)
          : await sendMessage(conversationId, body, clientId);
      confirmOutgoing(clientId, {
        ...confirmed,
        status: confirmed.status || 'sent',
        deliveredAt: confirmed.deliveredAt ?? null,
        readAt: confirmed.readAt ?? null,
      });
    } catch (err: unknown) {
      pendingClientIdsRef.current.delete(clientId);
      // Backend rejects sends on expired chats with 409 — treat it as the
      // authoritative "this chat is closed" signal and flip the local state.
      if (isChatClosedError(err)) {
        setConversation((prev) =>
          prev ? { ...prev, contextState: 'expired' as const } : prev
        );
        showToast({
          title: 'Chat Closed',
          description: 'This chat is closed because the post has expired.',
          variant: 'error',
        });
        setMessages((prev) => prev.filter((m) => m.id !== clientId));
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to send message.';
      showToast({
        title: 'Send Error',
        description: msg,
        variant: 'error',
      });
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Block / Unblock handler
  const handleToggleBlock = async () => {
    if (!peer?.id || peer.id.startsWith('listing-')) return;
    setIsBlocking(true);
    try {
      if (isBlocked) {
        await unblockUser(peer.id);
        setIsBlocked(false);
        showToast({
          title: 'User Unblocked',
          description: `${peerDisplayName} has been unblocked.`,
          variant: 'success',
        });
      } else {
        await blockUser(peer.id);
        setIsBlocked(true);
        showToast({
          title: 'User Blocked',
          description: `${peerDisplayName} has been blocked from messaging you.`,
          variant: 'info',
        });
      }
      setShowBlockConfirm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update block status.';
      showToast({
        title: 'Action Failed',
        description: msg,
        variant: 'error',
      });
    } finally {
      setIsBlocking(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="space-y-3 py-6">
          <Skeleton className="h-12 w-2/3 rounded-2xl" />
          <Skeleton className="h-12 w-1/2 ml-auto rounded-2xl" />
          <Skeleton className="h-12 w-3/4 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <ErrorState
          title="Conversation Error"
          description={error}
          onRetry={loadInitialData}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-t-2xl border border-border bg-card shadow-xs shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
            className="size-9 rounded-full shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Button>

          <div className="relative shrink-0">
            <div className="size-10 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center">
              {peer?.avatarUrl ? (
                <Image
                  src={peer.avatarUrl}
                  alt={peerDisplayName}
                  width={40}
                  height={40}
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-5 text-primary" />
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-foreground truncate">
                {peerDisplayName}
              </h2>
              {conversation?.contextType && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 max-w-[200px] sm:max-w-[300px] truncate ${
                    conversation.contextType === 'listing_interest'
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  }`}
                >
                  {conversation.contextType === 'listing_interest'
                    ? (listingTitle || conversation.listingTitle || conversation.listing?.title
                        ? `Listing: ${listingTitle || conversation.listingTitle || conversation.listing?.title}`
                        : 'Listing')
                    : (conversation.roommatePostTitle || conversation.roommatePost?.title
                        ? `Roommate: ${conversation.roommatePostTitle || conversation.roommatePost?.title}`
                        : 'Roommate')}
                </Badge>
              )}
              {chatClosed && (
                <Badge
                  variant="warning"
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                >
                  Post expired
                </Badge>
              )}
              {socketStatus === 'connected' && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">Live</span>
              )}
            </div>
            {peer?.bio && <p className="text-[11px] text-muted-foreground truncate">{peer.bio}</p>}
          </div>
        </div>

        {/* Header Actions Menu */}
        <div className="relative shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="size-9 rounded-xl border-border"
          >
            <MoreVertical className="size-4 text-muted-foreground" />
          </Button>

          {showOptionsMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-lg z-50 text-xs">
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  setShowReportDialog(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent text-foreground transition-colors"
              >
                <Flag className="size-4 text-amber-500" />
                Report Thread / User
              </button>
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  setShowBlockConfirm(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors font-medium"
              >
                <Ban className="size-4" />
                {isBlocked ? 'Unblock User' : 'Block User'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 border-x border-border bg-muted/10 p-4 overflow-y-auto space-y-4" ref={scrollContainerRef}>
        {realtimeNotice && socketStatus !== 'connected' && (
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
            <span>{realtimeNotice}</span>
            <button
              type="button"
              className="shrink-0 underline-offset-2 hover:underline"
              onClick={() => setRealtimeNotice(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Roommate Post Context Banner */}
        {conversation?.contextType === 'roommate_interest' &&
          (conversation.roommatePostTitle || conversation.roommatePost?.title) && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-3.5 py-2.5 text-xs text-muted-foreground flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="size-4 text-purple-500 shrink-0" />
                <span className="truncate">
                  Regarding Roommate Post:{' '}
                  <strong className="text-foreground font-semibold">
                    {conversation.roommatePostTitle || conversation.roommatePost?.title}
                  </strong>
                </span>
              </div>
              <Link
                href="/roommates"
                className="text-purple-600 dark:text-purple-400 font-medium hover:underline text-[11px] shrink-0"
              >
                View Posts
              </Link>
            </div>
          )}

        {/* Contact Share Card */}
        <ContactShareCard
          conversationId={conversationId}
          currentUserId={user?.id}
          listingInterestId={conversation?.contextType === 'listing_interest' ? conversation.contextId : undefined}
          roommateInterestId={conversation?.contextType === 'roommate_interest' ? conversation.contextId : undefined}
        />

        {/* Load older messages button */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadOlderMessages}
              disabled={isLoadingMore}
              className="text-xs rounded-full"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1" />
                  Loading older messages...
                </>
              ) : (
                'Load older messages'
              )}
            </Button>
          </div>
        )}

        {/* Messages Feed */}
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs space-y-1">
            <p className="font-semibold text-foreground">Conversation Started</p>
            <p>Send a message below to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = Boolean(user?.id) && msg.senderId === user?.id;
            const status = isMe ? receiptStatus(msg) : null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div
                  className={
                    isMe
                      ? 'max-w-[70%] sm:max-w-[62%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm shadow-sm bg-primary text-primary-foreground'
                      : 'max-w-[85%] sm:max-w-[75%] px-3.5 py-2 rounded-2xl rounded-bl-md text-[13px] leading-relaxed shadow-xs bg-card border border-border text-card-foreground'
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-1">
                  <time dateTime={msg.createdAt}>{formatDate(msg.createdAt)}</time>
                  {isMe && status && (
                    <span className="ml-0.5 inline-flex items-center gap-0.5">
                      {status === 'sent' ? (
                        <Check className="size-3.5 text-muted-foreground inline" />
                      ) : (
                        <CheckCheck
                          className={`size-3.5 inline ${
                            status === 'read'
                              ? 'text-blue-500'
                              : 'text-muted-foreground'
                          }`}
                        />
                      )}
                      {status === 'read' && msg.readAt ? (
                        <time dateTime={msg.readAt}>{receiptLabel(msg)}</time>
                      ) : (
                        <span>{receiptLabel(msg)}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        {peerTyping && (
          <div className="flex flex-col items-start space-y-1">
            <div className="max-w-[70%] px-3.5 py-2 rounded-2xl rounded-bl-md text-[12px] shadow-xs bg-card border border-border text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-pulse" />
                <span
                  className="size-1.5 rounded-full bg-muted-foreground/70 animate-pulse"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="size-1.5 rounded-full bg-muted-foreground/70 animate-pulse"
                  style={{ animationDelay: '300ms' }}
                />
                <span className="ml-1">typing…</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Bar */}
      <div className="p-3 sm:p-4 rounded-b-2xl border border-border bg-card shadow-xs shrink-0">
        {chatClosed ? (
          <InfoBanner
            tone="warning"
            icon={<Lock className="size-4" />}
            title="Chat Closed"
            description="This chat is closed because the post has expired."
            className="justify-center p-3"
          />
        ) : cannotMessage ? (
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium">
            <Lock className="size-4" />
            {isBlockedByPeer
              ? 'This user has blocked you — you cannot send them messages.'
              : 'You blocked this user. Unblock to resume messaging.'}
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <Textarea
              placeholder="Type your message... (Press Enter to send)"
              value={composerText}
              onChange={(e) => handleComposerChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none text-xs sm:text-sm rounded-xl min-h-[44px] max-h-32"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!composerText.trim() || isSending}
              className="size-11 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              {isSending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Send className="size-5" />
              )}
            </Button>
          </form>
        )}
      </div>

      {/* Block Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={handleToggleBlock}
        title={isBlocked ? 'Unblock User?' : 'Block User?'}
        description={
          isBlocked
            ? `Are you sure you want to unblock ${peerDisplayName}? They will be able to message you again.`
            : `Are you sure you want to block ${peerDisplayName}? They will no longer be able to send messages or contact details.`
        }
        confirmLabel={isBlocked ? 'Unblock' : 'Block'}
        isDestructive={!isBlocked}
        isLoading={isBlocking}
      />

      {/* Report Content Dialog */}
      {peer && !peer.id.startsWith('listing-') && (
        <ReportDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          targetType="user"
          targetId={peer.id}
          targetTitle={peerDisplayName}
        />
      )}
    </main>
  );
}
