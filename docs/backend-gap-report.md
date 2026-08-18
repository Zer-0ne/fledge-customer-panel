# 📋 Backend Gap Report: Real-Time WebSocket Unread Counts & Notifications

## Executive Summary
Currently, real-time message events (`message:created`) are **only broadcasted to clients who have explicitly joined a specific conversation room** (`conversation:${conversationId}`). 

If a user is on the **All Threads (`/messages`) page**, **Dashboard**, or anywhere else in the application, their WebSocket client has not joined individual thread rooms. Consequently, they **never receive real-time updates** for incoming messages, thread unread counts, or system notifications until they manually refresh or navigate into that specific chat room.

---

## 🔍 Technical Root Cause Analysis (Backend Codebase: `/flat-system/backend`)

1. **Scope Limitation in `ChatGateway` (`src/chat/chat.gateway.ts`)**:
   - `conversation:join` ([Line 55](file:///home/eagle/Projects/my%20folder/flat-system/backend/src/chat/chat.gateway.ts#L55)) joins a specific room named `conversation:${conversationId}`.
   - `message:send` ([Line 61](file:///home/eagle/Projects/my%20folder/flat-system/backend/src/chat/chat.gateway.ts#L61)) emits `message:created` **only** to that room:
     ```ts
     this.server?.to(room(input.conversationId)).emit('message:created', result.message);
     ```
   - ❌ **Gap 1**: There is no global user-scoped room (e.g. `user:${userId}`) joined automatically upon socket authentication.
   - ❌ **Gap 2**: When User A sends a message to User B, User B receives zero WebSocket events if User B is sitting on the thread list or dashboard.

2. **Absence of Real-Time Notification Events (`src/notifications`)**:
   - `OutboxProcessor` ([`outbox.processor.ts`](file:///home/eagle/Projects/my%20folder/flat-system/backend/src/notifications/outbox.processor.ts)) handles `listing_interest`, `roommate_interest`, and `message` notifications by inserting rows into PostgreSQL DB and dispatching FCM push notifications for mobile.
   - ❌ **Gap 3**: There is **no WebSocket Gateway or real-time event emission** in the notifications module to notify connected web clients of new in-app notifications or unread notification counts (`notification:created`).

---

## 💡 Required Backend Specs & Recommendations

To support WhatsApp-style real-time unread badges and live notification counts on the frontend, implement the following in NestJS backend:

### 1. Global User Socket Room
Upon socket connection and authentication in `ChatGateway` (or a global `RealtimeGateway`):
```ts
// Automatically join the authenticated user's socket to their personal room
socket.join(`user:${socket.data.principal.userId}`);
```

### 2. Broadcast `conversation:updated` to Message Recipients
When a new message is sent via `message:send`:
- Emit `message:created` to `conversation:${conversationId}` (existing behavior).
- **ALSO** emit `conversation:updated` to `user:${recipientId}` with payload:
  ```json
  {
    "event": "conversation:updated",
    "data": {
      "conversationId": "uuid",
      "lastMessage": {
        "id": "uuid",
        "content": "kya kr rha hai",
        "senderId": "user-a-id",
        "createdAt": "2026-08-01T00:55:00.000Z"
      },
      "unreadCount": 1
    }
  }
  ```

### 3. Broadcast `user:unread_counts`
Whenever unread message or notification counts change (e.g. new message received, or conversation read), broadcast to `user:${userId}`:
```json
{
  "event": "user:unread_counts",
  "data": {
    "unreadMessages": 3,
    "unreadNotifications": 2
  }
}
```

### 4. Real-Time Notification Socket Events
In `OutboxProcessor` (or `NotificationsService`), when a new notification is created in DB:
```ts
this.server?.to(`user:${recipientUserId}`).emit('notification:created', {
  id: notification.id,
  kind: notice.kind,
  title: notice.title,
  body: notice.body,
  createdAt: new Date()
});
```
