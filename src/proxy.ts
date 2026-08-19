/**
 * Route protection proxy — `src/proxy.ts` (Next.js 16 `proxy` convention,
 * formerly `middleware`).
 *
 * Cheap, fast gating on every matching request (including client-side RSC
 * navigations and prefetches): the whole customer panel is login-gated.
 *   - No `cp_access_token` cookie → immediate redirect to /login. The home
 *     page is protected too — no bootstrap/data API call ever fires without
 *     a session cookie.
 *   - Public exceptions: auth pages (/login /signup /otp), the token-based
 *     contact-approval email deep link, the static ad-style design preview,
 *     and company/legal pages (/about /faq /contact /privacy /terms).
 *
 * This is NOT an authorization decision — the backend's 401/403 always win
 * (the `(protected)` layout + auth provider handle expired sessions).
 */

import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

const PUBLIC_PATH_PATTERN =
  /^\/(login|signup|otp|contact-approval|ad-style-preview|about|faq|contact|privacy|terms)(\/|$)/;

export type ProxyDecision =
  | { type: "pass" }
  | { type: "redirect"; to: string };

/**
 * Pure decision function (unit-testable): decides the action for a pathname
 * given whether an access cookie is present.
 */
export function decideProxyAction(input: {
  pathname: string;
  isAuthenticated: boolean;
}): ProxyDecision {
  const { pathname, isAuthenticated } = input;

  // Auth pages, email deep link, and design preview stay public.
  if (PUBLIC_PATH_PATTERN.test(pathname)) {
    return { type: "pass" };
  }

  return isAuthenticated
    ? { type: "pass" }
    : { type: "redirect", to: "/login" };
}

export function proxy(request: NextRequest): NextResponse | undefined {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = request.cookies.has(ACCESS_TOKEN_COOKIE);
  const decision = decideProxyAction({ pathname, isAuthenticated });

  if (decision.type === "redirect") {
    // Preserve the intended destination so post-login redirect works.
    const target = `/login?returnUrl=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(new URL(target, request.url), { status: 302 });
  }

  return undefined;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
