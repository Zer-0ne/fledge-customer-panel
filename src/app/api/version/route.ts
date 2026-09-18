import { NextResponse } from 'next/server';

/**
 * BFF — `GET /api/version`
 *
 * The build identity of the deployment that served the running page. The PWA
 * update prompt polls this (on boot, on resume/focus/online, and on a timer)
 * and compares it with the id the page booted with: a different value means a
 * newer build exists, so the user gets an explicit Update button.
 *
 * iOS Safari only re-checks the service worker when the PWA is relaunched, so
 * a version poll on resume is the only reliable "new version" signal there —
 * that is why this is a route and not just a SW `updatefound` listener.
 */

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' } as const;

/** Stable per deployment (Vercel exposes the commit at runtime too). */
function buildId(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    'dev'
  );
}

export async function GET() {
  return NextResponse.json(
    { buildId: buildId() },
    { headers: NO_STORE }
  );
}
