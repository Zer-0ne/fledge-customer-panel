/**
 * Socket.IO client for ChatGateway realtime events.
 * Events mirror backend `src/chat/chat.gateway.ts` (read-only contract).
 */

'use client';

import { io, type Socket } from 'socket.io-client';
import type { ChatMessage } from '@/types';
import {
  deriveMessageStatus,
  type DeliveredState,
  type ReadState,
} from '@/lib/api/services/chat';

export type SocketStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export type UnreadCountsState = {
  unreadMessages: number;
  unreadNotifications: number;
};

export type ConversationUpdatedState = {
  conversationId: string;
  lastMessage: ChatMessage;
  unreadCount: number;
};

export type RealtimeNotificationPayload = {
  id: string;
  kind: string;
  title: string;
  body: string;
  createdAt: string;
};

export type ConversationCreatedState = {
  conversationId: string;
  housingResponseId?: string | null;
  requestId?: string | null;
};

export type ChatSocketHandlers = {
  onMessage?: (message: ChatMessage) => void;
  onDelivered?: (state: DeliveredState & { userId: string }) => void;
  onRead?: (state: ReadState & { userId: string }) => void;
  onTyping?: (event: {
    conversationId: string;
    userId: string;
    active: boolean;
  }) => void;
  onPresence?: (event: {
    conversationId: string;
    userId: string;
    active: boolean;
  }) => void;
  onUserUnreadCounts?: (counts: UnreadCountsState) => void;
  onConversationUpdated?: (event: ConversationUpdatedState) => void;
  onConversationCreated?: (event: ConversationCreatedState) => void;
  onNotificationCreated?: (notification: RealtimeNotificationPayload) => void;
  onStatus?: (status: SocketStatus) => void;
  onError?: (message: string) => void;
};

export type AckResult =
  | { ok: true; data?: unknown }
  | { ok: false; error: { statusCode: number; message: string } };

function socketUrl(): string {
  const value = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!value) {
    throw new Error('Realtime messaging is not configured (NEXT_PUBLIC_SOCKET_URL).');
  }
  return value.replace(/\/$/, '');
}

