/**
 * Chat & Safety API Service
 * Handles conversation listing, message history, sending messages, read receipts,
 * contact share requests, blocking/unblocking users, and reporting content.
 * Reference: OpenAPI specification (`docs/openai.json`) -> `/api/v1/conversations`, `/api/v1/users/{id}/block`, `/api/v1/reports`, `/api/v1/contact-share/{id}`
 */

import { apiFetch } from '@/lib/api/client';
import {
  Conversation,
  ChatMessage,
  ContactShare,
  PublicUser,
  MessageReceiptStatus,
  RoommateInterest,
  RoommatePost,
} from '@/types';
import { fetchRoommateInterests, fetchRoommatePosts } from './roommates';

export interface DeliveredState {
  conversationId: string;
  upToMessageId: string;
  deliveredAt: string;
  messageIds: string[];
}

export interface ReadState {
  conversationId: string;
  lastReadMessageId: string;
  updatedAt: string;
  readAt?: string;
  messageIds?: string[];
}

export function deriveMessageStatus(
  deliveredAt?: string | null,
  readAt?: string | null,
  status?: unknown
): MessageReceiptStatus {
  if (status === 'sent' || status === 'delivered' || status === 'read') {
    return status;
  }
  if (readAt) return 'read';
  if (deliveredAt) return 'delivered';
  return 'sent';
}

/**
 * True when a conversation is closed because its source post expired.
 */
export function isConversationExpired(
  conv: Pick<Conversation, 'contextState'> | null | undefined
): boolean {
  return conv?.contextState === 'expired';
}

/**
 * Classifies a send failure as "chat closed" — the backend rejects message
 * sends on expired conversations with HTTP 409 (REST) or an ack carrying
 * statusCode 409 (socket). Anything else is a generic send error.
 */
export function isChatClosedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status = (error as { status?: unknown }).status;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return status === 409 || statusCode === 409;
}

/**
 * Normalizes raw API response into a Conversation array.
 */
export function normalizeConversationsResponse(res: unknown): Conversation[] {
  if (!res) return [];

  let items: unknown[] = [];
  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    if ('data' in res && Array.isArray((res as { data: unknown[] }).data)) {
      items = (res as { data: unknown[] }).data;
    } else if ('items' in res && Array.isArray((res as { items: unknown[] }).items)) {
      items = (res as { items: unknown[] }).items;
    }
  }

  return items.map(mapRawToConversation);
}

/**
 * Normalizes raw API response into a paginated ChatMessage object.
 */
export function normalizeMessagesResponse(res: unknown): {
  items: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  if (!res) return { items: [], nextCursor: null, hasMore: false };

  let items: unknown[] = [];
  let nextCursor: string | null = null;
  let hasMore = false;

  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      items = obj.data;
    } else if (Array.isArray(obj.items)) {
      items = obj.items;
    } else if (Array.isArray(obj.messages)) {
      items = obj.messages;
    }

    if (typeof obj.nextCursor === 'string') {
      nextCursor = obj.nextCursor;
    } else if (typeof obj.cursor === 'string') {
      nextCursor = obj.cursor;
    }

    if (typeof obj.hasMore === 'boolean') {
      hasMore = obj.hasMore;
    } else {
      hasMore = Boolean(nextCursor);
    }
  }

  const mapped = items.map(mapRawToChatMessage);
  return { items: mapped, nextCursor, hasMore };
}

