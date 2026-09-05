import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: `Privacy Policy — ${env.NEXT_PUBLIC_APP_NAME}`,
  description: 'How we handle account data, chat, contact sharing, cookies, and exports.',
};

export default function PrivacyPage() {
  return (
    <SitePage
      title="Privacy Policy"
      description={`Last updated ${new Date().getFullYear()}. This describes how ${env.NEXT_PUBLIC_APP_NAME} uses data in the customer app. There is no separate CMS privacy document on the API — this matches the product as shipped.`}
    >
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">What we collect</h2>
        <p>
          Account details you submit (name, email, college, profile), listings you favourite or
          express interest in, roommate and Need Now posts, chat messages, reports, and device
          session metadata used to keep you signed in.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">How we use it</h2>
        <p>
          To run discovery, matching, chat, ads selection on home/search/listing placements, and
          safety features (moderation of images that contain contact details, block/report).
          Analytics events are allowlisted — message bodies and raw contact values are not sent as
          tracking properties.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">Cookies and session</h2>
        <p>
          Sign-in uses an HttpOnly access cookie (`cp_access_token`, short-lived) plus a refresh
          cookie. In local development the browser may talk to the same-origin proxy; in production
          it can talk directly to the API origin. You cannot set that cookie from JavaScript.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">Contact sharing</h2>
        <p>
          Phone numbers are revealed only after an approved, time-bounded access grant with a
          maximum view count. Revealed numbers are treated as sensitive: they are fetched
          no-store and should not be persisted in analytics.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">Your choices</h2>
        <p>
          Notification and marketing toggles live under Settings. You can export a copy of stored
          data or request erasure from{' '}
          <Link href="/settings/data" className="font-medium text-primary hover:underline">
            Settings → Your data
          </Link>
          {' '}(signed in). Erasure requires typing a confirmation phrase so it cannot happen by accident.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">Contact</h2>
        <p>
          Privacy questions:{' '}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact us
          </Link>
          .
        </p>
      </section>
    </SitePage>
  );
}