async function fetchSocketToken(): Promise<string> {
  const response = await fetch('/api/auth/socket-token', {
    method: 'POST',
    cache: 'no-store',
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const message =
      details &&
      typeof details === 'object' &&
      'error' in details &&
      typeof (details as { error: unknown }).error === 'object' &&
      (details as { error: { message?: unknown } }).error &&
      typeof (details as { error: { message?: unknown } }).error.message === 'string'
        ? (details as { error: { message: string } }).error.message
        : `Failed to obtain socket access token (${response.status})`;
    throw new Error(message);
  }
  const data = (await response.json()) as { token?: string };
  if (!data.token) throw new Error('Socket token missing from response');
  return data.token;
}

export function parseChatMessage(payload: unknown, conversationId?: string): ChatMessage {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<
    string,
    unknown
  >;
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
  return {
    id: String(raw.id || ''),
    conversationId: String(
      raw.conversationId || raw.conversation_id || conversationId || ''
    ),
    senderId: String(raw.senderId || raw.sender_id || ''),
    content: String(raw.body || raw.content || ''),
    isRead: Boolean(raw.isRead || raw.read) || status === 'read' || Boolean(readAt),
    deliveredAt,
    readAt,
    status,
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : typeof raw.created_at === 'string'
          ? raw.created_at
          : new Date().toISOString(),
  };
}

export function parseDeliveredState(
  payload: unknown,
  requireUser = true
): DeliveredState & { userId: string } {
  const item = (payload || {}) as Record<string, unknown>;
  const messageIds = Array.isArray(item.messageIds)
    ? item.messageIds.filter((id): id is string => typeof id === 'string')
    : Array.isArray(item.message_ids)
      ? item.message_ids.filter((id): id is string => typeof id === 'string')
      : [];
  const userId =
    typeof item.userId === 'string'
      ? item.userId
      : typeof item.user_id === 'string'
        ? item.user_id
        : '';
  if (requireUser && !userId) throw new Error('missing user');
  return {
    conversationId: String(item.conversationId || item.conversation_id || ''),
    upToMessageId: String(item.upToMessageId || item.up_to_message_id || ''),
    deliveredAt: String(
      item.deliveredAt || item.delivered_at || new Date().toISOString()
    ),
    messageIds,
    userId,
  };
}

export function parseReadState(
  payload: unknown,
  requireUser = true
): ReadState & { userId: string } {
  const item = (payload || {}) as Record<string, unknown>;
  const messageIds = Array.isArray(item.messageIds)
    ? item.messageIds.filter((id): id is string => typeof id === 'string')
    : Array.isArray(item.message_ids)
      ? item.message_ids.filter((id): id is string => typeof id === 'string')
      : undefined;
  const userId =
    typeof item.userId === 'string'
      ? item.userId
      : typeof item.user_id === 'string'
        ? item.user_id
        : '';
  if (requireUser && !userId) throw new Error('missing user');
  const updatedAt = String(
    item.updatedAt || item.updated_at || new Date().toISOString()
  );
  return {
    conversationId: String(item.conversationId || item.conversation_id || ''),
    lastReadMessageId: String(
      item.lastReadMessageId || item.last_read_message_id || ''
    ),
    updatedAt,
    readAt:
      typeof item.readAt === 'string'
        ? item.readAt
        : typeof item.read_at === 'string'
          ? item.read_at
          : updatedAt,
    messageIds,
    userId,
  };
}

export function parseUnreadCounts(payload: unknown): UnreadCountsState {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, unknown>;
  return {
    unreadMessages:
      typeof data.unreadMessages === 'number'
        ? data.unreadMessages
        : typeof data.unread_messages === 'number'
          ? data.unread_messages
          : 0,
    unreadNotifications:
      typeof data.unreadNotifications === 'number'
        ? data.unreadNotifications
        : typeof data.unread_notifications === 'number'
          ? data.unread_notifications
          : 0,
  };
}

export function parseConversationUpdated(payload: unknown): ConversationUpdatedState {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, unknown>;
  const conversationId = String(data.conversationId || data.conversation_id || '');
  const lastMessage = parseChatMessage(data.lastMessage || data.last_message, conversationId);
  const unreadCount =
    typeof data.unreadCount === 'number'
      ? data.unreadCount
      : typeof data.unread_count === 'number'
        ? data.unread_count
        : 0;
  return {
    conversationId,
    lastMessage,
    unreadCount,
  };
}

export function parseConversationCreated(payload: unknown): ConversationCreatedState {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, unknown>;
  const asOpt = (v: unknown): string | null => (typeof v === 'string' ? v : null);
  return {
    conversationId: String(data.conversationId || data.conversation_id || ''),
    housingResponseId: asOpt(data.housingResponseId ?? data.housing_response_id),
    requestId: asOpt(data.requestId ?? data.request_id),
  };
}

export function parseNotificationCreated(payload: unknown): RealtimeNotificationPayload {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, unknown>;
  return {
    id: String(data.id || ''),
    kind: String(data.kind || 'system'),
    title: String(data.title || 'Notification'),
    body: String(data.body || data.message || ''),
    createdAt:
      typeof data.createdAt === 'string'
        ? data.createdAt
        : typeof data.created_at === 'string'
          ? data.created_at
          : new Date().toISOString(),
  };
}

function ack<T>(
  socket: Socket,
  event: string,
  payload: unknown,
  parse: (value: unknown) => T
): Promise<T> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(12_000)
      .emit(event, payload, (error: Error | null, result?: AckResult) => {
        if (error) {
          reject(new Error(error.message || 'Socket acknowledgement timed out'));
          return;
        }
        if (!result?.ok) {
          const err = new Error(
            result?.error.message || 'Socket request failed'
          ) as Error & { statusCode?: number };
          // Keep the HTTP-equivalent status so callers can react to specific
          // failures (e.g. 409 = chat closed because the post expired).
          err.statusCode = result?.error.statusCode;
          reject(err);
          return;
        }
        try {
          resolve(parse(result.data));
        } catch {
          reject(new Error('Invalid socket response'));
        }
      });
  });
}

