import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { env } from '@/lib/env';
import { FLEDGE_SUPPORT_EMAIL } from '@/lib/public-info';

export const metadata: Metadata = {
  title: `Pricing — ${env.NEXT_PUBLIC_APP_NAME}`,
  description:
    'Fledge is free for students and tenants — no listing fees, no brokerage, and no commission on rent. Optional donations support platform running costs.',
};

export default function PricingPage() {
  return (
    <SitePage
      title="Pricing"
      description="What Fledge charges, what it never charges, and where the money comes from."
    >
      <div
        role="note"
        className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-foreground"
      >
        <p className="font-semibold">Free for students and tenants</p>
        <p className="mt-1 text-muted-foreground">
          Every customer feature is free. Fledge does not charge a listing fee, brokerage, or a
          commission on your rent or deposit.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">1. What is free</h2>
        <p>
          Browsing listings, college and locality search, saved searches, favourites, roommate posts
          and matching, Need Now requirements, in-app chat, consent-based contact sharing,
          notifications, and the safety and moderation features are all included at no cost. There is
          no paid tier that changes what you can find or whom you can talk to.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">
          2. What Fledge never charges for
        </h2>
        <p>
          Ranking, visibility, verification badges, moderation outcomes, priority support, or a
          better housing outcome cannot be bought with a payment. Sponsored placements are always
          labelled, and sponsorship never guarantees quality, availability, or a completed deal.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">3. How Fledge is funded</h2>
        <p>
          Labelled sponsored placements bought by housing partners through the partner portal, and
          optional donations from users who want to support the platform. Both are clearly marked,
          and neither changes what stays free.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">4. Optional donations</h2>
        <p>
          Donations are entirely optional. The{' '}
          <Link href="/donate" className="font-medium text-primary hover:underline">
            Donate
          </Link>{' '}
          page always shows the current suggested amounts, supports a one-time or monthly
          contribution, and confirms the amount and recurrence before payment. A monthly donation can
          be cancelled at any time — see{' '}
          <Link href="/refunds" className="font-medium text-primary hover:underline">
            Cancellation &amp; Refunds
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">5. Costs outside Fledge</h2>
        <p>
          Rent, deposits, tokens, and any brokerage or service fee charged by a landlord, partner, or
          broker are paid outside Fledge and are not collected or held by us. Confirm every amount
          and pay through a channel you can verify. Fledge is not a party to your housing agreement.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">6. Questions</h2>
        <p>
          Billing or pricing questions can be sent to{' '}
          <a
            href={`mailto:${FLEDGE_SUPPORT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {FLEDGE_SUPPORT_EMAIL}
          </a>{' '}
          or through the{' '}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact page
          </Link>
          .
        </p>
      </section>
    </SitePage>
  );
}
