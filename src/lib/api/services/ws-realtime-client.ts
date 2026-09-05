'use client';

import type {
  ChatSocketHandlers,
  AckResult,
} from './chat-socket';
import {
  parseChatMessage,
  parseConversationCreated,
  parseDeliveredState,
  parseReadState,
  parseUnreadCounts,
  parseConversationUpdated,
  parseNotificationCreated,
} from './chat-socket';
import type { ChatMessage } from '@/types';
import {
  markMessageDelivered,
  markMessageRead,
  sendMessage,
  type DeliveredState,
  type ReadState,
} from '@/lib/api/services/chat';

const MAX_FRAME_BYTES = 8192;
const ACK_TIMEOUT_MS = 12_000;
const MAX_RECONNECT_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 30_000;

const HEARTBEAT_INTERVAL_MS = 240_000;

type RealtimeRoute = {
  token: string;
  url: string;
  transport: 'cloudflare-edge' | 'uwebsockets';
  routeVersion: string;
};

function wsUrl(token: string, routedUrl?: string): string {
  const value = routedUrl?.trim() || process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!value) {
    throw new Error('Realtime messaging is not configured.');
  }
  const url = new URL(value);
  url.protocol = url.protocol === 'http:' ? 'ws:' : url.protocol === 'https:' ? 'wss:' : url.protocol;
  if (!routedUrl) url.pathname = `${url.pathname.replace(/\/$/, '')}/realtime`;
  url.searchParams.set('token', token);
  return url.toString();
}

async function fetchSocketRoute(fallbackDownstreamOnly: boolean): Promise<RealtimeRoute> {
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
  const data = (await response.json()) as Partial<RealtimeRoute>;
  if (!data.token) throw new Error('Socket token missing from response');
  return {
    token: data.token,
    url: typeof data.url === 'string' ? data.url : '',
    transport: data.transport === 'cloudflare-edge' || data.transport === 'uwebsockets'
      ? data.transport
      : fallbackDownstreamOnly ? 'cloudflare-edge' : 'uwebsockets',
    routeVersion: typeof data.routeVersion === 'string' ? data.routeVersion : 'static',
  };
}

