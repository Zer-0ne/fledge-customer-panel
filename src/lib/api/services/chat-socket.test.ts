import { describe, it, expect, vi } from 'vitest';
import { ConversationSocket } from './chat-socket';

vi.mock('socket.io-client', () => {
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  const mockSocket = {
    connected: true,
    auth: {},
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners[event] = handler;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    io: {
      on: vi.fn(),
      opts: {},
    },
  };
  return {
    io: vi.fn(() => mockSocket),
    __listeners: listeners,
    __mockSocket: mockSocket,
  };
});

describe('ConversationSocket Realtime Events', () => {
  it('instantiates ConversationSocket with new event handlers', () => {
    const onUserUnreadCounts = vi.fn();
    const onConversationUpdated = vi.fn();
    const onNotificationCreated = vi.fn();

    const socket = new ConversationSocket({
      onUserUnreadCounts,
      onConversationUpdated,
      onNotificationCreated,
    });

    expect(socket).toBeDefined();
    expect(socket.connected).toBe(false);
  });
});
