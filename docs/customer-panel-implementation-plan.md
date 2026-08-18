# Customer Panel Implementation Plan

> Phase 0 — Repository Audit & Implementation Planning

---

## 1. Existing Frontend Stack

| Aspect | Detail |
|--------|--------|
| Framework | Next.js 16.2.12 (App Router, Turbopack) |
| React | 19.2.4 |
| TypeScript | ^5 (strict mode) |
| CSS | Tailwind CSS 4 via `@tailwindcss/postcss` |
| UI Library | shadcn/ui v4 (base-nova style) + `@base-ui/react` primitives |
| Animation | `tw-animate-css` |
| Variants | `class-variance-authority` ^0.7.1 |
| Class Utilities | `clsx` ^2.1.1, `tailwind-merge` ^3.6.0 |
| Icons | `lucide-react` ^1.28.0 |
| React Compiler | Enabled (`babel-plugin-react-compiler`) |
| Path Alias | `@/*` → `./src/*` |
| Lint | ESLint 9 with `eslint-config-next` (core-web-vitals + typescript) |
| Testing | **None configured** — no test framework, no test scripts |
| Environment | `.env*` gitignored |
| Build | `next build` (Turbopack), `next dev` |

### Existing Source Structure

```
src/
├── app/
│   ├── globals.css          # Tailwind v4 + shadcn theme tokens
│   ├── layout.tsx           # Root layout (Geist fonts, minimal)
│   └── page.tsx             # Default Next.js starter page
├── components/
│   └── ui/
│       └── button.tsx       # shadcn Button (base-nova, @base-ui/react)
└── lib/
    └── utils.ts             # cn() helper only
```

### Key Observations

- **Blank slate**: Only the Next.js starter template exists. No routes, no API layer, no auth, no tests.
- **shadcn configured**: `components.json` points to `base-nova` style with `@base-ui/react` primitives.
- **Single UI component**: Only `Button` is installed. All other shadcn components need adding.
- **No test runner**: No Jest, Vitest, or Playwright. Test infrastructure must be added.
- **No environment validation**: No `next.config.ts` env setup, no runtime validation library.
- **No API utilities**: Zero backend communication code exists.
- **React Compiler enabled**: Must ensure compatibility with all added code.

---

## 2. Backend API Contract Analysis

**Source**: `../apis.json` (OpenAPI 3.0 spec, 93 endpoints, 3804 lines)

### 2.1 Customer-Facing Endpoint Inventory

#### Authentication (9 endpoints)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| POST | `/api/v1/auth/signup` | ❌ | 201, 400 |
| POST | `/api/v1/auth/login` | ❌ | 200, 401 |
| POST | `/api/v1/auth/otp/request` | ❌ | 202 |
| POST | `/api/v1/auth/otp/login` | ❌ | 200, 400 |
| POST | `/api/v1/auth/refresh` | ❌ | 200, 401 |
| POST | `/api/v1/auth/logout` | ✅ | 204, 401 |
| GET | `/api/v1/auth/bootstrap` | ✅ | 200 |
| GET | `/api/v1/auth/sessions` | ✅ | 200 |
| DELETE | `/api/v1/auth/sessions/{id}` | ✅ | 204 |

#### User / Profile (3 endpoints)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| GET | `/api/v1/users/{id}/public` | ❌ | 200 |
| GET | `/api/v1/users/me` | ✅ | 200 |
| DELETE | `/api/v1/users/me` | ✅ | 204 |

#### Colleges & Campuses (2 endpoints — read-only)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| GET | `/api/v1/colleges` | ❌ | 200 |
| GET | `/api/v1/colleges/{id}/campuses` | ❌ | 200 |

#### Public Listings & Properties (5 endpoints)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| GET | `/api/v1/listings` | ❌ | 200 |
| GET | `/api/v1/listings/{id}` | ❌ | 200 |
| GET | `/api/v1/properties/{id}` | ❌ | 200 |
| GET | `/api/v1/properties/{id}/exact-address` | ✅ | 200 |
| GET | `/api/v1/users/{id}/public` | ❌ | 200 |