export function mapRawToConversation(item: unknown): Conversation {
  const raw = (item || {}) as Record<string, unknown>;
  const participantsRaw = Array.isArray(raw.participants) ? raw.participants : [];

  const participants: PublicUser[] = participantsRaw.map((p: unknown) => {
    const pr = (p || {}) as Record<string, unknown>;
    return {
      id: String(pr.id || ''),
      displayName: String(pr.displayName || pr.name || pr.display_name || 'User'),
      avatarUrl: typeof pr.avatarUrl === 'string' ? pr.avatarUrl : typeof pr.avatar_url === 'string' ? pr.avatar_url : null,
      bio: typeof pr.bio === 'string' ? pr.bio : null,
      collegeId: typeof pr.collegeId === 'string' ? pr.collegeId : typeof pr.college_id === 'string' ? pr.college_id : null,
      createdAt: String(pr.createdAt || pr.created_at || new Date().toISOString()),
    };
  });

  const listingTitle =
    typeof raw.listingTitle === 'string'
      ? raw.listingTitle
      : typeof raw.listing_title === 'string'
      ? raw.listing_title
      : undefined;

  const listingId =
    typeof raw.listingId === 'string'
      ? raw.listingId
      : typeof raw.listing_id === 'string'
      ? raw.listing_id
      : undefined;

  const listingObj =
    raw.listing && typeof raw.listing === 'object'
      ? (raw.listing as { id?: string; title?: string })
      : undefined;

  const roommatePostTitle =
    typeof raw.roommatePostTitle === 'string'
      ? raw.roommatePostTitle
      : typeof raw.roommate_post_title === 'string'
      ? raw.roommate_post_title
      : undefined;

  const roommatePostId =
    typeof raw.roommatePostId === 'string'
      ? raw.roommatePostId
      : typeof raw.roommate_post_id === 'string'
      ? raw.roommate_post_id
      : undefined;

  const roommatePostObj =
    raw.roommatePost && typeof raw.roommatePost === 'object'
      ? (raw.roommatePost as RoommatePost)
      : undefined;

  const contextState =
    raw.contextState === 'active' || raw.contextState === 'expired'
      ? raw.contextState
      : raw.context_state === 'active' || raw.context_state === 'expired'
        ? raw.context_state
        : undefined;

  return {
    id: String(raw.id || ''),
    contextType: (raw.contextType as Conversation['contextType']) || (raw.context_type as Conversation['contextType']) || 'listing_interest',
    contextId: String(raw.contextId || raw.context_id || ''),
    contextState,
    listingId,
    listingTitle,
    listing: listingObj,
    roommatePostId,
    roommatePostTitle,
    roommatePost: roommatePostObj,
    participants,
    lastMessage: raw.lastMessage ? mapRawToChatMessage(raw.lastMessage) : raw.last_message ? mapRawToChatMessage(raw.last_message) : null,
    unreadCount: typeof raw.unreadCount === 'number' ? raw.unreadCount : typeof raw.unread_count === 'number' ? raw.unread_count : 0,
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.updated_at || new Date().toISOString()),
  };
}

export function mapRawToChatMessage(item: unknown): ChatMessage {
  const raw = (item || {}) as Record<string, unknown>;
  const deliveredAt =
    typeof raw.deliveredAt === 'string'
      ? raw.deliveredAt
      : typeof raw.delivered_at === 'string'
        ? raw.delivered_at
        : null;
  const readAt =
    typeof raw.readAt === 'string'
      ? raw.readAt
      : typeof raw.read_at === 'string'
        ? raw.read_at
        : null;
  const status = deriveMessageStatus(deliveredAt, readAt, raw.status);
  const isRead = Boolean(raw.isRead || raw.read) || status === 'read' || Boolean(readAt);
  return {
    id: String(raw.id || ''),
    conversationId: String(
      raw.conversationId || raw.conversation_id || ''
    ),
    senderId: String(raw.senderId || raw.sender_id || raw.userId || raw.user_id || ''),
    content: String(raw.content || raw.body || ''),
    isRead,
    deliveredAt,
    readAt,
    status,
    createdAt: String(
      raw.createdAt || raw.created_at || new Date().toISOString()
    ),
  };
}

export function mapRawToContactShare(item: unknown): ContactShare {
  const raw = (item || {}) as Record<string, unknown>;
  return {
    id: String(raw.id || ''),
    conversationId: String(raw.conversationId || ''),
    senderId: String(raw.senderId || ''),
    receiverId: String(raw.receiverId || ''),
    phone: typeof raw.phone === 'string' ? raw.phone : undefined,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    status: (raw.status as ContactShare['status']) || 'pending',
    createdAt: String(raw.createdAt || new Date().toISOString()),
  };
}

/**
 * Initiates a chat conversation thread.
 */
