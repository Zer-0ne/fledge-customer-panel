/**
 * Customer Panel API Proxy Allowlist
 * Enforces security boundaries by allowing only customer-facing endpoints.
 */

export interface AllowlistRule {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  pattern: RegExp;
}

export const CUSTOMER_ALLOWLIST: AllowlistRule[] = [
  // Health
  { method: 'GET', pattern: /^\/api\/v1\/health\/live$/ },
  { method: 'GET', pattern: /^\/api\/v1\/health\/ready$/ },

  // Colleges & Campuses
  { method: 'GET', pattern: /^\/api\/v1\/colleges$/ },
  { method: 'GET', pattern: /^\/api\/v1\/colleges\/[^\/]+\/campuses$/ },

  // Public Listings & Properties
  { method: 'GET', pattern: /^\/api\/v1\/listings$/ },
  { method: 'GET', pattern: /^\/api\/v1\/listings\/[^\/]+$/ },
  { method: 'GET', pattern: /^\/api\/v1\/properties\/[^\/]+$/ },
  { method: 'GET', pattern: /^\/api\/v1\/properties\/[^\/]+\/exact-address$/ },

  // Auth sessions + verification (customer self-service)
  { method: 'GET', pattern: /^\/api\/v1\/auth\/me$/ },
  { method: 'GET', pattern: /^\/api\/v1\/auth\/bootstrap$/ },
  { method: 'POST', pattern: /^\/api\/v1\/auth\/phone\/verify$/ },
  { method: 'POST', pattern: /^\/api\/v1\/auth\/logout$/ },
  { method: 'GET', pattern: /^\/api\/v1\/auth\/sessions$/ },
  { method: 'DELETE', pattern: /^\/api\/v1\/auth\/sessions\/[^\/]+$/ },
  // Student/Faculty verification (ID card / fee receipt) + UPI OTM
  { method: 'POST', pattern: /^\/api\/v1\/student-verifications$/ },
  { method: 'GET', pattern: /^\/api\/v1\/student-verifications\/mine$/ },
  { method: 'POST', pattern: /^\/api\/v1\/verification\/upi\/initiate$/ },
  { method: 'POST', pattern: /^\/api\/v1\/verification\/upi\/cancel$/ },

  // Users
  { method: 'GET', pattern: /^\/api\/v1\/users\/[^\/]+\/public$/ },
  { method: 'GET', pattern: /^\/api\/v1\/users\/me$/ },
  { method: 'DELETE', pattern: /^\/api\/v1\/users\/me$/ },

  // Favorites & Listing Interests
  { method: 'GET', pattern: /^\/api\/v1\/favorites$/ },
  { method: 'POST', pattern: /^\/api\/v1\/listings\/[^\/]+\/favorite$/ },
  { method: 'DELETE', pattern: /^\/api\/v1\/listings\/[^\/]+\/favorite$/ },
  { method: 'POST', pattern: /^\/api\/v1\/listings\/[^\/]+\/interests$/ },
  { method: 'GET', pattern: /^\/api\/v1\/listing-interests$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/listing-interests\/[^\/]+$/ },

  // Roommate Posts & Interests
  { method: 'GET', pattern: /^\/api\/v1\/roommate-posts$/ },
  { method: 'POST', pattern: /^\/api\/v1\/roommate-posts$/ },
  { method: 'GET', pattern: /^\/api\/v1\/roommate-posts\/mine$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/roommate-posts\/[^\/]+$/ },
  { method: 'POST', pattern: /^\/api\/v1\/roommate-posts\/[^\/]+\/interests$/ },
  { method: 'POST', pattern: /^\/api\/v1\/roommate-posts\/[^\/]+\/report$/ },
  { method: 'GET', pattern: /^\/api\/v1\/roommate-interests$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/roommate-interests\/[^\/]+$/ },

  // Community Integrity — appeals, restrictions & tenant verification (Phase 12)
  { method: 'POST', pattern: /^\/api\/v1\/appeals$/ },
  { method: 'GET', pattern: /^\/api\/v1\/appeals\/mine$/ },
  { method: 'GET', pattern: /^\/api\/v1\/restrictions\/mine$/ },
  { method: 'POST', pattern: /^\/api\/v1\/tenant-verifications\/requests$/ },
  { method: 'POST', pattern: /^\/api\/v1\/tenant-verifications\/[^\/]+\/(live-photo|evidence|confirm|refresh-code)$/ },
  { method: 'GET', pattern: /^\/api\/v1\/tenant-verifications\/mine$/ },
  { method: 'DELETE', pattern: /^\/api\/v1\/tenant-verifications\/[^\/]+\/evidence$/ },

  // Media (community-purpose uploads, presigned download/delete)
  { method: 'POST', pattern: /^\/api\/v1\/media\/uploads$/ },
  { method: 'POST', pattern: /^\/api\/v1\/media\/[^\/]+\/complete$/ },
  { method: 'GET', pattern: /^\/api\/v1\/media\/[^\/]+\/status$/ },
  { method: 'GET', pattern: /^\/api\/v1\/media\/[^\/]+\/download$/ },
  { method: 'DELETE', pattern: /^\/api\/v1\/media\/[^\/]+$/ },

  // Conversations & Chat
  { method: 'POST', pattern: /^\/api\/v1\/conversations$/ },
  { method: 'GET', pattern: /^\/api\/v1\/conversations$/ },
  { method: 'GET', pattern: /^\/api\/v1\/conversations\/[^\/]+\/messages$/ },
  { method: 'POST', pattern: /^\/api\/v1\/conversations\/[^\/]+\/messages$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/conversations\/[^\/]+\/delivered\/[^\/]+$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/conversations\/[^\/]+\/read\/[^\/]+$/ },
  { method: 'POST', pattern: /^\/api\/v1\/conversations\/[^\/]+\/contact-share$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/contact-share\/[^\/]+$/ },
  { method: 'GET', pattern: /^\/api\/v1\/contact-share\/[^\/]+$/ },
  { method: 'POST', pattern: /^\/api\/v1\/users\/[^\/]+\/block$/ },
  { method: 'DELETE', pattern: /^\/api\/v1\/users\/[^\/]+\/block$/ },
  { method: 'GET', pattern: /^\/api\/v1\/users\/blocked$/ },
  { method: 'GET', pattern: /^\/api\/v1\/users\/blocked-by$/ },
  { method: 'POST', pattern: /^\/api\/v1\/reports$/ },

  // Notifications
  { method: 'GET', pattern: /^\/api\/v1\/notifications$/ },
  { method: 'GET', pattern: /^\/api\/v1\/notifications\/unread-count$/ },
  { method: 'POST', pattern: /^\/api\/v1\/notifications\/read-all$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/notifications\/[^\/]+\/read$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/notifications\/[^\/]+\/archive$/ },
  { method: 'GET', pattern: /^\/api\/v1\/notifications\/preferences$/ },
  { method: 'PUT', pattern: /^\/api\/v1\/notifications\/preferences$/ },
  { method: 'PUT', pattern: /^\/api\/v1\/notifications\/preferences\/quiet-hours$/ },
  { method: 'GET', pattern: /^\/api\/v1\/notification-preferences$/ },
  { method: 'PUT', pattern: /^\/api\/v1\/notification-preferences\/[^\/]+$/ },
  // Web push device lifecycle (server-side push boundary — token registration only)
  { method: 'POST', pattern: /^\/api\/v1\/notifications\/devices$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/notifications\/devices\/[^\/]+$/ },
  { method: 'DELETE', pattern: /^\/api\/v1\/notifications\/devices\/[^\/]+$/ },
  { method: 'POST', pattern: /^\/api\/v1\/notifications\/devices\/[^\/]+\/heartbeat$/ },

  // Donations — Razorpay orders & verification
  { method: 'POST', pattern: /^\/api\/v1\/donations\/orders$/ },
  { method: 'POST', pattern: /^\/api\/v1\/donations\/verify$/ },
  { method: 'GET', pattern: /^\/api\/v1\/donations$/ },
  // Donations transparency — public config/summary + supporters wall + donor privacy prefs
  { method: 'GET', pattern: /^\/api\/v1\/donations\/config$/ },
  { method: 'GET', pattern: /^\/api\/v1\/donations\/supporters$/ },
  { method: 'POST', pattern: /^\/api\/v1\/donations\/preferences$/ },

  // Ads
  { method: 'POST', pattern: /^\/api\/v1\/ads\/select$/ },
  { method: 'POST', pattern: /^\/api\/v1\/ads\/events\/impression$/ },
  { method: 'POST', pattern: /^\/api\/v1\/ads\/events\/click$/ },
  { method: 'POST', pattern: /^\/api\/v1\/ads\/events\/viewable$/ },
  { method: 'POST', pattern: /^\/api\/v1\/ads\/events\/batch$/ },

  // Announcements (published, audience-matched)
  { method: 'GET', pattern: /^\/api\/v1\/announcements$/ },
  { method: 'GET', pattern: /^\/api\/v1\/announcements\/[^\/]+$/ },
  { method: 'POST', pattern: /^\/api\/v1\/announcements\/[^\/]+\/(seen|read|acknowledge|dismiss)$/ },

  // Contact preferences & Controlled Contact Fallback
  { method: 'GET', pattern: /^\/api\/v1\/listings\/[^\/]+\/contact-preference$/ },
  { method: 'PUT', pattern: /^\/api\/v1\/listings\/[^\/]+\/contact-preference$/ },
  { method: 'GET', pattern: /^\/api\/v1\/roommate-posts\/[^\/]+\/contact-preference$/ },
  { method: 'PUT', pattern: /^\/api\/v1\/roommate-posts\/[^\/]+\/contact-preference$/ },

  // Contact Share Requests & Access Grants
  { method: 'POST', pattern: /^\/api\/v1\/contact-share-requests$/ },
  { method: 'GET', pattern: /^\/api\/v1\/contact-share-requests$/ },
  { method: 'GET', pattern: /^\/api\/v1\/contact-share-requests\/[^\/]+$/ },
  { method: 'POST', pattern: /^\/api\/v1\/contact-share-requests\/[^\/]+\/approve$/ },
  { method: 'POST', pattern: /^\/api\/v1\/contact-share-requests\/[^\/]+\/reject$/ },
  { method: 'POST', pattern: /^\/api\/v1\/contact-share-requests\/[^\/]+\/revoke$/ },
  { method: 'GET', pattern: /^\/api\/v1\/contact-access-grants\/[^\/]+\/contact$/ },
  { method: 'POST', pattern: /^\/api\/v1\/contact-access-grants\/[^\/]+\/revoke$/ },

  // Fallback Contacts
  { method: 'POST', pattern: /^\/api\/v1\/fallback-contacts$/ },
  { method: 'GET', pattern: /^\/api\/v1\/fallback-contacts$/ },
  { method: 'POST', pattern: /^\/api\/v1\/fallback-contacts\/[^\/]+\/verify\/request$/ },
  { method: 'POST', pattern: /^\/api\/v1\/fallback-contacts\/[^\/]+\/verify\/confirm$/ },
  { method: 'POST', pattern: /^\/api\/v1\/fallback-contacts\/[^\/]+\/revoke\/request$/ },
  { method: 'POST', pattern: /^\/api\/v1\/fallback-contacts\/[^\/]+\/revoke$/ },
  { method: 'DELETE', pattern: /^\/api\/v1\/fallback-contacts\/[^\/]+$/ },

  // Availability Lifecycle & Entity Closure
  { method: 'POST', pattern: /^\/api\/v1\/listings\/[^\/]+\/availability-confirmation$/ },
  { method: 'POST', pattern: /^\/api\/v1\/roommate-posts\/[^\/]+\/availability-confirmation$/ },
  { method: 'POST', pattern: /^\/api\/v1\/listings\/[^\/]+\/close$/ },
  { method: 'POST', pattern: /^\/api\/v1\/roommate-posts\/[^\/]+\/close$/ },

  // External Approval Token Links
  { method: 'GET', pattern: /^\/api\/v1\/contact-approval\/[^\/]+\/context$/ },
  { method: 'POST', pattern: /^\/api\/v1\/contact-approval\/[^\/]+\/approve$/ },
  { method: 'POST', pattern: /^\/api\/v1\/contact-approval\/[^\/]+\/reject$/ },

  // Need Now — 24h housing requests, responses, saves, and owner/manager
  // properties (offer-listing flow). Nearby/campus feeds are public; the rest
  // are session-guarded on the backend.
  { method: 'POST', pattern: /^\/api\/v1\/housing-requests$/ },
  { method: 'GET', pattern: /^\/api\/v1\/housing-requests\/me$/ },
  { method: 'GET', pattern: /^\/api\/v1\/housing-requests\/nearby$/ },
  { method: 'GET', pattern: /^\/api\/v1\/housing-requests\/campus$/ },
  { method: 'GET', pattern: /^\/api\/v1\/housing-requests\/[^\/]+$/ },
  { method: 'PATCH', pattern: /^\/api\/v1\/housing-requests\/[^\/]+$/ },
  { method: 'POST', pattern: /^\/api\/v1\/housing-requests\/[^\/]+\/(publish|pause|resume|fulfil|renew|remove)$/ },
  { method: 'POST', pattern: /^\/api\/v1\/housing-requests\/[^\/]+\/responses$/ },
  { method: 'GET', pattern: /^\/api\/v1\/housing-requests\/[^\/]+\/responses$/ },
  { method: 'POST', pattern: /^\/api\/v1\/housing-requests\/[^\/]+\/save$/ },
  { method: 'DELETE', pattern: /^\/api\/v1\/housing-requests\/[^\/]+\/save$/ },
  { method: 'GET', pattern: /^\/api\/v1\/housing-request-responses\/(sent|received)$/ },
  { method: 'POST', pattern: /^\/api\/v1\/housing-request-responses\/[^\/]+\/(accept|decline|withdraw)$/ },
  { method: 'GET', pattern: /^\/api\/v1\/properties$/ },
  { method: 'GET', pattern: /^\/api\/v1\/properties\/[^/]+\/listings$/ },

  // Analytics ingestion
  { method: 'POST', pattern: /^\/api\/v1\/analytics\/events\/batch$/ },
  { method: 'POST', pattern: /^\/api\/v1\/analytics\/events\/batch\/anonymous$/ },

  // Onboarding (post-login question flow — Phase 15)
  { method: 'GET', pattern: /^\/api\/v1\/onboarding\/status$/ },
  { method: 'GET', pattern: /^\/api\/v1\/onboarding\/questions$/ },
  { method: 'POST', pattern: /^\/api\/v1\/onboarding\/responses$/ },
  { method: 'POST', pattern: /^\/api\/v1\/onboarding\/skip$/ },
];

/**
 * Validates whether a request (method + pathname) is in the allowed customer endpoints list.
 */
export function isAllowedCustomerEndpoint(method: string, pathname: string): boolean {
  const upperMethod = method.toUpperCase();
  // Ensure pathname starts with /api/v1
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return CUSTOMER_ALLOWLIST.some((rule) => {
    return rule.method === upperMethod && rule.pattern.test(normalizedPath);
  });
}

/**
 * Maps `/api/proxy/...` catch-all segments onto a backend pathname.
 * Clients call `/api/proxy/api/v1/colleges` — do not double-prefix `/api/v1`.
 */
export function resolveProxyBackendPath(pathSegments: string[]): string {
  const joined = `/${pathSegments.filter(Boolean).join('/')}`.replace(/\/{2,}/g, '/');

  if (joined === '/' || joined === '') {
    return '/api/v1';
  }

  if (joined === '/api/v1' || joined.startsWith('/api/v1/')) {
    return joined;
  }

  return `/api/v1${joined}`;
}