#### Favorites & Listing Interests (6 endpoints)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| GET | `/api/v1/favorites` | ✅ | 200 |
| POST | `/api/v1/listings/{id}/favorite` | ✅ | 201 |
| DELETE | `/api/v1/listings/{id}/favorite` | ✅ | 204 |
| POST | `/api/v1/listings/{id}/interests` | ✅ | 201 |
| GET | `/api/v1/listing-interests` | ✅ | 200 |
| PATCH | `/api/v1/listing-interests/{id}` | ✅ | 200 |

#### Roommate Posts & Interests (6 endpoints)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| GET | `/api/v1/roommate-posts` | ✅ | 200 |
| POST | `/api/v1/roommate-posts` | ✅ | 201 |
| PATCH | `/api/v1/roommate-posts/{id}` | ✅ | 200 |
| POST | `/api/v1/roommate-posts/{id}/interests` | ✅ | 201 |
| GET | `/api/v1/roommate-interests` | ✅ | 200 |
| PATCH | `/api/v1/roommate-interests/{id}` | ✅ | 200 |

#### Conversations & Chat (10 endpoints)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| POST | `/api/v1/conversations` | ✅ | 201 |
| GET | `/api/v1/conversations` | ✅ | 200 |
| GET | `/api/v1/conversations/{id}/messages` | ✅ | 200 |
| POST | `/api/v1/conversations/{id}/messages` | ✅ | 201 |
| PATCH | `/api/v1/conversations/{id}/read/{messageId}` | ✅ | 200 |
| POST | `/api/v1/conversations/{id}/contact-share` | ✅ | 201 |
| PATCH | `/api/v1/contact-share/{id}` | ✅ | 200 |
| GET | `/api/v1/contact-share/{id}` | ✅ | 200 |
| POST | `/api/v1/users/{id}/block` | ✅ | 201 |
| DELETE | `/api/v1/users/{id}/block` | ✅ | 204 |
| POST | `/api/v1/reports` | ✅ | 201 |

#### Notifications (6 endpoints)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| GET | `/api/v1/notifications` | ✅ | 200 |
| PATCH | `/api/v1/notifications/{id}/read` | ✅ | 204 |
| GET | `/api/v1/notification-preferences` | ✅ | 200 |
| PUT | `/api/v1/notification-preferences/{kind}` | ✅ | 200 |
| PUT | `/api/v1/push-tokens` | ✅ | 200 |
| DELETE | `/api/v1/push-tokens/{id}` | ✅ | 204 |

#### Ads — Customer-Facing (3 endpoints)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| POST | `/api/v1/ads/select` | ✅ | 200 |
| POST | `/api/v1/ads/events/impression` | ✅ | 202 |
| POST | `/api/v1/ads/events/click` | ✅ | 200 |

#### Health (2 endpoints)

| Method | Path | Auth | Status Codes |
|--------|------|------|-------------|
| GET | `/api/v1/health/live` | ❌ | 200 |
| GET | `/api/v1/health/ready` | ❌ | 200, 530 |

### 2.2 Excluded Endpoints (Admin / Moderation / Property-Manager)

**Admin endpoints** (`/api/v1/admin/*`):
- User management, RBAC roles, reports queue, audit logs, admin dashboard
- Admin notifications, listing moderation, media moderation
- Advertiser/campaign/creative/target CRUD
- Campaign performance metrics

**Moderation endpoints**:
- `/api/v1/moderation/reports/{id}/actions`

**Property-owner/manager endpoints**:
- `POST /api/v1/properties` (create)
- `GET /api/v1/properties` (list managed)
- `GET /api/v1/properties/{id}/manage`
- `POST /api/v1/properties/{id}/units`
- `POST /api/v1/properties/{id}/managers`
- `GET /api/v1/properties/{id}/managers`
- `DELETE /api/v1/properties/{id}/managers/{userId}`
- `POST /api/v1/properties/{id}/listings`
- `GET /api/v1/properties/{id}/listings`
- `PATCH /api/v1/listings/{id}`
- `POST /api/v1/listings/{id}/publish`
- `GET /api/v1/listings/{id}/manage`
- `PUT /api/v1/users/{id}/suspension` (admin)

**College/campus management**:
- `POST /api/v1/colleges`
- `PATCH /api/v1/colleges/{id}`
- `POST /api/v1/colleges/{id}/campuses`
- `PATCH /api/v1/colleges/{collegeId}/campuses/{id}`

