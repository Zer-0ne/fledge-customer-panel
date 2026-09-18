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
  createConversationSocket,
  type ConversationSocket,
  type SocketStatus,
} from '@/lib/api/services/chat-socket';
import { Conversation, ChatMessage, MessageReceiptStatus } from '@/types';
import { formatChatDay, formatChatTime, isSameDay } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/trust/trust-badge';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ReportDialog } from '@/components/chat/report-dialog';
import { ContactShareCard } from '@/components/chat/contact-share-card';
import { HousingResponseBanner } from '@/components/neednow/housing-response-banner';
import {
  fetchHousingResponse,
  getRequest,
  NEED_NOW_INTENT_LABELS,
  formatBudgetRangePaise,
} from '@/lib/api/services/neednow';
import { showToast } from '@/components/ui/toast';
import { InfoBanner } from '@/components/ui/info-banner';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Timer,
  User,
  Users,
  Home,
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  Loader2,
  MessageCircle,
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

/** Compact receipt wording for tooltips and screen readers ("Read 6:17 pm"). */
function receiptTitle(msg: ChatMessage): string {
  const status = receiptStatus(msg);
  if (status === 'read') {
    const when = msg.readAt ? formatChatTime(msg.readAt) : '';
    return when ? `Read ${when}` : 'Read';
  }
  if (status === 'delivered') {
    const when = msg.deliveredAt ? formatChatTime(msg.deliveredAt) : '';
    return when ? `Delivered ${when}` : 'Delivered';
  }
  return 'Sent';
}

/**
 * Messages from the same sender collapse into one visual run; a pause longer
 * than this window (or a new day) starts a fresh run with its own meta line.
 */
const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;

function withinGroupWindow(earlier: ChatMessage, later: ChatMessage): boolean {
  return (
    isSameDay(earlier.createdAt, later.createdAt) &&
    Math.abs(new Date(later.createdAt).getTime() - new Date(earlier.createdAt).getTime()) <=
      MESSAGE_GROUP_WINDOW_MS
  );
}