export class ConversationSocket {
  private socket?: Socket;
  private memoryToken?: string;
  private joined = new Set<string>();
  private disposed = false;

  constructor(private readonly handlers: ChatSocketHandlers = {}) {}

  get connected(): boolean {
    return Boolean(this.socket?.connected);
  }

  async connect(): Promise<void> {
    if (this.disposed) return;
    this.handlers.onStatus?.('connecting');
    this.memoryToken = await fetchSocketToken();

    const existing = this.socket;
    if (existing) {
      existing.auth = { token: this.memoryToken };
      if (existing.connected) {
        this.handlers.onStatus?.('connected');
        return;
      }
      await this.waitForConnection(existing);
      return;
    }

    const socket = io(socketUrl(), {
      autoConnect: false,
      // Match backend reference client: allow engine.io polling upgrade to websocket
      transports: ['websocket', 'polling'],
      withCredentials: false,
      auth: { token: this.memoryToken },
      reconnection: true,
      reconnectionAttempts: 8,
      timeout: 8_000,
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.handlers.onStatus?.('connected');
      for (const conversationId of this.joined) {
        void this.join(conversationId).catch(() => undefined);
      }
    });
    socket.on('connect_error', () => {
      // Reconnect attempts reuse the ORIGINAL handshake token — refresh it
      // up front so an expired JWT doesn't trap the socket in permanent
      // rejection (worker/backend 1008) until the page reloads.
      void this.renewAuth();
      this.handlers.onStatus?.('failed');
    });
    socket.on('disconnect', () =>
      this.handlers.onStatus?.(this.disposed ? 'disconnected' : 'reconnecting')
    );
    socket.io.on('reconnect_attempt', () => {
      this.handlers.onStatus?.('reconnecting');
      void this.renewAuth().catch((error: unknown) => {
        this.handlers.onError?.(
          error instanceof Error ? error.message : 'Socket reauthorization failed'
        );
      });
    });
    socket.on('reconnect_failed', () => this.handlers.onStatus?.('failed'));

    socket.on('message:created', (payload: unknown) => {
      try {
        this.handlers.onMessage?.(parseChatMessage(payload));
      } catch {
        this.handlers.onError?.('Ignored invalid realtime message');
      }
    });
    socket.on('message:delivered', (payload: unknown) => {
      try {
        this.handlers.onDelivered?.(parseDeliveredState(payload));
      } catch {
        this.handlers.onError?.('Ignored invalid delivery state');
      }
    });
    socket.on('conversation:read', (payload: unknown) => {
      try {
        this.handlers.onRead?.(parseReadState(payload));
      } catch {
        this.handlers.onError?.('Ignored invalid read state');
      }
    });
    socket.on('user:unread_counts', (payload: unknown) => {
      try {
        this.handlers.onUserUnreadCounts?.(parseUnreadCounts(payload));
      } catch {
        this.handlers.onError?.('Ignored invalid unread counts event');
      }
    });
    socket.on('conversation:updated', (payload: unknown) => {
      try {
        this.handlers.onConversationUpdated?.(parseConversationUpdated(payload));
      } catch {
        this.handlers.onError?.('Ignored invalid conversation updated event');
      }
    });
    socket.on('conversation:created', (payload: unknown) => {
      try {
        const created = parseConversationCreated(payload);
        if (created.conversationId) this.handlers.onConversationCreated?.(created);
      } catch {
        this.handlers.onError?.('Ignored invalid conversation created event');
      }
    });
    socket.on('notification:created', (payload: unknown) => {
      try {
        this.handlers.onNotificationCreated?.(parseNotificationCreated(payload));
      } catch {
        this.handlers.onError?.('Ignored invalid notification created event');
      }
    });
    for (const kind of ['typing', 'presence'] as const) {
      socket.on(kind, (payload: unknown) => {
        const item = payload as {
          conversationId?: unknown;
          userId?: unknown;
          active?: unknown;
        };
        if (
          typeof item.conversationId !== 'string' ||
          typeof item.userId !== 'string' ||
          typeof item.active !== 'boolean'
        ) {
          return;
        }
        const event = {
          conversationId: item.conversationId,
          userId: item.userId,
          active: item.active,
        };
        if (kind === 'typing') this.handlers.onTyping?.(event);
        else this.handlers.onPresence?.(event);
      });
    }

    await this.waitForConnection(socket);
  }