**Media management** (non-customer):
- `POST /api/v1/media/uploads`
- `POST /api/v1/media/{id}/complete`
- `GET /api/v1/media/{id}/download`
- `PATCH /api/v1/media/{id}/moderation`
- `DELETE /api/v1/media/{id}`

**Push token registration** (mobile-only):
- `PUT /api/v1/push-tokens` — defer until web push supported
- `DELETE /api/v1/push-tokens/{id}` — defer

---

## 3. OpenAPI Contract Gaps

### 3.1 Missing Response Schemas (Critical)

Every endpoint in `apis.json` has **empty response schemas** — no `content`, no `schema`, no field definitions. The OpenAPI spec only documents HTTP status codes, not response shapes.

| Endpoint | Response Body Unknown |
|----------|----------------------|
| `GET /auth/bootstrap` | User profile + permissions shape |
| `GET /users/me` | Current user profile shape |
| `GET /users/{id}/public` | Public profile shape |
| `GET /colleges` | College list shape |
| `GET /colleges/{id}/campuses` | Campus list shape |
| `GET /listings` | Listing search result shape (incl. pagination) |
| `GET /listings/{id}` | Listing detail shape |
| `GET /properties/{id}` | Property detail shape |
| `GET /properties/{id}/exact-address` | Exact address shape |
| `GET /favorites` | Favorites list shape |
| `GET /listing-interests` | Listing interests shape |
| `GET /roommate-posts` | Roommate posts shape |
| `GET /roommate-interests` | Roommate interests shape |
| `GET /conversations` | Conversations list shape |
| `GET /conversations/{id}/messages` | Messages list shape (incl. cursor) |
| `GET /notifications` | Notifications list shape |
| `GET /notification-preferences` | Preferences shape |
| `GET /contact-share/{id}` | Shared contact shape |
| `POST /auth/signup` | Token response shape |
| `POST /auth/login` | Token response shape |
| `POST /auth/otp/login` | Token response shape |
| `POST /auth/refresh` | Token rotation shape |
| `POST /ads/select` | Ad creative/selection shape |
| `POST /ads/events/click` | Redirect URL shape |
| All 201/204 | Created/empty body |

### 3.2 Missing Request Schemas

| Endpoint | Missing |
|----------|---------|
| `PATCH /roommate-posts/{id}` | No request body defined at all |
| `POST /roommate-posts` | `preferences` is example-only, no schema |
| `POST /conversations` | Context shape unclear |

### 3.3 Ambiguous Areas

- **Listing statuses**: `draft`, `published`, `paused`, `rented`, `expired`, `removed` — unclear which are customer-visible
- **Interest statuses**: `accepted`, `rejected`, `withdrawn` — unclear transition rules
- **Contact-share statuses**: `accepted`, `rejected`, `cancelled` — unclear ownership rules
- **Conversation creation**: `contextId` is the interest ID, not the listing/post ID — requires confirmation
- **Pagination shapes**: Cursor-based but response envelope unknown (`{ items, nextCursor }`? `{ data, cursor }`?)
- **Token shapes**: Login/signup/refresh responses undefined — `accessToken`? `access_token`? Nested?
- **Bootstrap response**: Unknown fields — `id`, `email`, `phone`, `displayName`, `permissions`?
- **Unread counts**: Not mentioned in conversation/notification responses
- **Ad selection response**: Unknown creative/media/destination fields

### 3.4 Assumptions Required

These must be validated against actual backend responses:

1. Token response contains `accessToken` and `refreshToken` at top level
2. Listing search returns `{ items: Listing[], nextCursor?: string }`
3. Bootstrap returns `{ user: { id, displayName, email, phone, ... }, permissions: [...] }`
4. Conversations return `{ id, participants, lastMessage, updatedAt, unreadCount? }`
5. Messages return `{ items: Message[], nextCursor?: string }`
6. Notifications return `{ items: Notification[], ... }`
7. Favorites return `{ items: FavoriteListing[], ... }` or flat array
8. Roommate posts preferences is an open object `{ vegetarian?: boolean, studentOnly?: boolean, ... }`
9. Ad selection returns `{ creative: { ..., token: string }, destination: string }` or similar
10. Listing interest `direction` can be inferred from comparing `userId` fields in the response

