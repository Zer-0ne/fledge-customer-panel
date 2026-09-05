<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Customer Panel (flat-system)

Customer-facing Next.js app of the flat-system project: student housing discovery (listings, map/geo search, roommates, chat, favorites, ads). Next.js 16.2.12 + React 19 + Tailwind v4 (`@tailwindcss/postcss`) + shadcn tokens, pnpm. Backend is a separate Nest API on :4001 — READ-ONLY from this repo; never modify it (contract gaps → report in `docs/`).

## Dev environment

- `pnpm dev` — Next dev server. Default :3000 is often taken by the Flutter web customer port → Next auto-increments to :3001. Check `ss -tlnp` before assuming the port.
- Backend must be up at `http://localhost:4001` (`/api/v1`); partner portal :3002, admin-panel :3001.
- Env: copy `.env.example` → `.env.local` (`BACKEND_API_BASE_URL=http://localhost:4001`, `NEXT_PUBLIC_BACKEND_API_BASE_URL=http://localhost:4001`, `NEXT_PUBLIC_API_BASE_URL=/api/proxy`, `NEXT_PUBLIC_SOCKET_URL=http://localhost:4001`).
- Browser API calls use `NEXT_PUBLIC_API_BASE_URL` (local dev proxy) or the direct API origin via `NEXT_PUBLIC_BACKEND_API_BASE_URL` in production; route handlers still use `BACKEND_API_BASE_URL`.

## Build & test (exact)

- `pnpm run test` — `npx vitest run` (153 tests, node env; `@` → `src/` via vitest alias)
- `npx tsc --noEmit` — type check (0 errors expected)
- `pnpm run lint` — eslint (project-wide); per-file: `npx eslint <file>`
- `pnpm run build` — `next build` (34/34 pages)

## Conventions (observed)

- App Router under `src/app/`; auth-gated pages in the `(protected)` route group, auth pages in `(auth)`, public pages at root. Pages are `'use client'` with client-side fetching (`useEffect` + services in `src/lib/api/services/*.ts`); wrap `useSearchParams` consumers in `<React.Suspense>`.
- Every backend call goes through `apiFetch` from `@/lib/api/client`; shared types in `src/types/index.ts` (Listing, AdPlacement, AdCreative…).
- Tests are colocated `*.test.ts` beside the service they cover (vitest globals).
- Auth: HttpOnly `cp_access_token` (900s) + refresh cookie; the BFF proxy injects `Authorization: Bearer` server-side from the cookie.
- Ads: placements `'home' | 'search' | 'listing'`; tiers STANDARD/BOOST/PREMIUM/MAXIMUM drive card design + server-side selection (`tiers` array in `POST /api/v1/ads/select`). Customer-facing badges never show literal tier names — only Sponsored / Featured / Premium Partner / Exclusive Partner.
- Feed: `MasonryGrid` (`src/components/common/masonry-grid.tsx`) + one carousel per ad tier, spread through the feed (never clustered at top), premiumness order (Maximum → Premium → Boost → Standard).
- `reactCompiler: true` in `next.config.ts` — React Compiler is on; don't hand-optimize with useMemo/useCallback unless measured.

## Pitfalls

- **Port 3000 collision**: Flutter web customer port occupies :3000 in this workspace — the Next dev server lands on :3001. Don't kill the Flutter process; use the actual port.
- **Backend :4001 is read-only** — curl/read only, never modify.
- **Login**: the BFF 403s `/auth/login`; real login is the app's own `/api/auth/login` route. The session cookie is HttpOnly — cannot inject via `document.cookie`, log in through the UI (test: `partner@test.local` / `Partner@Test2026!`, see flat-system `docs/LOCAL_TEST_CREDENTIALS.md`).
- **Tailwind v4 (lightningcss) strips unprefixed `backdrop-filter`** from stylesheets — apply `backdropFilter` + `WebkitBackdropFilter` via inline `style`.
- **Masonry must observe wrappers, not just the container**: the container has explicit `style={{height}}`, so async growth (ads 0→480px) never fires a container-only ResizeObserver → the ad card overlaps cards below. `masonry-grid.tsx` observes the container AND every wrapper.
- **Ads fill-fail renders `null`** (0-height masonry slot) — host page is never blocked; don't add placeholder boxes (visible gaps).
- **`pnpm run test` is vitest**, not jest — no jest config exists in this repo.