  private waitForConnection(socket: Socket): Promise<void> {
    if (socket.connected) {
      this.handlers.onStatus?.('connected');
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup();
        this.handlers.onStatus?.('failed');
        reject(
          new Error(
            'Realtime connection timed out; continuing with secure REST messaging.'
          )
        );
      }, 8_000);
      const onConnect = () => {
        cleanup();
        this.handlers.onStatus?.('connected');
        resolve();
      };
      const onError = (error: Error) => {
        cleanup();
        this.handlers.onStatus?.('failed');
        reject(
          new Error(
            error.message ||
              'Realtime connection failed; continuing with secure REST messaging.'
          )
        );
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      };
      socket.on('connect', onConnect);
      socket.on('connect_error', onError);
      socket.connect();
    });
  }

  async renewAuth(): Promise<void> {
    this.memoryToken = await fetchSocketToken();
    if (this.socket) this.socket.auth = { token: this.memoryToken };
  }

  async join(conversationId: string): Promise<void> {
    this.joined.add(conversationId);
    if (!this.socket?.connected) await this.connect();
    await ack(this.requireSocket(), 'conversation:join', { conversationId }, () =>
      conversationId
    );
  }

  async leave(conversationId: string): Promise<void> {
    this.joined.delete(conversationId);
    this.socket?.emit('typing', { conversationId, active: false }, () => undefined);
    this.socket?.emit('presence', { conversationId, active: false }, () => undefined);
  }

  async send(
    conversationId: string,
    clientId: string,
    body: string
  ): Promise<ChatMessage> {
    return ack(
      this.requireSocket(),
      'message:send',
      { conversationId, clientId, body },
      (data) => parseChatMessage(data, conversationId)
    );
  }

  async markDelivered(
    conversationId: string,
    messageId: string
  ): Promise<DeliveredState> {
    return ack(
      this.requireSocket(),
      'message:delivered',
      { conversationId, messageId },
      (data) => {
        const { userId: _u, ...rest } = parseDeliveredState(data, false);
        return rest;
      }
    );
  }

  async markRead(conversationId: string, messageId: string): Promise<ReadState> {
    return ack(
      this.requireSocket(),
      'conversation:read',
      { conversationId, messageId },
      (data) => {
        const { userId: _u, ...rest } = parseReadState(data, false);
        return rest;
      }
    );
  }

  setTyping(conversationId: string, active: boolean): void {
    // ChatGateway only runs the handler when an ack callback is present
    // (`ack?.({ ok: true, data: await operation() })` skips work if ack is missing).
    this.socket?.emit('typing', { conversationId, active }, () => undefined);
  }

  setPresence(conversationId: string, active: boolean): void {
    this.socket?.emit('presence', { conversationId, active }, () => undefined);
  }

  disconnect(): void {
    this.disposed = true;
    for (const conversationId of [...this.joined]) {
      void this.leave(conversationId);
    }
    this.joined.clear();
    this.memoryToken = undefined;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = undefined;
    this.handlers.onStatus?.('disconnected');
  }

  private requireSocket(): Socket {
    if (!this.socket) throw new Error('Socket is not connected');
    return this.socket;
  }
}

