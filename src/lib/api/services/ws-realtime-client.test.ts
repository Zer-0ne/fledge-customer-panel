import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMessage } = vi.hoisted(() => ({
  sendMessage: vi.fn(),
}));

vi.mock('@/lib/api/services/chat', () => ({
  sendMessage,
  markMessageDelivered: vi.fn(),
  markMessageRead: vi.fn(),
  deriveMessageStatus: () => 'sent',
}));

import { WsConversationSocket } from './ws-realtime-client';

class FakeWebSocket {
  static readonly OPEN = 1;
  static urls: string[] = [];
  readonly readyState = FakeWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  readonly sent: string[] = [];

  constructor(url: string | URL) {
    FakeWebSocket.urls.push(String(url));
    queueMicrotask(() => this.onopen?.(new Event('open')));
  }

  send(frame: string) {
    this.sent.push(frame);
    const input = JSON.parse(frame) as { event: string; requestId?: string; payload: Record<string, unknown> };
    if (input.requestId) {
      const data = input.event === 'message:send'
        ? { id: 'message-1', conversationId: input.payload.conversationId, body: input.payload.body }
        : input.payload;
      queueMicrotask(() => this.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify({ event: 'ack', requestId: input.requestId, result: { ok: true, data } }),
      })));
    }
  }

  close() {}
}

describe('Cloudflare edge realtime client', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SOCKET_URL', 'https://edge.test');
    vi.stubGlobal('WebSocket', FakeWebSocket);
    FakeWebSocket.urls = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    }));
    sendMessage.mockReset();
  });

  it('uses the raw WebSocket contract for join, mutations, and typing', async () => {
    const client = new WsConversationSocket();

    await client.join('conversation-1');
    await expect(client.send('conversation-1', 'client-1', 'hello')).resolves.toMatchObject({ id: 'message-1' });
    expect(sendMessage).not.toHaveBeenCalled();

    client.setTyping('conversation-1', true);
    client.setTyping('conversation-1', false);
    expect((client as unknown as { ws: FakeWebSocket }).ws.sent.map((frame) => JSON.parse(frame).event)).toEqual([
      'conversation:join', 'message:send', 'typing', 'typing',
    ]);
  });

  it('keeps Cloudflare mutations on REST while typing stays on WebSocket', async () => {
    sendMessage.mockResolvedValue({ id: 'message-2' });
    const client = new WsConversationSocket({}, true);

    await client.join('conversation-2');
    await client.send('conversation-2', 'client-2', 'hello');
    client.setTyping('conversation-2', true);

    expect(sendMessage).toHaveBeenCalledWith('conversation-2', 'hello', 'client-2');
    expect((client as unknown as { ws: FakeWebSocket }).ws.sent.map((frame) => JSON.parse(frame).event)).toEqual(['typing']);
  });

  it('uses the server route URL and transport instead of the static client mode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'routed-token',
        url: 'https://routed-edge.test/realtime',
        transport: 'cloudflare-edge',
        routeVersion: 'hybrid-v1:3/4',
      }),
    }));
    sendMessage.mockResolvedValue({ id: 'message-3' });
    const client = new WsConversationSocket({}, false);

    await client.join('conversation-3');
    await client.send('conversation-3', 'client-3', 'hello');
    client.setTyping('conversation-3', true);

    expect(FakeWebSocket.urls).toEqual([
      'wss://routed-edge.test/realtime?token=routed-token',
    ]);
    expect(sendMessage).toHaveBeenCalledWith('conversation-3', 'hello', 'client-3');
    expect((client as unknown as { ws: FakeWebSocket }).ws.sent.map((frame) => JSON.parse(frame).event)).toEqual(['typing']);
    client.disconnect();
  });
});