---

## 4. Customer Route Map

```
src/app/
├── (public)/
│   ├── page.tsx                          # Home — college selector, search entry, featured listings
│   ├── search/page.tsx                   # Listing search with URL filters
│   ├── listings/[id]/page.tsx            # Listing detail
│   ├── properties/[id]/page.tsx          # Property public page
│   ├── roommates/page.tsx                # Roommate post discovery
│   └── users/[id]/page.tsx               # Public user profile
├── (auth)/
│   ├── login/page.tsx                    # Password login
│   ├── signup/page.tsx                   # Registration
│   └── otp/page.tsx                      # OTP request + verification
├── (protected)/
│   ├── dashboard/page.tsx                # Authenticated home
│   ├── favorites/page.tsx                # Saved listings
│   ├── interests/page.tsx                # Listing interests (in/out)
│   ├── roommate-posts/new/page.tsx       # Create roommate post
│   ├── roommate-interests/page.tsx        # Roommate interests (in/out)
│   ├── messages/page.tsx                 # Conversation list
│   ├── messages/[id]/page.tsx            # Chat thread
│   ├── notifications/page.tsx            # Notification list
│   └── settings/
│       ├── profile/page.tsx              # View profile (read-only)
│       ├── sessions/page.tsx             # Active sessions
│       ├── notifications/page.tsx        # Notification preferences
│       └── account/page.tsx              # Account deletion
├── api/
│   └── auth/
│       ├── login/route.ts                # BFF: forward login
│       ├── signup/route.ts               # BFF: forward signup
│       ├── otp/request/route.ts          # BFF: forward OTP request
│       ├── otp/login/route.ts            # BFF: forward OTP login
│       ├── refresh/route.ts              # BFF: token refresh
│       ├── logout/route.ts               # BFF: logout + cookie clear
│       ├── bootstrap/route.ts            # BFF: session bootstrap
│       └── [...proxy]/route.ts           # Allowlisted API proxy
├── layout.tsx                            # Root layout with providers
└── not-found.tsx                         # 404 page
```

---

## 5. Endpoint-to-Screen Mapping

| Screen | API Endpoints Used |
|--------|-------------------|
| Home `/` | `GET /colleges`, `GET /colleges/{id}/campuses`, `GET /listings`, `POST /ads/select` |
| Search `/search` | `GET /listings` (with filters), `POST /ads/select` |
| Listing Detail `/listings/[id]` | `GET /listings/{id}`, `POST /ads/select` |
| Property Detail `/properties/[id]` | `GET /properties/{id}`, `GET /properties/{id}/exact-address` (auth) |
| Public Profile `/users/[id]` | `GET /users/{id}/public` |
| Roommates `/roommates` | `GET /roommate-posts` (with filters) |
| Login `/login` | `POST /auth/login` |
| Signup `/signup` | `POST /auth/signup` |
| OTP `/otp` | `POST /auth/otp/request`, `POST /auth/otp/login` |
| Dashboard `/dashboard` | `GET /favorites`, `GET /listing-interests`, `GET /roommate-interests`, `GET /conversations`, `GET /notifications` |
| Favorites `/favorites` | `GET /favorites` |
| Listing Interests `/interests` | `GET /listing-interests` |
| Roommate Posts New `/roommate-posts/new` | `GET /colleges`, `POST /roommate-posts` |
| Roommate Interests `/roommate-interests` | `GET /roommate-interests` |
| Messages `/messages` | `GET /conversations` |
| Chat `/messages/[id]` | `GET /conversations/{id}/messages`, `POST /conversations/{id}/messages`, `PATCH /conversations/{id}/read/{messageId}` |
| Notifications `/notifications` | `GET /notifications`, `PATCH /notifications/{id}/read` |
| Settings Profile `/settings/profile` | `GET /users/me` |
| Settings Sessions `/settings/sessions` | `GET /auth/sessions`, `DELETE /auth/sessions/{id}` |
| Settings Notifications `/settings/notifications` | `GET /notification-preferences`, `PUT /notification-preferences/{kind}` |
| Settings Account `/settings/account` | `DELETE /users/me` |
| Listing actions | `POST /listings/{id}/favorite`, `DELETE /listings/{id}/favorite`, `POST /listings/{id}/interests` |
| Interest actions | `PATCH /listing-interests/{id}` |
| Roommate actions | `POST /roommate-posts/{id}/interests`, `PATCH /roommate-interests/{id}` |
| Safety actions | `POST /users/{id}/block`, `DELETE /users/{id}/block`, `POST /reports` |
| Contact sharing | `POST /conversations/{id}/contact-share`, `PATCH /contact-share/{id}`, `GET /contact-share/{id}` |

