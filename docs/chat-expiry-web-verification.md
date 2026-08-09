# Chat Expiry — Customer Panel Web Verification (t_3af959de)

Branch: `wt/chat-expiry` (worktree `.worktrees/chat-expiry`)
Date: 2026-08-09

## Feature

Closed conversations (source listing / roommate post / NeedNow request expired)
are shown as closed in the customer web panel:

- Chat list: expired conversations render a small amber `Post expired` chip
  next to the context badge; the row still opens history.
- Chat thread: header shows a `Post expired` chip; the composer (textarea +
  send button) is replaced by an InfoBanner ("Chat Closed — This chat is
  closed because the post has expired."). History stays fully readable.
- Send resilience: if the backend rejects a send with 409 (REST `ApiError` or
  socket ack with `statusCode: 409`), the UI toasts "This chat is closed
  because the post has expired" and immediately flips the local conversation
  to the closed state (composer disabled) — no dead textarea, no raw error
  dump.

## Contract adaptation

The backend parallel implementation was NOT yet live in the running API at
verification time (probed `src/chat/chat.service.ts` + live API — no
`contextState` field, no 409 on send yet). Per the task's fallback rule, the
frontend was built against the contract and degrades gracefully:

- `mapRawToConversation` reads `contextState` from `contextState` (camelCase)
  OR `context_state` (snake_case), accepting only `'active' | 'expired'`;
  anything else/absent → `undefined` (chat behaves as before).
- `isChatClosedError()` treats a send failure as closed iff `status === 409`
  or `statusCode === 409` (REST `ApiError.status` / socket ack status).
- `chat-socket.ts` `ack()` now attaches `statusCode` to the rejected Error so
  the socket transport reports 409 identically to REST.

## Files changed

| File | Change |
| --- | --- |
| `src/types/index.ts` | `Conversation.contextState?: 'active' \| 'expired'` |
| `src/lib/api/services/chat.ts` | parse `contextState` in `mapRawToConversation`; new `isConversationExpired()` + `isChatClosedError()` helpers |
| `src/lib/api/services/chat-socket.ts` | `ack()` attaches `statusCode` to rejected socket errors |
| `src/components/ui/info-banner.tsx` | new compact InfoBanner (info/warning/neutral tones) |
| `src/app/(protected)/messages/page.tsx` | `Post expired` chip on expired list rows |
| `src/app/(protected)/messages/[id]/page.tsx` | header chip, InfoBanner composer replacement, 409 → toast + local closed state |
| `src/lib/api/services/chat.test.ts` | every mock conversation now carries `contextState`; +4 new tests (normalizer camel/snake, `isConversationExpired`, `isChatClosedError`) |

No allowlist changes needed — no new API paths are used (existing
`/api/v1/conversations*` paths only). No config files touched.

## Verification (all run inside the worktree)

### 1. Typecheck — `tsc --noEmit`

```
$ ./node_modules/.bin/tsc --noEmit
$ echo $?
0
```

### 2. Lint — `pnpm run lint`

```
$ pnpm run lint
✖ 13 problems (0 errors, 13 warnings)
LINT_EXIT=0
```
0 errors; the 13 warnings are pre-existing (analytics files, `_u` destructure
in chat-socket markRead/markDelivered — untouched by this change).

### 3. Unit tests — `pnpm run test` (vitest)

```
 Test Files  28 passed (28)
      Tests  293 passed (293)
   Start at  18:39:11
   Duration  5.55s
TEST_EXIT=0
```
New/updated chat tests included in `src/lib/api/services/chat.test.ts`
(normalizer contextState mapping, `isConversationExpired`, `isChatClosedError`
409 detection for both `status` and `statusCode`).

### 4. Build — `./node_modules/.bin/next build`

```
Route (app)                              Size     First Load JS
└ ƒ /messages/[id]                       ...      ...
└ ƒ /messages                            ...      ...

BUILD_EXIT=0
```
(Full route table printed; `/messages` + `/messages/[id]` compiled clean.)

### 5. API smoke (backend live on :4001)

Login via the shared test user, then list conversations:

```
$ curl -s -X POST http://localhost:4001/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"identifier":"partner@test.local","password":"Partner@Test2026!"}'
{"accessToken":"eyJhbG...ZhzG"}

$ curl -s http://localhost:4001/api/v1/conversations -H "Authorization: Bearer $TOKEN"
[{"id":"511e3783-0ba5-4019-b3e6-f915afe3737c","contextType":"listing_interest",
  "contextId":"39f00c2e-d582-415e-8596-75c6b109e4b8","createdAt":"2026-07-31T14:38:14.705Z"}]
```

Endpoint healthy; response shape matches the normalizer input. `contextState`
will appear here once the parallel backend change lands — the frontend picks it
up with no further changes (camelCase or snake_case), and until then the
fallback (409 on send) triggers the closed UI.

## Regression check

- `enrichConversations` spreads `...conv`, so `contextState` survives
  enrichment unchanged (asserted in tests).
- Closed chats: history fetch, read/delivered receipts, contact-share, block,
  report all unchanged — only the composer and badges are conditional on
  `contextState === 'expired'`.
- No new UI library, no config reformatting; component style matches existing
  `Badge`/banner patterns.