type SharedSocket = Pick<
  ConversationSocket,
  'connected' | 'connect' | 'renewAuth' | 'join' | 'leave' | 'send' |
  'markDelivered' | 'markRead' | 'setTyping' | 'setPresence' | 'disconnect'
>;

const sharedHandlers = new Set<ChatSocketHandlers>();
let sharedSocket: SharedSocket | null = null;
let socketLeases = 0;

function notify<K extends keyof ChatSocketHandlers>(
  key: K,
  ...args: Parameters<NonNullable<ChatSocketHandlers[K]>>
): void {
  for (const handlers of sharedHandlers) {
    try {
      const handler = handlers[key] as ((...values: typeof args) => void) | undefined;
      handler?.(...args);
    } catch {
      // One screen listener must not prevent the remaining global listeners.
    }
  }
}

const sharedHandlerProxy: ChatSocketHandlers = {
  onMessage: (value) => notify('onMessage', value),
  onDelivered: (value) => notify('onDelivered', value),
  onRead: (value) => notify('onRead', value),
  onTyping: (value) => notify('onTyping', value),
  onPresence: (value) => notify('onPresence', value),
  onUserUnreadCounts: (value) => notify('onUserUnreadCounts', value),
  onConversationUpdated: (value) => notify('onConversationUpdated', value),
  onConversationCreated: (value) => notify('onConversationCreated', value),
  onNotificationCreated: (value) => notify('onNotificationCreated', value),
  onStatus: (value) => notify('onStatus', value),
  onError: (value) => notify('onError', value),
};

export function createConversationSocket(
  handlers: ChatSocketHandlers = {},
): ConversationSocket {
  // Env-driven driver selection — NOT hardcoded to socket.io.
  // Backend REALTIME_DRIVER can be: socket.io | ws | uwebsockets | rust-native | cpp-native
  // Only socket.io needs the socket.io client; ALL other drivers speak raw RFC6455 WS at /realtime
  // (ws on app server, uwebsockets on :4003, rust-native on :4005, cpp-native on :4004).
  // This makes switching drivers a pure env change (NEXT_PUBLIC_REALTIME_DRIVER).
  const driver = process.env.NEXT_PUBLIC_REALTIME_DRIVER?.trim();
  if (!sharedSocket) {
    if (driver === 'socket.io') {
      sharedSocket = new ConversationSocket(sharedHandlerProxy);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { WsConversationSocket } = require('./ws-realtime-client');
      sharedSocket = new WsConversationSocket(
        sharedHandlerProxy,
        driver === 'cloudflare-edge'
      );
    }
  }

  sharedHandlers.add(handlers);
  socketLeases += 1;
  const socket = sharedSocket!;
  let released = false;
  return {
    get connected() { return socket.connected; },
    connect: () => socket.connect(),
    renewAuth: () => socket.renewAuth(),
    join: (id: string) => socket.join(id),
    leave: (id: string) => socket.leave(id),
    send: (id: string, clientId: string, body: string) => socket.send(id, clientId, body),
    markDelivered: (id: string, messageId: string) => socket.markDelivered(id, messageId),
    markRead: (id: string, messageId: string) => socket.markRead(id, messageId),
    setTyping: (id: string, active: boolean) => socket.setTyping(id, active),
    setPresence: (id: string, active: boolean) => socket.setPresence(id, active),
    disconnect: () => {
      if (released) return;
      released = true;
      sharedHandlers.delete(handlers);
      socketLeases -= 1;
      if (socketLeases === 0) {
        socket.disconnect();
        sharedSocket = null;
      }
    },
  } as unknown as ConversationSocket;
}
