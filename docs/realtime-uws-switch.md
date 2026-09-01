# Realtime: Socket.IO → UWebSockets.js Switch Guide (Customer Panel)

## Overview

The customer panel supports both Socket.IO and raw WebSocket realtime drivers. This guide covers switching to UWebSockets.js for lower memory footprint and higher connection capacity.

## Quick Start

### 1. Backend Config

```bash
# In backend .env
REALTIME_DRIVER=uwebsockets
REALTIME_UWS_PORT=4003
```

### 2. Frontend Config

In `.env.local`:
```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:4001
NEXT_PUBLIC_REALTIME_DRIVER=uwebsockets
```

### 3. Code Change

In your chat component, swap the socket class:

```typescript
// Before (Socket.IO)
import { ConversationSocket } from '@/lib/api/services/chat-socket';

// After (UWebSockets.js)
import { WsConversationSocket } from '@/lib/api/services/ws-realtime-client';
```

The API is identical — just change the import.

### 4. Verify

- Connection status shows "connected"
- Messages appear in real-time
- Typing indicators work
- Unread counts update

## Architecture

```
Socket.IO mode:
  Browser → Caddy → API (:3000) → Socket.IO Server

UWebSockets mode:
  Browser → Caddy → /realtime → UWS Driver (:4003)
```

## Wire Protocol

**Socket.IO**: `socket.emit('event', payload)` → native acks

**UWebSockets.js**:
```json
// Client → Server
{"event":"message:send","payload":{...},"requestId":"uuid-123"}

// Server → Client (ack)
{"event":"ack","requestId":"uuid-123","result":{"ok":true,"data":{...}}}

// Server → Client (event)  
{"event":"message:created","payload":{...}}
```

## Files

| Socket.IO | UWebSockets.js | Purpose |
|---|---|---|
| `chat-socket.ts` | `ws-realtime-client.ts` | Chat realtime client |
| `user-socket.ts` | `ws-realtime-client.ts` | User notifications |

## Class Mapping

| Socket.IO Class | UWS Class | Methods |
|---|---|---|
| `ConversationSocket` | `WsConversationSocket` | `connect()`, `join()`, `send()`, `leave()` |
| `UserSocket` | `WsUserRealtimeSocket` | `connect()`, `disconnect()` |

## Features

| Feature | Socket.IO | UWebSockets.js |
|---|---|---|
| Auto-reconnect | Built-in | Custom (8 attempts, exponential backoff) |
| Ack handling | Native callbacks | requestId-based acks |
| notification:created | ✓ | ✓ |
| Typing indicators | ✓ | ✓ |
| Unread counts | ✓ | ✓ |
| Conversation updates | ✓ | ✓ |
| Delivery receipts | ✓ | ✓ |
| Read receipts | ✓ | ✓ |

## env Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:4001` | Backend origin |
| `NEXT_PUBLIC_REALTIME_DRIVER` | `socket.io` | Driver selection |

## Troubleshooting

### Connection fails

1. Check `NEXT_PUBLIC_REALTIME_DRIVER` matches backend
2. Verify Caddy is routing `/realtime` to port 4003
3. Check browser console for WebSocket errors

### Messages not appearing

1. Verify `SOCKET_ALLOWED_ORIGINS` includes panel origin
2. Check Network tab for failed WebSocket connections
3. Look for `connect_error` frames in WebSocket messages

### Reconnection loops

1. Check backend health: `curl http://localhost:4001/api/v1/health/ready`
2. Verify token is not expired
3. Check for rate limiting (SOCKET_PER_IP_RATE)

### TypeScript errors

Ensure `ws-realtime-client.ts` imports match your types:

```typescript
import type { ChatSocketHandlers, SocketStatus, AckResult } from './chat-socket';
```

## Migration Checklist

- [ ] Backend: Set `REALTIME_DRIVER=uwebsockets`
- [ ] Backend: Verify UWS port 4003 is listening
- [ ] Caddy: Verify `/realtime` routes to UWS port
- [ ] Frontend: Set `NEXT_PUBLIC_REALTIME_DRIVER=uwebsockets`
- [ ] Frontend: Swap `ConversationSocket` → `WsConversationSocket`
- [ ] Frontend: Swap `UserSocket` → `WsUserRealtimeSocket`
- [ ] Test: Connection established
- [ ] Test: Messages send/receive
- [ ] Test: Typing indicators work
- [ ] Test: Unread counts update
- [ ] Test: Reconnection works