---

## 6. Authentication Strategy

### 6.1 Token Flow

```
Browser                    Next.js BFF                    Backend API
  │                            │                               │
  │── POST /api/auth/login ──>│── POST /auth/login ──────────>│
  │                            │<── { accessToken, refreshToken }│
  │<── Set-Cookie ────────────│── Set HttpOnly Cookie ────────│
  │                            │                               │
  │── GET /api/auth/bootstrap>│── GET /auth/bootstrap ────────>│
  │<── { user, permissions }  │<── { user, permissions } ─────│
  │                            │                               │
  │── API request ───────────>│── Attach access token ───────>│
  │                            │<── 401 Unauthorized ─────────│
  │                            │── POST /auth/refresh ────────>│
  │                            │<── { accessToken } ──────────│
  │                            │── Retry original request ────>│
  │<── Response ──────────────│<── Response ──────────────────│
```

### 6.2 Cookie Configuration

| Cookie | Flags |
|--------|-------|
| `cp_access_token` | `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/`, max ~15min |
| `cp_refresh_token` | `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/api/auth`, max ~30d |

### 6.3 Security Rules

- Never expose refresh token to client JavaScript
- Never store tokens in `localStorage` or `sessionStorage`
- Never log passwords, OTPs, access tokens, or refresh tokens
- On 401: attempt refresh once, retry once, prevent infinite loops
- On refresh failure: clear cookies, redirect to login
- On logout: call `POST /auth/logout`, clear cookies
- Prevent open redirects in return URL parameter

---

## 7. Proposed BFF / API Strategy

### 7.1 API Forwarding Layer

```
src/app/api/
├── auth/                    # Auth-specific BFF routes
│   ├── login/route.ts
│   ├── signup/route.ts
│   ├── otp/request/route.ts
│   ├── otp/login/route.ts
│   ├── refresh/route.ts
│   ├── logout/route.ts
│   └── bootstrap/route.ts
└── proxy/                   # Allowlisted customer API proxy
    └── [...path]/route.ts   # Only allows specific customer endpoints
```

### 7.2 Allowlist

The proxy route must only forward these paths and methods:

```
GET    /api/v1/colleges
GET    /api/v1/colleges/{id}/campuses
GET    /api/v1/listings
GET    /api/v1/listings/{id}
GET    /api/v1/properties/{id}
GET    /api/v1/properties/{id}/exact-address
GET    /api/v1/users/{id}/public
GET    /api/v1/users/me
DELETE /api/v1/users/me
GET    /api/v1/favorites
POST   /api/v1/listings/{id}/favorite
DELETE /api/v1/listings/{id}/favorite
POST   /api/v1/listings/{id}/interests
GET    /api/v1/listing-interests
PATCH  /api/v1/listing-interests/{id}
GET    /api/v1/roommate-posts
POST   /api/v1/roommate-posts
PATCH  /api/v1/roommate-posts/{id}
POST   /api/v1/roommate-posts/{id}/interests
GET    /api/v1/roommate-interests
PATCH  /api/v1/roommate-interests/{id}
POST   /api/v1/conversations
GET    /api/v1/conversations
GET    /api/v1/conversations/{id}/messages
POST   /api/v1/conversations/{id}/messages
PATCH  /api/v1/conversations/{id}/read/{messageId}
POST   /api/v1/conversations/{id}/contact-share
PATCH  /api/v1/contact-share/{id}
GET    /api/v1/contact-share/{id}
POST   /api/v1/users/{id}/block
DELETE /api/v1/users/{id}/block
POST   /api/v1/reports
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/{id}
GET    /api/v1/notifications
PATCH  /api/v1/notifications/{id}/read
GET    /api/v1/notification-preferences
PUT    /api/v1/notification-preferences/{kind}
POST   /api/v1/ads/select
POST   /api/v1/ads/events/impression
POST   /api/v1/ads/events/click
GET    /api/v1/health/live
GET    /api/v1/health/ready
```