export async function createConversation(
  contextType: 'listing_interest' | 'roommate_interest',
  contextId: string
): Promise<Conversation> {
  if (!contextId) {
    throw new Error('Context ID is required');
  }

  const res = await apiFetch<unknown>({
    path: '/api/v1/conversations',
    method: 'POST',
    body: { contextType, contextId },
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToConversation(raw || { contextType, contextId });
}

/**
 * Fetches all chat conversations for the current logged-in user.
 */
export async function fetchConversations(): Promise<Conversation[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/conversations',
      method: 'GET',
    });

    return normalizeConversationsResponse(res);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return [];
  }
}

/**
 * Retrieves message history for a conversation with cursor pagination.
 */
export async function fetchMessageHistory(
  conversationId: string,
  options?: { cursor?: string; limit?: number }
): Promise<{ items: ChatMessage[]; nextCursor: string | null; hasMore: boolean }> {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }

  const queryParams = new URLSearchParams();
  if (options?.cursor) queryParams.set('cursor', options.cursor);
  if (options?.limit) queryParams.set('limit', String(options.limit));

  const queryString = queryParams.toString();
  const path = `/api/v1/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;

  try {
    const res = await apiFetch<unknown>({
      path,
      method: 'GET',
    });

    return normalizeMessagesResponse(res);
  } catch (error) {
    console.error('Failed to fetch message history:', error);
    return { items: [], nextCursor: null, hasMore: false };
  }
}

/**
 * Sends a message in a conversation.
 * Uses client-generated UUID `clientId` for idempotency.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
  clientId?: string
): Promise<ChatMessage> {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  if (!body.trim()) {
    throw new Error('Message body cannot be empty');
  }

  const generatedId =
    clientId ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  const res = await apiFetch<unknown>({
    path: `/api/v1/conversations/${conversationId}/messages`,
    method: 'POST',
    body: {
      clientId: generatedId,
      body: body.trim(),
    },
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToChatMessage(
    raw || {
      id: generatedId,
      conversationId,
      content: body.trim(),
      createdAt: new Date().toISOString(),
    }
  );
}

/**
 * Marks peer messages up to `messageId` as delivered (WhatsApp double tick).
 */
export async function markMessageDelivered(
  conversationId: string,
  messageId: string
): Promise<void> {
  if (!conversationId || !messageId) {
    return;
  }

  await apiFetch<unknown>({
    path: `/api/v1/conversations/${conversationId}/delivered/${messageId}`,
    method: 'PATCH',
  });
}

/**
 * Marks messages up to `messageId` as read.
 */
export async function markMessageRead(conversationId: string, messageId: string): Promise<void> {
  if (!conversationId || !messageId) {
    return;
  }

  await apiFetch<unknown>({
    path: `/api/v1/conversations/${conversationId}/read/${messageId}`,
    method: 'PATCH',
  });
}

/**
 * Requests contact information sharing permission for a conversation.
 */
export async function requestContactShare(conversationId: string): Promise<ContactShare> {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }

  const res = await apiFetch<unknown>({
    path: `/api/v1/conversations/${conversationId}/contact-share`,
    method: 'POST',
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToContactShare(raw || { conversationId, status: 'pending' });
}

/**
 * Accepts, rejects, or cancels a contact share request.
 */
export async function resolveContactShare(
  shareId: string,
  status: 'accepted' | 'rejected' | 'cancelled'
): Promise<ContactShare> {
  if (!shareId) {
    throw new Error('Contact share ID is required');
  }

  const res = await apiFetch<unknown>({
    path: `/api/v1/contact-share/${shareId}`,
    method: 'PATCH',
    body: { status },
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToContactShare(raw || { id: shareId, status });
}

/**
 * Retrieves unmasked contact details if a contact share request was accepted.
 */
export async function getSharedContactDetails(shareId: string): Promise<ContactShare> {
  if (!shareId) {
    throw new Error('Contact share ID is required');
  }

  const res = await apiFetch<unknown>({
    path: `/api/v1/contact-share/${shareId}`,
    method: 'GET',
  });

  const raw = (typeof res === 'object' && res !== null && 'data' in res
    ? (res as { data: unknown }).data
    : res) as Record<string, unknown>;

  return mapRawToContactShare(raw || { id: shareId });
}

/**
 * Blocks a user from sending chat messages or contacting.
 */
export async function blockUser(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  await apiFetch<unknown>({
    path: `/api/v1/users/${userId}/block`,
    method: 'POST',
  });
}

/**
 * Unblocks a previously blocked user.
 */
export async function unblockUser(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  await apiFetch<unknown>({
    path: `/api/v1/users/${userId}/block`,
    method: 'DELETE',
  });
}

/**
 * Fetches the IDs of every user the current user has blocked — server truth
 * for the Block/Unblock toggle (never keep this state in local storage).
 */
export async function fetchBlockedUsers(): Promise<string[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/users/blocked',
      method: 'GET',
    });
    if (!Array.isArray(res)) return [];
    return res
      .map((item) => (item as { blockedId?: string }).blockedId)
      .filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
}

/**
 * Fetches the IDs of every user who has blocked the current user — server
 * truth for the "this user blocked you, you can't contact them" state.
 */
export async function fetchBlockedByUsers(): Promise<string[]> {
  try {
    const res = await apiFetch<unknown>({
      path: '/api/v1/users/blocked-by',
      method: 'GET',
    });
    if (!Array.isArray(res)) return [];
    return res
      .map((item) => (item as { blockerId?: string }).blockerId)
      .filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
}

/**
 * Reports content or a user for suspicious/abusive behavior.
 */
export async function reportContent(params: {
  targetType: 'user' | 'listing' | 'roommate_post' | 'message';
  targetId: string;
  reason: string;
}): Promise<void> {
  if (!params.targetId || !params.reason.trim()) {
    throw new Error('Target ID and reason are required');
  }

  await apiFetch<unknown>({
    path: '/api/v1/reports',
    method: 'POST',
    body: {
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason.trim(),
    },
  });
}

/**
 * Enriches conversations with peer display names + listing titles.
 * Backend conversation list only returns { id, contextType, contextId, createdAt }.
 */
export async function enrichConversations(
  conversations: Conversation[],
  currentUserId: string
): Promise<Conversation[]> {
  if (!conversations.length) return conversations;

  let listingInterests: Array<{ id: string; listingId?: string; requesterId?: string }> = [];
  let roommateInterests: RoommateInterest[] = [];
  let roommatePostsList: RoommatePost[] = [];

  try {
    const [listingRes, roommateIntRes, roommatePostsRes] = await Promise.allSettled([
      apiFetch<unknown>({
        path: '/api/v1/listing-interests',
        method: 'GET',
      }),
      fetchRoommateInterests(currentUserId),
      fetchRoommatePosts(),
    ]);

    if (listingRes.status === 'fulfilled') {
      const res = listingRes.value;
      const list = Array.isArray(res)
        ? res
        : res && typeof res === 'object' && Array.isArray((res as { items?: unknown[] }).items)
          ? (res as { items: unknown[] }).items
          : res && typeof res === 'object' && Array.isArray((res as { data?: unknown[] }).data)
            ? (res as { data: unknown[] }).data
            : [];
      listingInterests = list.map((item) => {
        const obj = (item || {}) as Record<string, unknown>;
        return {
          id: String(obj.id || ''),
          listingId:
            typeof obj.listingId === 'string'
              ? obj.listingId
              : typeof obj.listing_id === 'string'
                ? obj.listing_id
                : undefined,
          requesterId:
            typeof obj.requesterId === 'string'
              ? obj.requesterId
              : typeof obj.requester_id === 'string'
                ? obj.requester_id
                : typeof obj.userId === 'string'
                  ? obj.userId
                  : typeof obj.user_id === 'string'
                    ? obj.user_id
                    : undefined,
        };
      });
    }

    if (roommateIntRes.status === 'fulfilled') {
      const grouped = roommateIntRes.value;
      roommateInterests = [...grouped.incoming, ...grouped.outgoing];
    }

    if (roommatePostsRes.status === 'fulfilled') {
      roommatePostsList = roommatePostsRes.value;
    }
  } catch {
    // continue
  }

  const listingInterestById = new Map(listingInterests.map((i) => [i.id, i]));
  const roommateInterestById = new Map(roommateInterests.map((i) => [i.id, i]));
  const roommateInterestByPostId = new Map(roommateInterests.map((i) => [i.postId, i]));
  const roommatePostMap = new Map(roommatePostsList.map((p) => [p.id, p]));

  const peerIds = new Set<string>();
  const listingIds = new Set<string>();
  const peerMetaMap = new Map<string, { displayName?: string; avatarUrl?: string }>();

  const drafted = conversations.map((conv) => {
    const participants = [...(conv.participants || [])];
    let peer = participants.find((p) => p.id && p.id !== currentUserId && !p.id.startsWith('listing-') && !p.id.startsWith('roommate-'));

    let listingId = conv.listingId;
    let roommatePostId = conv.roommatePostId;
    let roommatePostTitle = conv.roommatePostTitle;
    let roommatePost = conv.roommatePost;

    if (conv.contextType === 'listing_interest') {
      const interest = listingInterestById.get(conv.contextId);
      if (!peer?.id && interest?.requesterId && interest.requesterId !== currentUserId) {
        peer = {
          id: interest.requesterId,
          displayName: 'User',
          createdAt: new Date().toISOString(),
        };
        participants.push(peer);
      }
      listingId = listingId || interest?.listingId;
      if (listingId) listingIds.add(listingId);
    } else if (conv.contextType === 'roommate_interest') {
      const rmi = roommateInterestById.get(conv.contextId) || roommateInterestByPostId.get(conv.contextId);
      if (rmi) {
        const peerId =
          rmi.requesterUserId && rmi.requesterUserId !== currentUserId
            ? rmi.requesterUserId
            : rmi.postOwnerUserId && rmi.postOwnerUserId !== currentUserId
              ? rmi.postOwnerUserId
              : rmi.receiverUserId && rmi.receiverUserId !== currentUserId
                ? rmi.receiverUserId
                : rmi.userId && rmi.userId !== currentUserId
                  ? rmi.userId
                  : undefined;

        if (peerId) {
          const userMeta = rmi.user || rmi.post?.user;
          if (userMeta?.displayName) {
            peerMetaMap.set(peerId, {
              displayName: userMeta.displayName,
              avatarUrl: userMeta.avatarUrl || undefined,
            });
          }
          if (!peer?.id) {
            peer = {
              id: peerId,
              displayName: userMeta?.displayName || 'User',
              avatarUrl: userMeta?.avatarUrl || null,
              createdAt: new Date().toISOString(),
            };
            participants.push(peer);
          }
        }

        roommatePostId = roommatePostId || rmi.postId || rmi.post?.id;
        roommatePost = roommatePost || rmi.post;
      }

      if (!roommatePostId && conv.contextId) {
        roommatePostId = conv.contextId;
      }

      const postFromMap = roommatePostId ? roommatePostMap.get(roommatePostId) : roommatePostMap.get(conv.contextId);
      if (postFromMap) {
        roommatePost = roommatePost || postFromMap;
        if (!roommatePostTitle) {
          roommatePostTitle = postFromMap.title || postFromMap.locationPreference || postFromMap.locality || postFromMap.description;
        }
      }

      if (!roommatePostTitle && rmi) {
        if (rmi.post?.title) {
          roommatePostTitle = rmi.post.title;
        } else if (rmi.post?.locationPreference || rmi.post?.locality) {
          roommatePostTitle = rmi.post.locationPreference || rmi.post.locality;
        } else if (rmi.message) {
          roommatePostTitle = `Request: ${rmi.message}`;
        }
      }

      if (!roommatePostTitle) {
        roommatePostTitle = 'Roommate Request';
      }
    }

    if (peer?.id && !peer.id.startsWith('listing-') && !peer.id.startsWith('roommate-')) {
      peerIds.add(peer.id);
    }

    return {
      ...conv,
      listingId,
      roommatePostId,
      roommatePostTitle,
      roommatePost,
      participants,
    };
  });

  await Promise.all(
    drafted.map(async (conv) => {
      try {
        const history = await fetchMessageHistory(conv.id, { limit: 20 });
        if (history.items && history.items.length > 0) {
          const sorted = [...history.items].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const latest = sorted[sorted.length - 1];
          if (latest) {
            if (!conv.lastMessage || new Date(latest.createdAt).getTime() > new Date(conv.lastMessage.createdAt).getTime()) {
              conv.lastMessage = latest;
            }
            if (new Date(latest.createdAt).getTime() > new Date(conv.updatedAt).getTime()) {
              conv.updatedAt = latest.createdAt;
            }
          }
          // Unread count is derived solely from peer messages that are not yet read.
          // Do not special-case "last message from me" (a peer message earlier in the
          // thread could still be unread) and do not rely on sessionStorage heuristics.
          const unreadMsgs = history.items.filter(
            (m) => m.senderId && m.senderId !== currentUserId && !m.isRead && m.status !== 'read'
          );
          conv.unreadCount = unreadMsgs.length;
        } else {
          conv.unreadCount = 0;
        }

        const hasPeerInParticipants = conv.participants.some(
          (p) => p.id && p.id !== currentUserId && !p.id.startsWith('listing-') && !p.id.startsWith('roommate-')
        );
        if (!hasPeerInParticipants) {
          const other = history.items.find(
            (m) => m.senderId && m.senderId !== currentUserId
          );
          if (other?.senderId) {
            peerIds.add(other.senderId);
            conv.participants = [
              ...conv.participants,
              {
                id: other.senderId,
                displayName: 'User',
                createdAt: new Date().toISOString(),
              },
            ];
          }
        }
      } catch {
        // ignore
      }
    })
  );

  const [profiles, listingTitles] = await Promise.all([
    Promise.all(
      [...peerIds].map(async (id) => {
        try {
          const res = await apiFetch<Record<string, unknown>>({
            path: `/api/v1/users/${id}/public`,
            method: 'GET',
          });
          const raw =
            res && typeof res === 'object' && 'data' in res
              ? ((res as { data: Record<string, unknown> }).data)
              : res;
          const displayName =
            typeof raw?.displayName === 'string'
              ? raw.displayName
              : typeof raw?.display_name === 'string'
                ? raw.display_name
                : typeof raw?.name === 'string'
                  ? raw.name
                  : undefined;
          return [id, displayName] as const;
        } catch {
          return [id, undefined] as const;
        }
      })
    ),
    Promise.all(
      [...listingIds].map(async (id) => {
        try {
          const res = await apiFetch<{ title?: string } | { data?: { title?: string } }>({
            path: `/api/v1/listings/${id}`,
            method: 'GET',
          });
          const title =
            res && typeof res === 'object' && 'title' in res
              ? res.title
              : res && typeof res === 'object' && 'data' in res
                ? res.data?.title
                : undefined;
          return [id, title] as const;
        } catch {
          return [id, undefined] as const;
        }
      })
    ),
  ]);

  const nameById = new Map(
    profiles.filter(([, name]) => Boolean(name)) as Array<[string, string]>
  );
  const listingTitleById = new Map(
    listingTitles.filter(([, title]) => Boolean(title)) as Array<[string, string]>
  );

  return drafted.map((conv) => {
    const listingTitle =
      conv.listingTitle ||
      conv.listing?.title ||
      (conv.listingId ? listingTitleById.get(conv.listingId) : undefined);

    const roommatePostTitle = conv.roommatePostTitle || conv.roommatePost?.title || (conv.contextType === 'roommate_interest' ? 'Roommate Request' : undefined);

    const participants = conv.participants.map((p) => {
      if (p.id === currentUserId) return p;
      const fetchedName = nameById.get(p.id);
      const metaName = peerMetaMap.get(p.id)?.displayName;
      const validExisting = p.displayName && p.displayName !== 'User' ? p.displayName : undefined;

      const finalName = fetchedName || metaName || validExisting || 'User';

      return {
        ...p,
        displayName: finalName,
      };
    });

    if (!participants.some((p) => p.id !== currentUserId)) {
      if (listingTitle) {
        participants.push({
          id: `listing-${conv.listingId || conv.contextId}`,
          displayName: listingTitle,
          createdAt: conv.createdAt,
        });
      } else if (roommatePostTitle) {
        participants.push({
          id: `roommate-${conv.roommatePostId || conv.contextId}`,
          displayName: roommatePostTitle,
          createdAt: conv.createdAt,
        });
      }
    }

    return {
      ...conv,
      listingTitle,
      listing: listingTitle
        ? { id: conv.listingId, title: listingTitle }
        : conv.listing,
      roommatePostTitle,
      roommatePost: roommatePostTitle && !conv.roommatePost
        ? ({ title: roommatePostTitle } as RoommatePost)
        : conv.roommatePost,
      participants,
    };
  });
}