/** Quiet centred day marker between message runs. */
function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pb-1 pt-4" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
        {label}
      </span>
      <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
    </div>
  );
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

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let a = 1; a <= maxAttempts; a++) {
    try { return await fn(); } catch (e: unknown) {
      lastErr = e;
      const status = (e as { statusCode?: number })?.statusCode ?? (e as { status?: number })?.status;
      if (status && status >= 400 && status < 500) break;
      if (a < maxAttempts) await new Promise(r => setTimeout(r, 400 * a + (a * 37) % 100));
    }
  }
  throw lastErr;
}
function ackPeerReceipts(
  conversationId: string,
  messageId: string,
  socket: ConversationSocket | null
): void {
  if (!conversationId || !messageId) return;
  const doAck = async () => {
    if (socket?.connected) {
      try { await socket.markRead(conversationId, messageId); return; } catch {}
      try { await socket.markDelivered(conversationId, messageId); } catch {}
    }
    // REST fallback with retry — guarantees persistence even if socket flaky
    await withRetry(() => markMessageRead(conversationId, messageId)).catch(() => {});
    await withRetry(() => markMessageDelivered(conversationId, messageId)).catch(() => {});
  };
  void doAck();
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

  // Chat-surface UI state: scroll position + composer growth/focus.
  const [atBottom, setAtBottom] = React.useState(true);
  const [readCount, setReadCount] = React.useState(0);
  const [composerFocused, setComposerFocused] = React.useState(false);

  // Jump-to-latest affordance is derived: it shows when the reader has
  // scrolled away from the end, and flags arrivals they have not reached yet.
  const showJumpToLatest = !atBottom;
  const hasNewBelow = !atBottom && messages.length > readCount;

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);
  const optionsMenuRef = React.useRef<HTMLDivElement>(null);
  const didInitialScrollRef = React.useRef(false);
  const loadingMoreRef = React.useRef(false);
  const stickToBottomRef = React.useRef(true);
  const prependAnchorRef = React.useRef<{ height: number; top: number } | null>(null);
  const socketRef = React.useRef<ConversationSocket | null>(null);
  const presenceCleanupRef = React.useRef<(() => void) | null>(null);
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClientIdsRef = React.useRef<Set<string>>(new Set());
  const [listingTitle, setListingTitle] = React.useState<string | null>(null);

  // Need Now threads: actual peer name + requirement context. Backend
  // conversation list participants/history often resolve to a generic
  // "Chat Participant" here (esp. responder view before the owner replies),
  // so resolve via the housing response + its request.
  const [housingPeer, setHousingPeer] = React.useState<{ id: string; displayName: string; avatarUrl?: string | null } | null>(null);
  const [housingContext, setHousingContext] = React.useState<{ requestId: string; title: string; location: string; budget: string } | null>(null);

  React.useEffect(() => {
    if (conversation?.contextType !== 'housing_request_response' || !conversation.contextId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHousingPeer(null);
    setHousingContext(null);
    (async () => {
      try {
        const res = await fetchHousingResponse(conversation.contextId);
        if (cancelled) return;
        const rawReq = (res.request || {}) as unknown as Record<string, unknown>;
        const intent = typeof rawReq.intentType === 'string' ? rawReq.intentType : '';
        const locObj = rawReq.location as { name?: unknown } | undefined;
        const locName =
          typeof rawReq.primaryLocationName === 'string'
            ? rawReq.primaryLocationName
            : typeof locObj?.name === 'string'
              ? locObj.name
              : '';
        const budgetObj = rawReq.budget as { minimumPaise?: unknown; maximumPaise?: unknown } | undefined;
        const min = typeof budgetObj?.minimumPaise === 'number' ? budgetObj.minimumPaise : 0;
        const max = typeof budgetObj?.maximumPaise === 'number' ? budgetObj.maximumPaise : 0;
        const summary = {
          requestId: res.housingRequestId,
          title: (NEED_NOW_INTENT_LABELS as Record<string, string>)[intent] || 'Need Now requirement',
          location: locName,
          budget: min > 0 || max > 0 ? `${formatBudgetRangePaise(min, max)}/mo` : '',
        };
        if (res.direction === 'received') {
          // Main owner hoon — saamne responder hai, uska actual naam dikhao.
          if (res.responder?.id) {
            setHousingPeer({ id: res.responder.id, displayName: res.responder.displayName || 'User', avatarUrl: res.responder.avatarUrl ?? null });
          }
          setHousingContext(summary);
        } else {
          // Maine response bheja — saamne request owner hai. Full request se
          // owner ka naam + context lao; expired/removed par summary fallback.
          try {
            const req = await getRequest(res.housingRequestId);
            if (cancelled) return;
            setHousingPeer({ id: req.owner.id, displayName: req.owner.displayName || 'User', avatarUrl: req.owner.avatarUrl ?? null });
            setHousingContext({
              requestId: req.id,
              title: NEED_NOW_INTENT_LABELS[req.intentType] || 'Need Now requirement',
              location: req.location?.name || '',
              budget: req.budget ? `${formatBudgetRangePaise(req.budget.minimumPaise, req.budget.maximumPaise)}/mo` : '',
            });
          } catch {
            if (!cancelled) setHousingContext(summary);
          }
        }
      } catch {
        // Header falls back to the generic entry — the thread keeps working.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversation?.contextType, conversation?.contextId]);

  // Peer participant
  const peer = React.useMemo(() => {
    if (!conversation) return null;
    const real = conversation.participants.find(
      (p) => p.id && p.id !== user?.id && !p.id.startsWith('listing-') && !p.id.startsWith('roommate-')
    );
    return real || conversation.participants.find((p) => p.id !== user?.id) || conversation.participants[0] || null;
  }, [conversation, user?.id]);

  const peerDisplayName = React.useMemo(() => {
    if (housingPeer?.displayName && housingPeer.displayName !== 'User') {
      return housingPeer.displayName;
    }
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
    if (conversation?.contextType === 'housing_request_response') return housingContext?.title || 'Need Now chat';
    return conversation?.contextType === 'roommate_interest' ? 'Roommate' : 'Chat Participant';
  }, [housingPeer, housingContext, peer, listingTitle, conversation]);

  // Block/report Mutation対象: real user id — housing threads me peer
  // participants se missing ho sakta hai, tab housingPeer (actual naam) use karo.
  const actionablePeerId = React.useMemo(() => {
    if (peer?.id && !peer.id.startsWith('listing-') && !peer.id.startsWith('roommate-')) return peer.id;
    return housingPeer?.id || null;
  }, [peer, housingPeer]);
  // never local storage — reloads and other devices must show the same truth.
  React.useEffect(() => {
    if (!actionablePeerId) return;
    const resolvedId = actionablePeerId;
    let cancelled = false;
    Promise.all([fetchBlockedUsers(), fetchBlockedByUsers()])
      .then(([mine, theirs]) => {
        if (cancelled) return;
        setIsBlocked(mine.includes(resolvedId));
        setIsBlockedByPeer(theirs.includes(resolvedId));
      })
      .catch(() => {});
    const onBlocked = (e: Event) => {
      const d = (e as CustomEvent).detail as {blockedId?: string; blockerId?: string; active?: boolean};
      if (d.blockedId === resolvedId) setIsBlocked(Boolean(d.active));
      if (d.blockerId === resolvedId) setIsBlockedByPeer(Boolean(d.active));
    };
    for (const evt of ['user:blocked','user:unblocked','user:blocked_by','user:unblocked_by'] as const) {
      window.addEventListener(evt, onBlocked);
    }
    return () => {
      cancelled = true;
      for (const evt of ['user:blocked','user:unblocked','user:blocked_by','user:unblocked_by'] as const) {
        window.removeEventListener(evt, onBlocked);
      }
    };
  }, [actionablePeerId]);

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
    stickToBottomRef.current = true;
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
      // Realtime updates — driver picked by NEXT_PUBLIC_REALTIME_DRIVER
      // (uwebsockets -> raw WS on REALTIME_UWS_PORT).
      const socket = createConversationSocket({
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
        // Presence heartbeat: foreground-only and deliberately infrequent;
        // the server allows two missed 4-minute heartbeats before expiry.
        const presenceHeartbeat = window.setInterval(() => {
          if (document.visibilityState === 'visible') {
            socketRef.current?.setPresence(conversationId, true);
          }
        }, 240_000);
        presenceCleanupRef.current = () => window.clearInterval(presenceHeartbeat);
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
      presenceCleanupRef.current?.();
      presenceCleanupRef.current = null;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [loadInitialData]);

  React.useLayoutEffect(() => {
    const anchor = prependAnchorRef.current;
    const node = scrollContainerRef.current;
    if (!anchor || !node) return;
    node.scrollTop = anchor.top + node.scrollHeight - anchor.height;
    prependAnchorRef.current = null;
  }, [messages.length]);

  // Follow new messages only while the reader is already at the bottom; the
  // jump-to-latest affordance is driven by scroll events (see handleChatScroll).
  React.useEffect(() => {
    if (isLoading) return;
    if (stickToBottomRef.current && (messages.length > 0 || peerTyping)) {
      const isFirstScroll = !didInitialScrollRef.current;
      didInitialScrollRef.current = true;
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: isFirstScroll ? 'auto' : 'smooth',
      });
    }
  }, [isLoading, messages.length, peerTyping]);

  const jumpToLatest = React.useCallback(() => {
    const node = scrollContainerRef.current;
    stickToBottomRef.current = true;
    setAtBottom(true);
    setReadCount(messages.length);
    node?.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const emitTyping = React.useCallback(
    (active: boolean) => {
      if (!conversationId || socketStatus !== 'connected') return;
      socketRef.current?.setTyping(conversationId, active);
    },
    [conversationId, socketStatus]
  );

  // Auto-grow the composer up to ~5 lines so long messages stay readable while
  // the send button keeps its place.
  React.useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 152)}px`;
  }, [composerText]);

  // The options menu closes on outside click / Escape like every other menu.
  React.useEffect(() => {
    if (!showOptionsMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!optionsMenuRef.current?.contains(event.target as Node)) setShowOptionsMenu(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowOptionsMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showOptionsMenu]);

  const handleComposerChange = (value: string) => {
    setComposerText(value);
    if (!conversationId || socketStatus !== 'connected' || cannotMessage) return;
    emitTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitTyping(false), 1200);
  };

  // Load older messages via cursor
  const handleLoadOlderMessages = async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    const node = scrollContainerRef.current;
    if (node) {
      prependAnchorRef.current = { height: node.scrollHeight, top: node.scrollTop };
    }
    loadingMoreRef.current = true;
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
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  const handleChatScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const atBottomNow = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
    stickToBottomRef.current = atBottomNow;
    setAtBottom(atBottomNow);
    if (atBottomNow) setReadCount(messages.length);
    if (node.scrollTop <= 120) void handleLoadOlderMessages();
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const body = composerText.trim();
    if (!body || isSending || cannotMessage || chatClosed) return;
    stickToBottomRef.current = true;

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
    if (!actionablePeerId) return;
    setIsBlocking(true);
    try {
      if (isBlocked) {
        await unblockUser(actionablePeerId);
        setIsBlocked(false);
        showToast({
          title: 'User Unblocked',
          description: `${peerDisplayName} has been unblocked.`,
          variant: 'success',
        });
      } else {
        await blockUser(actionablePeerId);
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
      <div className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="flex h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card/40 sm:h-[calc(100dvh-7rem)]">
          <div className="flex items-center gap-3 border-b border-border/60 p-3 sm:p-4">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
          <div className="flex-1 space-y-4 px-4 py-6">
            <Skeleton className="h-11 w-3/5 rounded-2xl" />
            <Skeleton className="ml-auto h-11 w-1/2 rounded-2xl" />
            <Skeleton className="h-16 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-11 w-2/5 rounded-2xl" />
          </div>
          <div className="border-t border-border/60 p-3 sm:p-4">
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <ErrorState
          title="Conversation Error"
          description={error}
          onRetry={loadInitialData}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-4xl flex-col px-3 py-4 sm:h-[calc(100dvh-7rem)] sm:px-6 sm:py-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/40 shadow-sm">
      {/* Header Bar */}
      <div
        className="relative z-20 flex items-center justify-between gap-2 border-b border-border/60 bg-background/60 p-3 sm:p-4"
        style={{ backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
            aria-label="Back to messages"
            className="size-9 rounded-full shrink-0"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>

          <div className="relative shrink-0">
            <div className="size-10 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center">
              {peer?.avatarUrl || housingPeer?.avatarUrl ? (
                <Image
                  src={(peer?.avatarUrl || housingPeer?.avatarUrl) as string}
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
              <h1 className="truncate text-[15px] font-semibold text-foreground sm:text-base">
                {peerDisplayName}
              </h1>
              {(peer?.id || housingPeer?.id) && !(peer?.id?.startsWith('listing-') || peer?.id?.startsWith('roommate-')) ? (
                <TrustBadge userId={(peer?.id || housingPeer?.id) as string} size={16} />
              ) : null}
              {conversation?.contextType === 'housing_request_response' ? (
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 max-w-[200px] sm:max-w-[300px] truncate border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  title={housingContext ? `${housingContext.title}${housingContext.location ? ` · ${housingContext.location}` : ''}` : 'Need Now'}
                >
                  Need Now{housingContext?.location ? `: ${housingContext.location}` : ''}
                </Badge>
              ) : conversation?.contextType && (
                <Badge
                  variant="outline"
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 max-w-[200px] sm:max-w-[300px] truncate ${
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
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                >
                  Post expired
                </Badge>
              )}
              {socketStatus === 'connected' && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                  title="Realtime connected — messages arrive instantly"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  Live
                </span>
              )}
            </div>
            {peer?.bio && <p className="text-xs text-muted-foreground truncate">{peer.bio}</p>}
          </div>
        </div>

        {/* Header Actions Menu */}
        <div className="relative shrink-0" ref={optionsMenuRef}>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            aria-label="Conversation options"
            aria-haspopup="menu"
            aria-expanded={showOptionsMenu}
            className="size-9 rounded-xl border-border"
          >
            <MoreVertical className="size-4 text-muted-foreground" aria-hidden="true" />
          </Button>

          {showOptionsMenu && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border bg-popover p-1.5 text-xs shadow-xl"
            >
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  setShowReportDialog(true);
                }}
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-foreground transition-colors hover:bg-accent"
              >
                <Flag className="size-4 text-amber-500" aria-hidden="true" />
                Report Thread / User
              </button>
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  setShowBlockConfirm(true);
                }}
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <Ban className="size-4" aria-hidden="true" />
                {isBlocked ? 'Unblock User' : 'Block User'}
              </button>
            </div>
          )}
        </div>
      </div>

      {conversation && (() => {
        const isRoommate = conversation.contextType === 'roommate_interest';
        const title = isRoommate
          ? conversation.roommatePostTitle || conversation.roommatePost?.title
          : listingTitle || conversation.listingTitle || conversation.listing?.title;
        const postId = isRoommate
          ? conversation.roommatePostId
          : conversation.listingId || conversation.listing?.id;
        if (!title) return null;
        return (
          <div className="border-b border-border/60 bg-muted/20 px-3 py-2 sm:px-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 dark:bg-primary/10">
              <div className="flex min-w-0 items-center gap-2.5">
                {isRoommate ? <Users className="size-4 shrink-0 text-purple-500" /> : <Home className="size-4 shrink-0 text-primary" />}
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Related {isRoommate ? 'roommate post' : 'listing'}</p>
                  <p className="truncate text-xs font-semibold text-foreground">{title}</p>
                </div>
              </div>
              <Link href={isRoommate ? (postId ? `/roommate-interests?tab=incoming&postId=${postId}` : '/roommate-interests') : postId ? `/listings/${postId}` : '/listings'} className="shrink-0 text-xs font-medium text-primary hover:underline">
                View post
              </Link>
            </div>
          </div>
        );
      })()}
      {conversation?.contextType === 'housing_request_response' && housingContext && (
        <div className="border-b border-border/60 bg-muted/20 px-3 py-2 sm:px-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <Timer className="size-4 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Related Need Now requirement</p>
                <p className="truncate text-xs font-semibold text-foreground">
                  {housingContext.title}
                  {housingContext.location ? <span className="font-normal text-muted-foreground"> · {housingContext.location}</span> : null}
                  {housingContext.budget ? <span className="font-normal text-muted-foreground"> · {housingContext.budget}</span> : null}
                </p>
              </div>
            </div>
            <Link href={`/need-now/${housingContext.requestId}`} className="shrink-0 text-xs font-medium text-primary hover:underline">
              View requirement
            </Link>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="relative min-h-0 flex-1">
        <div
          className="absolute inset-0 space-y-4 overflow-y-auto overscroll-contain px-3 pb-4 pt-4 sm:px-4"
          ref={scrollContainerRef}
          onScroll={handleChatScroll}
          role="log"
          aria-label="Message history"
          aria-live="polite"
        >
        {realtimeNotice && socketStatus !== 'connected' && (
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
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

        {/* Housing-response lifecycle strip — accept/decline/withdraw inline */}
        {conversation?.contextType === 'housing_request_response' && conversation.contextId && (
          <HousingResponseBanner responseId={conversation.contextId} onChanged={() => void loadInitialData()} />
        )}

        {/* Contact Share Card */}
        <ContactShareCard
          conversationId={conversationId}
          currentUserId={user?.id}
          listingInterestId={conversation?.contextType === 'listing_interest' ? conversation.contextId : undefined}
          roommateInterestId={conversation?.contextType === 'roommate_interest' ? conversation.contextId : undefined}
          housingResponseId={conversation?.contextType === 'housing_request_response' ? conversation.contextId : undefined}
        />

        {hasMore && isLoadingMore && (
          <div className="flex justify-center py-2" role="status" aria-label="Loading older messages">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Messages Feed */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Start the conversation</p>
              <p className="mx-auto max-w-xs text-pretty text-xs text-muted-foreground">
                Say hello and introduce yourself — your move-in date, budget, or any question about the place.
                Never share payments before a visit.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((msg, index) => {
              const isMe = Boolean(user?.id) && msg.senderId === user?.id;
              const status = isMe ? receiptStatus(msg) : null;
              const prev = index > 0 ? messages[index - 1] : undefined;
              const next = index < messages.length - 1 ? messages[index + 1] : undefined;
              const startsDay = !prev || !isSameDay(prev.createdAt, msg.createdAt);
              const isFirstOfRun =
                startsDay || !prev || prev.senderId !== msg.senderId || !withinGroupWindow(prev, msg);
              const isLastOfRun =
                !next || !isSameDay(next.createdAt, msg.createdAt) || next.senderId !== msg.senderId || !withinGroupWindow(msg, next);

              return (
                <React.Fragment key={msg.id}>
                  {startsDay && <DaySeparator label={formatChatDay(msg.createdAt)} />}
                  <div
                    className={`flex min-w-0 flex-col ${isMe ? 'items-end' : 'items-start'} ${isFirstOfRun ? 'mt-3' : 'mt-0.5'}`}
                  >
                    <div
                      title={isLastOfRun ? undefined : formatChatTime(msg.createdAt)}
                      className={
                        isMe
                          ? `min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm bg-primary text-primary-foreground sm:max-w-[70%] ${
                              isFirstOfRun ? '' : 'rounded-tr-md'
                            } ${isLastOfRun ? '' : 'rounded-br-md'}`
                          : `min-w-0 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-xs bg-card border border-border text-card-foreground sm:max-w-[75%] ${
                              isFirstOfRun ? '' : 'rounded-tl-md'
                            } ${isLastOfRun ? '' : 'rounded-bl-md'}`
                      }
                    >
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
                    </div>

                    {isLastOfRun && (
                      <div className="mt-1 flex items-center gap-1 px-1.5 text-xs text-muted-foreground">
                        <time dateTime={msg.createdAt} className="tabular-nums">
                          {formatChatTime(msg.createdAt)}
                        </time>
                        {isMe && status && (
                          <span className="ml-0.5 inline-flex items-center gap-0.5" title={receiptTitle(msg)}>
                            {status === 'sent' ? (
                              <Check className="size-3.5" aria-hidden="true" />
                            ) : (
                              <CheckCheck
                                className={`size-3.5 ${status === 'read' ? 'text-blue-500' : 'text-muted-foreground'}`}
                                aria-hidden="true"
                              />
                            )}
                            <span className="sr-only">
                              {status === 'read' && msg.readAt ? (
                                <>
                                  Read <time dateTime={msg.readAt}>{formatChatTime(msg.readAt)}</time>
                                </>
                              ) : (
                                receiptTitle(msg)
                              )}
                            </span>
                            {status === 'read' && msg.readAt && <span className="hidden sm:inline">Read</span>}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
        {peerTyping && (
          <div className="mt-3 flex flex-col items-start" role="status" aria-label={`${peerDisplayName} is typing`}>
            <div className="max-w-[70%] rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 shadow-xs">
              <span className="inline-flex items-center gap-1" aria-hidden="true">
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/70" />
                <span
                  className="size-1.5 animate-pulse rounded-full bg-muted-foreground/70"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="size-1.5 animate-pulse rounded-full bg-muted-foreground/70"
                  style={{ animationDelay: '300ms' }}
                />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>

        {showJumpToLatest && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-background/95 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={hasNewBelow ? 'New messages — jump to latest' : 'Jump to latest messages'}
          >
            {hasNewBelow && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
            <ChevronDown className="size-3.5" aria-hidden="true" />
            {hasNewBelow ? 'New messages' : 'Latest'}
          </button>
        )}
      </div>

      {/* Composer Bar */}
      <div className="shrink-0 border-t border-border/60 bg-card p-3 sm:p-4">
        {chatClosed ? (
          <InfoBanner
            tone="warning"
            icon={<Lock className="size-4" />}
            title="Chat Closed"
            description="This chat is closed because the post has expired."
            className="justify-center p-3"
          />
        ) : cannotMessage ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
            <Lock className="size-4" aria-hidden="true" />
            {isBlockedByPeer
              ? 'This user has blocked you — you cannot send them messages.'
              : 'You blocked this user. Unblock to resume messaging.'}
          </div>
        ) : (
          <form onSubmit={handleSendMessage}>
            <div
              className={`flex items-end gap-2 rounded-2xl border bg-background/70 px-3 py-1.5 transition-colors ${
                composerFocused ? 'border-primary/50 ring-2 ring-primary/15' : 'border-border'
              }`}
            >
              <Textarea
                ref={composerRef}
                placeholder="Write a message…"
                aria-label="Message text"
                value={composerText}
                onChange={(e) => handleComposerChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                rows={1}
                className="max-h-40 min-h-[38px] resize-none border-0 bg-transparent px-0 py-2 text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                disabled={!composerText.trim() || isSending}
                className="mb-0.5 size-10 shrink-0 rounded-xl shadow-xs"
              >
                {isSending ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-5" aria-hidden="true" />
                )}
              </Button>
            </div>
            <div
              className={`mt-1.5 flex items-center justify-between px-1 text-xs text-muted-foreground transition-opacity ${
                composerFocused ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={!composerFocused}
            >
              <span>Enter to send · Shift + Enter for a new line</span>
            </div>
          </form>
        )}
      </div>
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
      {actionablePeerId && (
        <ReportDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          targetType="user"
          targetId={actionablePeerId}
          targetTitle={peerDisplayName}
        />
      )}
    </div>
  );
}