Any request to a path not in this list returns `403 Forbidden`.

### 7.3 Server-Side API Helper

```typescript
// lib/api/client.ts

interface ApiClientOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  accessToken?: string;
  signal?: AbortSignal;
}

// Handles:
// - Backend base URL from env (server-only)
// - JSON and empty-body responses
// - Query parameter serialization
// - Abort signal
// - Request timeout (10s default)
// - Status code handling: 200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429, 500, 530
// - Error normalization
// - No secret/token logging
```

---

## 8. Data-Fetching Strategy

| Context | Strategy |
|---------|----------|
| Public pages (home, search, listing detail, property) | Server Components with `fetch` for SEO |
| Protected pages (dashboard, messages, settings) | Client Components with `useEffect` + state, or Server Components with cookie-based auth |
| Realtime (chat) | REST polling (configurable interval), pause when tab hidden |
| Mutations | Client-side `fetch` to BFF routes with optimistic UI where safe |

### Cursor Pagination

```typescript
// Keep cursor in URL search params for shareability
// ?cursor=abc123&limit=20

// Response adapter (assumed shape):
interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}
```

---

## 9. State Ownership Strategy

| State | Owner | Storage |
|-------|-------|---------|
| Auth session | BFF | HttpOnly cookies |
| Current user | Client | React state (via bootstrap) |
| Search filters | URL | Search params |
| Listing favorites | Client | React state + API |
| Conversation list | Client | React state |
| Chat messages | Client | React state (per conversation) |
| Notifications | Client | React state |
| UI state (modals, drawers) | Client | React state |

---

## 10. Error-Handling Strategy

### 10.1 API Error Normalization

```typescript
interface NormalizedError {
  status: number;        // HTTP status code
  message: string;       // User-friendly message
  code?: string;         // Machine-readable code
  field?: string;        // Form field for validation errors
}
```

### 10.2 Error Categories

| Status | Handling |
|--------|----------|
| 400 | Show validation errors on form fields |
| 401 | Attempt refresh → redirect to login |
| 403 | Show "not authorized" message |
| 404 | Show not-found page |
| 409 | Show conflict message (e.g., already favorited) |
| 422 | Show validation errors |
| 429 | Show rate-limit message, disable retry briefly |
| 500/530 | Show generic "service unavailable" |

### 10.3 UI Error States

- **Page-level**: Error boundary with retry button
- **Component-level**: Inline error with retry
- **Form-level**: Field validation messages
- **Toast/feedback**: Success/error notifications for mutations

---

## 11. Accessibility Requirements

- Skip-to-content link
- Semantic HTML (`<main>`, `<nav>`, `<header>`, `<footer>`)
- ARIA labels on interactive elements
- Focus visible indicators
- Dialog focus trapping
- Keyboard navigation for all interactive elements
- Form labels and `aria-describedby` for errors
- `role="alert"` for validation messages
- Reduced motion support (`prefers-reduced-motion`)
- Mobile touch targets (minimum 44x44px)
- Heading hierarchy (h1 → h2 → h3)
- Image alt text
- Color contrast (WCAG AA)

---

## 12. Security Considerations

| Risk | Mitigation |
|------|-----------|
| Token exposure | HttpOnly cookies only, never client-accessible |
| Token logging | Zero-tolerance policy, no console.log of tokens |
| Open redirects | Validate return URLs are internal paths only |
| Generic proxy abuse | Strict allowlist of paths and methods |
| XSS via user content | Never use `dangerouslySetInnerHTML`, escape all user text |
| CSRF | SameSite=Lax cookies + BFF pattern |
| Sensitive data in URL | Never put tokens in query parameters |
| Contact data persistence | Never store unmasked contacts in localStorage |
| Cross-user cache leaks | No shared cache for private responses |
| Refresh loops | Single retry, then clear session |
| Duplicate messages | Client UUID idempotency key |

