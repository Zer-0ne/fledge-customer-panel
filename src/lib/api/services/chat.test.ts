import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createConversation,
  fetchConversations,
  fetchMessageHistory,
  sendMessage,
  markMessageDelivered,
  markMessageRead,
  requestContactShare,
  resolveContactShare,
  getSharedContactDetails,
  blockUser,
  unblockUser,
  fetchBlockedUsers,
  fetchBlockedByUsers,
  reportContent,
  enrichConversations,
  normalizeConversationsResponse,
  normalizeMessagesResponse,
  mapRawToChatMessage,
  mapRawToConversation,
  deriveMessageStatus,
  isChatClosedError,
  isConversationExpired,
} from './chat';
import { apiFetch } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Chat & Safety API Service', () => {
  const mockApiFetch = vi.mocked(apiFetch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Normalizers', () => {
    it('normalizeConversationsResponse handles arrays and envelopes', () => {
      const rawList = [
        {
          id: 'conv-1',
          contextType: 'listing_interest',
          contextId: 'int-1',
          contextState: 'active',
          participants: [{ id: 'u-1', displayName: 'John' }],
          unreadCount: 2,
        },
      ];

      expect(normalizeConversationsResponse(rawList)).toHaveLength(1);
      expect(normalizeConversationsResponse({ data: rawList })).toHaveLength(1);
      expect(normalizeConversationsResponse({ items: rawList })).toHaveLength(1);
      expect(normalizeConversationsResponse(null)).toEqual([]);
    });

    it('mapRawToConversation parses contextState from camelCase and snake_case', () => {
      const expired = mapRawToConversation({
        id: 'conv-exp',
        contextType: 'listing_interest',
        contextId: 'int-1',
        contextState: 'expired',
      });
      expect(expired.contextState).toBe('expired');

      const snake = mapRawToConversation({
        id: 'conv-snake',
        contextType: 'roommate_interest',
        context_id: 'rm-1',
        context_state: 'expired',
      });
      expect(snake.contextState).toBe('expired');

      const active = mapRawToConversation({
        id: 'conv-active',
        contextType: 'listing_interest',
        contextId: 'int-1',
        contextState: 'active',
      });
      expect(active.contextState).toBe('active');

      const absent = mapRawToConversation({ id: 'conv-plain' });
      expect(absent.contextState).toBeUndefined();

      const invalid = mapRawToConversation({
        id: 'conv-bad',
        contextState: 'archived',
      });
      expect(invalid.contextState).toBeUndefined();
    });

    it('isConversationExpired only flags explicit expired state', () => {
      expect(isConversationExpired({ contextState: 'expired' })).toBe(true);
      expect(isConversationExpired({ contextState: 'active' })).toBe(false);
      expect(isConversationExpired({})).toBe(false);
      expect(isConversationExpired(null)).toBe(false);
      expect(isConversationExpired(undefined)).toBe(false);
    });

    it('isChatClosedError detects 409 from REST ApiError and socket acks', () => {
      expect(isChatClosedError({ status: 409 })).toBe(true);
      expect(isChatClosedError({ statusCode: 409 })).toBe(true);
      expect(isChatClosedError({ status: 400 })).toBe(false);
      expect(isChatClosedError({ statusCode: 403 })).toBe(false);
      expect(isChatClosedError(new Error('nope'))).toBe(false);
      expect(isChatClosedError('string')).toBe(false);
      expect(isChatClosedError(null)).toBe(false);
      expect(isChatClosedError(undefined)).toBe(false);
    });

    it('normalizeMessagesResponse handles paginated responses', () => {
      const raw = {
        data: [
          { id: 'msg-1', body: 'Hello', senderId: 'u-1', isRead: false },
          { id: 'msg-2', body: 'Hi', senderId: 'u-2', isRead: true },
        ],
        nextCursor: 'cursor-123',
        hasMore: true,
      };

      const result = normalizeMessagesResponse(raw);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].content).toBe('Hello');
      expect(result.nextCursor).toBe('cursor-123');
      expect(result.hasMore).toBe(true);
    });

    it('mapRawToChatMessage parses receipt fields and derives status', () => {
      const delivered = mapRawToChatMessage({
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        body: 'hi',
        deliveredAt: '2026-07-31T10:00:00Z',
      });
      expect(delivered.status).toBe('delivered');
      expect(delivered.deliveredAt).toBe('2026-07-31T10:00:00Z');
      expect(delivered.isRead).toBe(false);

      const read = mapRawToChatMessage({
        id: 'm2',
        conversation_id: 'c1',
        sender_id: 'u1',
        content: 'yo',
        read_at: '2026-07-31T11:00:00Z',
      });
      expect(read.status).toBe('read');
      expect(read.isRead).toBe(true);
      expect(read.readAt).toBe('2026-07-31T11:00:00Z');

      expect(deriveMessageStatus(null, null, 'sent')).toBe('sent');
    });
  });

  describe('API Endpoints', () => {
    it('createConversation sends correct payload', async () => {
      mockApiFetch.mockResolvedValueOnce({
        id: 'conv-100',
        contextType: 'listing_interest',
        contextId: 'int-100',
        contextState: 'active',
      });

      const res = await createConversation('listing_interest', 'int-100');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/conversations',
        method: 'POST',
        body: { contextType: 'listing_interest', contextId: 'int-100' },
      });
      expect(res.id).toBe('conv-100');
      expect(res.contextState).toBe('active');
    });

    it('fetchConversations retrieves conversation list', async () => {
      mockApiFetch.mockResolvedValueOnce([
        {
          id: 'conv-1',
          contextType: 'roommate_interest',
          contextId: 'rm-1',
          contextState: 'active',
        },
      ]);

      const res = await fetchConversations();
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/conversations',
        method: 'GET',
      });
      expect(res).toHaveLength(1);
      expect(res[0].contextType).toBe('roommate_interest');
      expect(res[0].contextState).toBe('active');
    });

    it('enrichConversations populates peer display name and roommate post title for roommate interest', async () => {
      mockApiFetch
        .mockResolvedValueOnce([]) // /api/v1/listing-interests
        .mockResolvedValueOnce([ // /api/v1/roommate-interests
          {
            id: 'rmi-1',
            postId: 'post-100',
            requesterUserId: 'user-sender',
            receiverUserId: 'user-me',
            post: { id: 'post-100', title: 'Looking for 1 BHK roommate in Baner' },
            user: { id: 'user-sender', displayName: 'khan sahil' },
          },
        ])
        .mockResolvedValueOnce({ displayName: 'khan sahil' }); // /api/v1/users/user-sender/public

      const convs = [
        {
          id: 'conv-10',
          contextType: 'roommate_interest' as const,
          contextId: 'rmi-1',
          contextState: 'active' as const,
          participants: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const enriched = await enrichConversations(convs, 'user-me');
      expect(enriched).toHaveLength(1);
      expect(enriched[0].roommatePostTitle).toBe('Looking for 1 BHK roommate in Baner');
      expect(enriched[0].participants[0]?.displayName).toBe('khan sahil');
      expect(enriched[0].contextState).toBe('active');
    });

    it('fetchMessageHistory includes cursor and limit parameters', async () => {
      mockApiFetch.mockResolvedValueOnce({
        data: [{ id: 'm1', content: 'Hey' }],
        nextCursor: 'next-1',
      });

      const res = await fetchMessageHistory('conv-1', { cursor: 'cur-1', limit: 20 });
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/conversations/conv-1/messages?cursor=cur-1&limit=20',
        method: 'GET',
      });
      expect(res.items).toHaveLength(1);
      expect(res.nextCursor).toBe('next-1');
    });

    it('sendMessage enforces idempotency clientId and sends body', async () => {
      mockApiFetch.mockResolvedValueOnce({
        id: 'msg-55',
        clientId: 'custom-client-id',
        body: 'Hello world',
      });

      const res = await sendMessage('conv-1', 'Hello world', 'custom-client-id');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/conversations/conv-1/messages',
        method: 'POST',
        body: {
          clientId: 'custom-client-id',
          body: 'Hello world',
        },
      });
      expect(res.content).toBe('Hello world');
    });

    it('markMessageDelivered sends PATCH to delivered endpoint', async () => {
      mockApiFetch.mockResolvedValueOnce({});
      await markMessageDelivered('conv-1', 'msg-10');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/conversations/conv-1/delivered/msg-10',
        method: 'PATCH',
      });
    });

    it('markMessageRead sends PATCH to read endpoint', async () => {
      mockApiFetch.mockResolvedValueOnce({});
      await markMessageRead('conv-1', 'msg-10');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/conversations/conv-1/read/msg-10',
        method: 'PATCH',
      });
    });

    it('contact share workflow works as expected', async () => {
      mockApiFetch.mockResolvedValueOnce({ id: 'cs-1', status: 'pending' });
      const reqRes = await requestContactShare('conv-1');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/conversations/conv-1/contact-share',
        method: 'POST',
      });
      expect(reqRes.status).toBe('pending');

      mockApiFetch.mockResolvedValueOnce({ id: 'cs-1', status: 'accepted' });
      const resolveRes = await resolveContactShare('cs-1', 'accepted');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/contact-share/cs-1',
        method: 'PATCH',
        body: { status: 'accepted' },
      });
      expect(resolveRes.status).toBe('accepted');

      mockApiFetch.mockResolvedValueOnce({ id: 'cs-1', phone: '+919876543210', email: 'test@example.com' });
      const detailsRes = await getSharedContactDetails('cs-1');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/contact-share/cs-1',
        method: 'GET',
      });
      expect(detailsRes.phone).toBe('+919876543210');
    });

    it('block and unblock user send correct requests', async () => {
      mockApiFetch.mockResolvedValueOnce({});
      await blockUser('user-99');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/users/user-99/block',
        method: 'POST',
      });

      mockApiFetch.mockResolvedValueOnce({});
      await unblockUser('user-99');
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/users/user-99/block',
        method: 'DELETE',
      });
    });

    it('fetchBlockedUsers returns the server blocked ids', async () => {
      mockApiFetch.mockResolvedValueOnce([
        { blockedId: 'user-1' },
        { blockedId: 'user-2' },
      ]);
      const ids = await fetchBlockedUsers();
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/users/blocked',
        method: 'GET',
      });
      expect(ids).toEqual(['user-1', 'user-2']);
    });

    it('fetchBlockedUsers soft-fails to an empty list', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('offline'));
      await expect(fetchBlockedUsers()).resolves.toEqual([]);
    });

    it('fetchBlockedByUsers returns the users who blocked me', async () => {
      mockApiFetch.mockResolvedValueOnce([
        { blockerId: 'user-9' },
      ]);
      const ids = await fetchBlockedByUsers();
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/users/blocked-by',
        method: 'GET',
      });
      expect(ids).toEqual(['user-9']);
    });

    it('reportContent posts report details', async () => {
      mockApiFetch.mockResolvedValueOnce({});
      await reportContent({
        targetType: 'message',
        targetId: 'msg-123',
        reason: 'Inappropriate message content',
      });
      expect(mockApiFetch).toHaveBeenCalledWith({
        path: '/api/v1/reports',
        method: 'POST',
        body: {
          targetType: 'message',
          targetId: 'msg-123',
          reason: 'Inappropriate message content',
        },
      });
    });
  });
});
