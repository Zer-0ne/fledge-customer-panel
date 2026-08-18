# Customer Panel — Project Status

> **Document type:** Phase-wise implementation status  
> **Last updated:** 2026-07-31  
> **Related plan:** `docs/customer-panel-implementation-plan.md`

---

## Status legend

| Status | Meaning |
|--------|---------|
| `Complete` | Implemented, wired to intended UX/API, and verified with evidence |
| `Partial` | Present in source but incomplete or unverified |
| `Not started` | Not implemented |
| `Blocked` | Waiting on API/contract/infra |

---

## Phase summary

| Phase | Name | Status |
|-------|------|--------|
| 0 | Repository audit and plan | `Complete` |
| 1 | Foundation and app shell | `Complete` |
| 2 | Authentication | `Complete` |
| 3 | Public listing discovery | `Complete` |
| 4 | Favorites and listing interests | `Complete` |
| 5 | Roommate flows | `Complete` |
| 6 | Chat, contact sharing and safety | `Complete` |
| 7 | Notifications and account settings | `Complete` |
| 8 | Customer ad placements and polish | `Complete` |
| 9 | Map & geo-radius discovery | `Complete` |
| **9b** | **Google Maps–style location search & pin picker** | **`Complete`** |
| 10 | Final QA and production readiness | `Not started` |

---

# Phase 9b — Google Maps–style Location Search & Pin Picker

## Objective

Replace basic locality text / broken browser-direct Nominatim search with a single Google Maps–style address box, autocomplete suggestions, map fly-to, and reverse-geocode on pin move — proxied through Next.js API routes (Photon primary, Nominatim fallback).

## Current status: `Complete`

### Completed

- [x] `/api/geocode/search` — Photon (India bbox) + progressive query variants + Nominatim fallback with server `User-Agent`
- [x] `/api/geocode/reverse` — Photon reverse first, Nominatim fallback
- [x] Shared mapping helpers in `src/lib/geocode/mapping.ts` (Photon extent → Nominatim bbox, India filter, dedupe)
- [x] `LocationPicker` combobox UX (debounce ~400ms, keyboard nav, selected-place banner)
- [x] `LocationPickerMap` — Leaflet interactive/draggable pin via `next/dynamic` (`ssr: false`)
- [x] Wired into roommate post create **Preferred Locality** (`src/app/(protected)/roommate-posts/new/page.tsx`)
- [x] Intentionally **not** added to Interactive Area Map discovery UI (`src/components/map/*`) — that map keeps click-to-set radius center
- [x] Unit tests for address formatting / Photon–Nominatim mapping / query variants
- [x] No invented OpenAPI fields: lat/lng + address kept in form UX; roommate create body unchanged (OpenAPI has no locality/lat/lng on POST)

### Evidence

| Area | Path |
|------|------|
| Search proxy | `src/app/api/geocode/search/route.ts` |
| Reverse proxy | `src/app/api/geocode/reverse/route.ts` |
| Mapping + format helpers | `src/lib/geocode/mapping.ts` |
| Picker UI | `src/components/common/location-picker.tsx` |
| Picker map | `src/components/common/location-picker-map.tsx` |
| Integration | `src/app/(protected)/roommate-posts/new/page.tsx` |
| Tests | `src/lib/geocode/mapping.test.ts` |

### Out of scope for this phase

- Interactive Area Map address search input (discovery map stays pin/radius-only)
- Listing/property create address pickers (owner flows live in partner portal)
- Sending locality/lat/lng on roommate POST until OpenAPI documents those fields

### Exit criteria

- [x] User can paste/type a full address in one box
- [x] Autocomplete suggestions via `/api/geocode/search` (not browser Nominatim)
- [x] Selecting a suggestion updates map pin + lat/lng
- [x] Dragging pin updates address via `/api/geocode/reverse`
- [x] Full Indian addresses can succeed via Photon + query variants
- [x] Status docs updated with Phase 9b

---

## Recommended next work

### Immediate next task

Phase 10 — Final Integration & QA (E2E flows, security/a11y/perf review, docs).

### Backend questions

1. Should roommate POST accept `locality` and/or `latitude`/`longitude`? (Currently undocumented; UI keeps address for UX only.)
2. Confirm listing geo filters (`latitude`, `longitude`, `radiusMeters`) runtime behavior for empty vs campus-default centers.

---

*Maintainer note: update this file at phase start/end with evidence, never mark `Complete` without source + verification.*