---

## 13. Deferred Features

| Feature | Reason | Phase |
|---------|--------|-------|
| Browser push notifications | Backend only supports android/ios push tokens | Future |
| Profile editing | No PUT/PATCH `/users/me` endpoint in API | Future |
| Realtime WebSocket chat | No WebSocket contract in API | Future |
| Media uploads | Non-customer-facing endpoint | Out of scope |
| Property management | Owner/manager feature | Out of scope |
| Listing creation | Owner/manager feature | Out of scope |
| Admin dashboards | Admin-only | Out of scope |
| Content moderation UI | Admin-only | Out of scope |

---

## 14. Phase-by-Phase Implementation Checklist

### Phase 0: Repository Audit & Planning ✅
- [x] Inspect existing project structure
- [x] Inspect package.json, dependencies, configs
- [x] Verify lint, typecheck, build pass
- [x] Analyze OpenAPI spec
- [x] Produce customer-facing endpoint inventory
- [x] Identify excluded endpoints
- [x] Document contract gaps
- [x] Create implementation plan

### Phase 1: Frontend Foundation ✅
- [x] Environment configuration (`BACKEND_API_BASE_URL`, `NEXT_PUBLIC_APP_NAME`)
- [x] Server-side API client (`lib/api/client.ts`)
- [x] Error normalization (`lib/api/errors.ts`)
- [x] API allowlist enforcement (`app/api/proxy/[...path]/route.ts`)
- [x] Formatting utilities (`lib/formatting/`)
  - [x] Paise to INR
  - [x] Date formatting
  - [x] Date-time formatting
  - [x] Relative time
  - [x] Safe string fallback
  - [x] UUID/path handling
- [x] UI primitives (`components/ui/`)
  - [x] Input
  - [x] Select
  - [x] Textarea
  - [x] Checkbox/Switch
  - [x] Modal/Dialog
  - [x] Drawer
  - [x] Badge
  - [x] Skeleton
  - [x] Empty state
  - [x] Error state
  - [x] Confirmation dialog
  - [x] Toast/feedback
- [x] Responsive layout
  - [x] Desktop header
  - [x] Mobile header
  - [x] Mobile bottom navigation
  - [x] Footer
  - [x] Skip-to-content link
- [x] Route-level error boundaries
- [x] Route-level loading states
- [x] Health check utility
- [x] Domain folder structure
- [x] Tests for formatting, query serialization, API errors, allowlist, env validation

### Phase 2: Authentication & Session ✅
- [x] BFF routes (login, signup, OTP, refresh, logout, bootstrap)
- [x] Token adapter (extract from backend response)
- [x] Cookie management (set, clear, refresh)
- [x] Login page with password form
- [x] Signup page with identifier validation
- [x] OTP page (request + 6-digit input + resend cooldown)
- [x] Session bootstrap (server-side)
- [x] Protected route wrapper
- [x] Authenticated navigation
- [x] Tests: form validation, cookie config, refresh retry, redirect behavior

### Phase 3: Public Discovery ✅
- [x] Home page (college selector, search entry, listings)
- [x] Search page (URL filters, cursor pagination, INR conversion)
- [x] Listing cards (responsive, available data only)
- [x] Listing detail page
- [x] Property public page
- [x] Exact-address authorization handling
- [x] Public user profile
- [x] Tests: filter conversion, URL serialization, empty states, 404 handling

### Phase 4: Favorites & Listing Interests
- [x] Favorite toggle (cards + detail + favorites page)
- [x] Favorites page
- [x] Listing interest submission
- [x] Listing interests page (incoming/outgoing)
- [x] Interest status actions (accept/reject/withdraw)
- [x] Optimistic UI with rollback
- [x] Tests: optimistic rollback, duplicate prevention, grouping, transitions

### Phase 5: Roommate Discovery & Posts ✅
- [x] Roommate discovery page (filters, cards)
- [x] Create roommate post form
- [x] Roommate interest submission
- [x] Roommate interests page (incoming/outgoing)
- [x] Interest status actions
- [x] Expired post handling
- [x] Tests: search filters, validation, expired behavior, transitions

