import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: `Terms of Service — ${env.NEXT_PUBLIC_APP_NAME}`,
  description: 'Rules for using the student housing customer app.',
};

export default function TermsPage() {
  return (
    <SitePage
      title="Terms of Service"
      description={`Using ${env.NEXT_PUBLIC_APP_NAME} means you agree to these terms. Listings are provided by partners and other users; we are a discovery and messaging layer, not a landlord.`}
    >
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">The service</h2>
        <p>
          You may search colleges, view listings, save favorites, express interest, post roommate
          or Need Now requirements, and chat. We may show sponsored placements. Availability,
          rent, and property condition are the lister’s responsibility.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">Your account</h2>
        <p>
          Keep login details safe. Do not share accounts. We may suspend accounts for abuse,
          spam, fake listings, or posting contact details in images.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">Community posts</h2>
        <p>
          Roommate and similar personal posts must be genuine. Promotional creatives, QR codes,
          “call now” copy, and phone/email/WhatsApp in photos are not allowed.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">Liability</h2>
        <p>
          We do not guarantee a listing will remain available or that a roommate will be a good
          fit. Meet safely, verify independently, and use in-app chat before sharing personal
          numbers.
        </p>
      </section>

      <p>
        See also our{' '}
        <Link href="/privacy" className="font-medium text-primary hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </SitePage>
  );
}