type PendingAck = {
  resolve: (result: AckResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class WsConversationSocket {
  private ws?: WebSocket;
  private memoryToken?: string;
  private routeUrl?: string;
  private routeVersion?: string;
  private livenessTimer?: ReturnType<typeof setInterval>;
  private joined = new Set<string>();
  private disposed = false;
  private pending = new Map<string, PendingAck>();
  private reconnectAttempt = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private typing = new Map<string, boolean>();
  private connectPromise?: Promise<void>;

  constructor(
    private readonly handlers: ChatSocketHandlers = {},
    private downstreamOnly = false,
  ) {}

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.connected) {
      this.handlers.onStatus?.('connected');
      return Promise.resolve();
    }
    if (this.connectPromise) return this.connectPromise;
    const pending = this.connectOnce();
    this.connectPromise = pending;
    return pending.finally(() => {
      if (this.connectPromise === pending) this.connectPromise = undefined;
    });
  }

  private async connectOnce(): Promise<void> {
    this.handlers.onStatus?.('connecting');
    await this.refreshRoute();
    this.openSocket();
    await this.waitForOpen();
  }

  private async refreshRoute(): Promise<boolean> {
    const previous = `${this.routeVersion ?? ''}:${this.routeUrl ?? ''}`;
    const route = await fetchSocketRoute(this.downstreamOnly);
    this.memoryToken = route.token;
    this.routeUrl = route.url;
    this.routeVersion = route.routeVersion;
    this.downstreamOnly = route.transport === 'cloudflare-edge';
    return previous.length > 1 && previous !== `${route.routeVersion}:${route.url}`;
  }

  private openSocket(rejoin = false): void {
    if (!this.memoryToken) return;
    const url = wsUrl(this.memoryToken, this.routeUrl);
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.startLiveness();
      this.handlers.onStatus?.('connected');
      if (rejoin) {
        for (const conversationId of this.joined) {
          void this.join(conversationId).catch(() => undefined);
        }
      }
    };

    ws.onclose = (ev) => {
      this.stopLiveness();
      this.rejectAllPending('Connection closed');
      if (this.disposed) {
        this.handlers.onStatus?.('disconnected');
        return;
      }
      if (ev.code === 4401) {
        this.handlers.onError?.('Unauthorized — please log in again');
        this.handlers.onStatus?.('failed');
        return;
      }
      if (ev.code === 1001) {
        this.handlers.onStatus?.('disconnected');
        return;
      }
      if (ev.code === 4400) {
        this.handlers.onError?.('Too many connections — backing off');
      }
      this.handlers.onStatus?.('reconnecting');
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose fires after onerror — status handled there
    };

    ws.onmessage = (ev) => {
      void this.handleFrame(ev.data);
    };
  }

  private async handleFrame(raw: unknown): Promise<void> {
    let text: string;
    if (typeof raw === 'string') {
      text = raw;
    } else if (raw instanceof Blob) {
      text = await raw.text();
    } else if (raw instanceof ArrayBuffer) {
      text = new TextDecoder().decode(raw);
    } else {
      return;
    }

    let frame: { event: string; payload?: unknown; requestId?: string | null; result?: AckResult };
    try {
      frame = JSON.parse(text);
    } catch {
      return;
    }

    if (frame.event === 'ack' && frame.requestId) {
      const entry = this.pending.get(frame.requestId);
      if (entry) {
        clearTimeout(entry.timer);
        this.pending.delete(frame.requestId);
        entry.resolve(frame.result!);
      }
      return;
    }

    if (frame.event === 'connect_error') {
      const msg =
        (frame.payload as { message?: string })?.message || 'Connection rejected';
      this.handlers.onError?.(msg);
      return;
    }

    this.dispatchEvent(frame.event, frame.payload);
  }

  private dispatchEvent(event: string, payload: unknown): void {
    try {
      switch (event) {
        case 'message:created':
          this.handlers.onMessage?.(parseChatMessage(payload));
          break;
        case 'message:delivered':
          this.handlers.onDelivered?.(parseDeliveredState(payload));
          break;
        case 'conversation:read':
          this.handlers.onRead?.(parseReadState(payload));
          break;
        case 'user:unread_counts':
          this.handlers.onUserUnreadCounts?.(parseUnreadCounts(payload));
          break;
        case 'conversation:updated':
          this.handlers.onConversationUpdated?.(parseConversationUpdated(payload));
          break;
        case 'conversation:created': {
          const created = parseConversationCreated(payload);
          if (created.conversationId) this.handlers.onConversationCreated?.(created);
          break;
        }
        case 'notification:created':
          this.handlers.onNotificationCreated?.(parseNotificationCreated(payload));
          break;
        case 'typing':
        case 'presence': {
          const item = payload as {
            conversationId?: unknown;
            userId?: unknown;
            active?: unknown;
          };
          if (
            typeof item.conversationId !== 'string' ||
            typeof item.userId !== 'string' ||
            typeof item.active !== 'boolean'
          )
            break;
          const ev = {
            conversationId: item.conversationId,
            userId: item.userId,
            active: item.active,
          };
          if (event === 'typing') this.handlers.onTyping?.(ev);
          else this.handlers.onPresence?.(ev);
          break;
        }
        case 'user:blocked':
        case 'user:unblocked':
        case 'user:blocked_by':
        case 'user:unblocked_by':
        case 'contact:share_requested':
        case 'contact:share_approved':
        case 'contact:share_rejected':
        case 'contact:number_seen': {
          (this.handlers as unknown as Record<string, ((p: unknown) => void) | undefined>)[event]?.(payload);
          (this.handlers as unknown as Record<string, ((p: unknown) => void) | undefined>).onBlocked?.(payload);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(event, { detail: payload }));
          }
          break;
        }
      }
    } catch {
      this.handlers.onError?.(`Ignored invalid ${event} event`);
    }
  }

  private sendFrame(event: string, payload: unknown, requestId?: string): void {
    const frame = JSON.stringify({ event, payload, requestId: requestId ?? undefined });
    if (new Blob([frame]).size > MAX_FRAME_BYTES) {
      throw new Error(`Frame exceeds ${MAX_FRAME_BYTES} byte limit`);
    }
    this.ws?.send(frame);
  }

  private requestWithAck<T>(
    event: string,
    payload: unknown,
    parse: (value: unknown) => T,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Socket is not connected'));
        return;
      }
      const requestId = crypto.randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('Socket acknowledgement timed out'));
      }, ACK_TIMEOUT_MS);

      this.pending.set(requestId, {
        resolve: (result: AckResult) => {
          if (!result.ok) {
            const err = new Error(
              result.error.message || 'Socket request failed',
            ) as Error & { statusCode?: number };
            err.statusCode = result.error.statusCode;
            reject(err);
            return;
          }
          try {
            resolve(parse(result.data));
          } catch {
            reject(new Error('Invalid socket response'));
          }
        },
        reject,
        timer,
      });

      try {
        this.sendFrame(event, payload, requestId);
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(err);
      }
    });
  }

  private waitForOpen(): Promise<void> {
    if (this.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const ws = this.ws;
      if (!ws) {
        reject(new Error('No WebSocket instance'));
        return;
      }
      const timer = window.setTimeout(() => {
        cleanup();
        this.handlers.onStatus?.('failed');
        reject(new Error('Realtime connection timed out; continuing with secure REST messaging.'));
      }, 8_000);

      const prevOnOpen = ws.onopen;
      const prevOnClose = ws.onclose;

      const cleanup = () => {
        window.clearTimeout(timer);
        ws.onopen = prevOnOpen;
        ws.onclose = prevOnClose;
      };

      ws.onopen = (ev) => {
        cleanup();
        prevOnOpen?.call(ws, ev);
        resolve();
      };
      ws.onclose = (ev) => {
        cleanup();
        prevOnClose?.call(ws, ev as CloseEvent);
        reject(new Error('Realtime connection failed; continuing with secure REST messaging.'));
      };
    });
  }

  private startLiveness(): void {
    this.stopLiveness();
    this.livenessTimer = setInterval(() => {
      if (!this.connected || (typeof document !== 'undefined' && document.visibilityState !== 'visible')) return;
      void this.refreshRoute()
        .then((changed) => {
          if (changed) {
            this.ws?.close(1012, 'Realtime route changed');
            return;
          }
          if (this.connected) this.sendFrame('ping', {});
        })
        .catch(() => {
          if (this.connected) this.sendFrame('ping', {});
        });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopLiveness(): void {
    if (this.livenessTimer) clearInterval(this.livenessTimer);
    this.livenessTimer = undefined;
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.handlers.onStatus?.('failed');
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      void this.reconnect();
    }, delay);
  }

  private async reconnect(): Promise<void> {
    if (this.disposed) return;
    try {
      await this.refreshRoute();
    } catch {
      this.handlers.onError?.('Socket reauthorization failed');
      this.scheduleReconnect();
      return;
    }
    this.openSocket(true);
  }

  private rejectAllPending(message: string): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error(message));
    }
    this.pending.clear();
  }

  async join(conversationId: string): Promise<void> {
    this.joined.add(conversationId);
    if (!this.connected) await this.connect();
    if (this.downstreamOnly) return;
    await this.requestWithAck('conversation:join', { conversationId }, () => conversationId);
  }

  async leave(conversationId: string): Promise<void> {
    this.joined.delete(conversationId);
    if (this.downstreamOnly) {
      if (this.connected && this.typing.get(conversationId)) this.sendFrame('typing', { conversationId, active: false });
      this.typing.delete(conversationId);
      return;
    }
    if (this.connected) {
      this.sendFrame('typing', { conversationId, active: false });
      this.sendFrame('presence', { conversationId, active: false });
    }
  }

  async send(conversationId: string, clientId: string, body: string): Promise<ChatMessage> {
    if (this.downstreamOnly) return sendMessage(conversationId, body, clientId);
    return this.requestWithAck(
      'message:send',
      { conversationId, clientId, body },
      (data) => parseChatMessage(data, conversationId),
    );
  }

  async markDelivered(conversationId: string, messageId: string): Promise<DeliveredState> {
    if (this.downstreamOnly) {
      await markMessageDelivered(conversationId, messageId);
      return {
        conversationId,
        upToMessageId: messageId,
        deliveredAt: new Date().toISOString(),
        messageIds: [],
      };
    }
    return this.requestWithAck(
      'message:delivered',
      { conversationId, messageId },
      (data) => {
        const { userId: _u, ...rest } = parseDeliveredState(data, false);
        return rest;
      },
    );
  }

  async markRead(conversationId: string, messageId: string): Promise<ReadState> {
    if (this.downstreamOnly) {
      await markMessageRead(conversationId, messageId);
      const updatedAt = new Date().toISOString();
      return { conversationId, lastReadMessageId: messageId, updatedAt, readAt: updatedAt };
    }
    return this.requestWithAck(
      'conversation:read',
      { conversationId, messageId },
      (data) => {
        const { userId: _u, ...rest } = parseReadState(data, false);
        return rest;
      },
    );
  }

  setTyping(conversationId: string, active: boolean): void {
    if (this.downstreamOnly) {
      if ((this.typing.get(conversationId) ?? false) === active) return;
      this.typing.set(conversationId, active);
      this.sendFrame('typing', { conversationId, active });
      return;
    }
    if (this.connected) {
      this.sendFrame('typing', { conversationId, active });
    }
  }

  setPresence(conversationId: string, active: boolean): void {
    // NOTE: presence must ALSO flow in downstreamOnly (cloudflare-edge) —
    // the edge worker relays client presence frames over WS (routed), so
    // suppressing it here is why the peer never sees this user as Online.
    if (this.connected) {
      this.sendFrame('presence', { conversationId, active });
    }
  }

  async renewAuth(): Promise<void> {
    const changed = await this.refreshRoute();
    if (changed && this.connected) this.ws?.close(1012, 'Realtime route changed');
  }

  disconnect(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopLiveness();
    this.rejectAllPending('Socket disconnected');
    for (const conversationId of [...this.joined]) {
      if (this.downstreamOnly && this.connected && this.typing.get(conversationId)) {
        this.sendFrame('typing', { conversationId, active: false });
      } else if (!this.downstreamOnly && this.connected) {
        this.sendFrame('typing', { conversationId, active: false });
        this.sendFrame('presence', { conversationId, active: false });
      }
    }
    this.joined.clear();
    this.typing.clear();
    this.memoryToken = undefined;
    this.ws?.close(1000, 'Client disconnect');
    this.ws = undefined;
    this.handlers.onStatus?.('disconnected');
  }
}