### Phase 6: Chat & Safety
- [x] Conversation creation from accepted interests
- [x] Conversation list page
- [x] Chat page (history, composer, send)
- [x] Cursor-based message loading
- [x] Message polling (with tab visibility)
- [x] Read receipts
- [x] Contact share workflow
- [x] Block/unblock user
- [x] Report content dialog
- [x] Tests: conversation mapping, idempotency, polling cleanup, authorization

### Phase 7: Dashboard, Notifications & Account
- [x] Dashboard page (entry points)
- [x] Notifications page (list, pagination, mark-read)
- [x] Notification preferences page
- [x] Profile settings page (read-only)
- [x] Session management page
- [x] Account deletion page
- [x] Tests: pagination, mark-read, preferences, revocation, deletion

### Phase 8: Ads & Polish ✅
- [x] Ad component (sponsored label, tracking)
- [x] Ad placement (home, search, listing)
- [x] Impression tracking (IntersectionObserver)
- [x] Click tracking (safe redirect)
- [x] Full UX polish pass
- [x] Tests: placement, deduplication, failure isolation

### Phase 9: Map & Geo-Radius Discovery ✅
- [x] Add `latitude`, `longitude`, `radiusMeters` filter parameters to filter types & serialization
- [x] Implement Geo-Radius and Location filter UI in listing filters
- [x] Create open-source Leaflet map component (`LocationMap` / `LeafletMapInner`) with pin markers, radius circle, and popups
- [x] Add Map View / Grid View / Split View toggle to Search page
- [x] Add Map view to Listing Details & Property Public pages for approximate location visualization
- [x] Unit & component tests for Map filters & location calculations

### Phase 9b: Google Maps–style Location Search & Pin Picker ✅
- [x] Add server geocode proxies: `/api/geocode/search` (Photon + Nominatim variants) and `/api/geocode/reverse`
- [x] Add `LocationPicker` + interactive pin map (Leaflet via `next/dynamic`, no browser-direct Nominatim)
- [x] Wire into roommate post create preferred-locality flow (single search box + suggestions + draggable pin)
- [x] Do **not** add address search into Interactive Area Map discovery UI (click-to-set radius center stays as-is)
- [x] Tests: address formatting, Photon/Nominatim mapping, query variants, dedupe

### Phase 10: Final Integration & QA
- [ ] End-to-end flow verification (30 flows)
- [ ] Security review
- [ ] Accessibility review
- [ ] Performance review
- [ ] Complete test suite
- [ ] Documentation (README, API assumptions)
- [ ] Final build verification

---

## 15. Verification Results

| Check | Status |
|-------|--------|
| `npm run lint` | ✅ Pass |
| `npx tsc --noEmit` | ✅ Pass |
| `npm run build` | ✅ Pass |

---

## 16. Repository Findings

### Existing Conventions to Preserve
- App Router with `(public)`, `(auth)`, `(protected)` route groups
- `@/*` path alias
- shadcn/ui `base-nova` style with `@base-ui/react`
- Tailwind CSS v4 with CSS variables for theming
- React Compiler enabled
- Geist fonts

### Architecture Decisions
- BFF pattern for auth (route handlers under `app/api/auth/`)
- Allowlisted proxy for customer API paths only
- Server-side token management via HttpOnly cookies
- URL search params for all filterable list views
- Cursor pagination throughout
- No realtime WebSocket — REST polling for chat

---

## 17. Contract Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| All response schemas missing | High — types must be validated against real backend | Isolate response normalization in adapter functions, use `unknown` at network boundary |
| Token response shape unknown | High — auth breaks if wrong field names | Single token adapter function, inspect actual backend |
| Pagination envelope unknown | Medium — list views may break | Adapter per endpoint, document assumed shape |
| Roommate post PATCH body unknown | Medium — edit form cannot be built | Defer full edit, implement only confirmed fields |
| Interest transition rules undocumented | Low — may show invalid actions | Client-side guard on known transitions, let backend reject |
| Ad creative response unknown | Low — ad display may fail | Graceful fallback, no-ad state |

---

*Generated: 2026-07-30*
*Phase: 9b — Google Maps–style Location Search & Pin Picker (Complete)*
*Next: Phase 10 — Final Integration & QA*
