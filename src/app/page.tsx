import { cookies } from 'next/headers';
import { LandingPage } from '@/components/marketing/landing-page';
import AuthenticatedHome from '@/components/home/authenticated-home';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';

/**
 * `/` — public landing for visitors, the signed-in home for everyone else.
 *
 * The route is now public (see `src/proxy.ts`): a guest gets real inventory and
 * a clear description of the product instead of an instant redirect to the
 * Google button. Session-dependent, so it is never statically prerendered.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!sessionCookie) {
    return <LandingPage />;
  }

  return <AuthenticatedHome />;
}
