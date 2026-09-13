# SVG / brand-mark audit — customer panel

Scope: where third-party **brand marks** belong in `customer-panel`, which of them
`svgl.app` actually carries, what shipped, and what must stay as-is.

Written against the live svgl API (`https://api.svgl.app`), customer panel on
`main` at the time of the audit.

## 1. What the panel uses today

| Kind | Count | Where |
| --- | --- | --- |
| Files importing `lucide-react` | 104 | `src/app/**`, `src/components/**` |
| Distinct lucide icons | 119 | — |
| Inline hand-written SVGs | 4 | `auth/google-sign-in-button.tsx`, `handwriting-svg.tsx`, `map/leaflet-map-inner.tsx`, `kokonutui/liquid-glass-card.tsx` |
| Brand assets in `public/` | 0 (before this change) | — |

Top icons: `Loader2` (34), `CheckCircle2` (24), `Sparkles` (21), `ShieldCheck` (20),
`MapPin` (15), `Users` (14), `Search` (12).

**Rule that follows from this:** lucide is the correct tool for ~119 generic
actions/states (search, bell, shield, loader…). svgl is a *brand logo* library —
it ships no generic UI icons, so it can only replace icons that name a real
product. Mixing the two roles is what produces fake-looking UI.

## 2. What svgl.app is (verified)

- `GET https://api.svgl.app/` → 669 entries; `GET https://api.svgl.app/?search=<q>`
  → filtered; `GET https://api.svgl.app/categories` → 40+ categories.
- Each entry exposes `route` (a `.svg` URL, sometimes `{light,dark}`) and
  `wordmark`.
- Catalog is brand/tech logos: Software 286, Library 77, AI 68, Design 62,
  Adobe 56, Framework 53, Google 22, Payment 8, …
- Licensing note from svgl itself: *"Permission must be obtained before using a
  logo."* → We only render a mark where the UI genuinely talks about that
  product; never as decoration.

## 3. Shipped in this change

Files live in `public/brand/svgl/` (downloaded once, served from our own origin —
no runtime call to a third-party host).

| UI surface | File | Mark | Animation |
| --- | --- | --- | --- |
| Sponsored-ad CTA "Chat on WhatsApp" (all 4 tiers) | `components/ads/sponsored-ad.tsx` | `whatsapp.svg` | `group-hover:animate-brand-wiggle` |
| Listing detail → "Share on WhatsApp" (`wa.me` deep link) | `app/listings/[id]/page.tsx` | `whatsapp.svg` | `group-hover:animate-brand-wiggle` |
| PWA install dialog → browser/platform steps | `components/pwa/pwa-install-button.tsx` | `chrome` `safari` `firefox` `edge` `brave` `android` `apple` | staggered `animate-brand-pop` (90 ms apart) |

Supporting code:

- `src/lib/brand/logos.ts` — single source of truth (key → `{src, label, invertInDark}`).
- `src/components/brand/brand-logo.tsx` — renders the mark as `<img>` (full-colour
  artwork, gradients included) and passes caller classes through for animation.
- `src/lib/pwa/install.ts` — `getPwaInstallGuidance()` now also returns
  `brands: BrandLogoKey[]`, i.e. the marks the existing copy already names
  ("Install with Chrome or Edge" → chrome + edge). Copy itself is unchanged;
  UA detection adds Chrome/Edge/Firefox/Brave/Safari families.
- `globals.css` — `--animate-brand-pop`, `--animate-brand-wiggle` (transform +
  opacity only) with a `prefers-reduced-motion` guard that also covers variant
  forms (`[class*='animate-brand-']`).

Why `<img>` and not an inline component: Safari (17 KB), Firefox (12 KB) and
Brave (8 KB) marks carry their own gradients and internal IDs — inlining them
would bloat the JS bundle and collide gradient ids when several render at once.
The WhatsApp glyph is small (1.6 KB) but is kept in the same pipeline so there is
one mechanism, not two.

## 4. Verified NO-GO

| Candidate | Finding | Decision |
| --- | --- | --- |
| Google sign-in "G" | `svgl.app/library/google.svg` is an 8 KB **gradient rendition**: 9 `linearGradient`s and 49 fills (`#ff4540`, `#3086ff`, `#0fbc5f`…), i.e. not the flat official mark. Google's sign-in branding requires the flat `#4285F4 / #34A853 / #FBBC05 / #EA4335` asset, which the button already inlines. | Keep the inline flat G. Do not swap. |
| Razorpay / UPI / NPCI / BHIM / Paytm / PhonePe / Cashfree / PayU / HDFC / ICICI / SBI / Axis | API returns `{"error":"❌ (SVGL - API) SVG not found"}` for every one of these — svgl has no India payment-rail marks. | Donate + UPI verify keep text + lucide (`IndianRupee`, `ShieldCheck`). No fake badges. |
| College-email verification | The screen explicitly rejects Gmail/Outlook/Yahoo addresses, so Gmail/Outlook marks would contradict the copy. | No brand mark. |
| Support email / footer socials | `public-info.ts` exposes `support@fledge.nearestz.com` and no social handles; svgl *does* carry Instagram/X/LinkedIn/Telegram/Facebook, but linking invented handles is worse than no icon. | Blocked until real handles + a support WhatsApp number exist. |
| Device icons in `settings/sessions` | `MonitorSmartphone` is decorative (sessions list has no OS data), not a platform statement. | Keep lucide. |
| Firebase / FCM | Infrastructure, never surfaced as a product to end users. | No brand mark. |

## 5. Adding another mark later

```bash
# 1. confirm the entry exists (svgl needs the exact slug from `route`)
curl -s "https://api.svgl.app/?search=<term>" | grep -o 'svgl.app/library/[^"]*'
# 2. download into the panel (never hotlink svgl at runtime)
curl -sS -o public/brand/svgl/<key>.svg "https://svgl.app/library/<slug>.svg"
# 3. register it in src/lib/brand/logos.ts, then use <BrandLogo brand="<key>" />
```

`brand-logo.test.tsx` fails if a registered key has no file on disk, and
`install.test.ts` fails if a guidance entry points at a key that is not shipped.

## 6. Evidence (this change)

```
npx tsc --noEmit                     → 0 errors
npx vitest run                       → 34 files / 319 tests passed
pnpm run lint  (7 touched files)     → 0 errors, 0 warnings
pnpm run build                       → compiled, 42 pages
PORT=3011 pnpm start + curl          → /brand/svgl/*.svg all 200 image/svg+xml
                                       (whatsapp 1590B, chrome 1183B, safari 16834B,
                                        firefox 12170B, edge 4015B, brave 7914B,
                                        android 1893B, apple 678B)
built CSS check                      → @keyframes brand-pop, @keyframes brand-wiggle,
                                       .group-hover\:animate-brand-wiggle,
                                       @media (prefers-reduced-motion: reduce) guard
visual check                         → all 8 marks rasterised and inspected:
                                       correct glyph, none blank/cropped
```

Project-wide lint still reports 27 pre-existing errors in untouched files
(`verify/phone`, `verify/upi`, `ui/toast`, `handwriting-svg`, …) — unrelated to
this change and not part of this audit's scope.
