import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { env } from '@/lib/env';
import { FLEDGE_SUPPORT_EMAIL, POLICY_LAST_UPDATED } from '@/lib/public-info';

export const metadata: Metadata = {
  title: `Terms of Service — ${env.NEXT_PUBLIC_APP_NAME}`,
  description: 'Terms for using Fledge housing discovery, matching, chat, and payment features.',
};

export default function TermsPage() {
  return (
    <SitePage
      title="Terms of Service"
      description={`Effective ${POLICY_LAST_UPDATED}. These terms apply to the Fledge customer website and mobile app.`}
    >
      <div
        role="note"
        className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-foreground"
      >
        <p className="font-semibold">Before you use Fledge</p>
        <p className="mt-1 text-muted-foreground">
          Fledge helps people discover housing, match, and communicate. Fledge is not the landlord,
          tenant, broker, guarantor, or payment escrow for a housing transaction. Verify a person,
          property, price, and agreement independently before paying or meeting.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">1. Accepting these terms</h2>
        <p>
          By creating an account, signing in, or using Fledge, you agree to these terms and the{' '}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the service. You must provide accurate information and be
          legally able to enter any housing arrangement you choose to make.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">2. What the service does</h2>
        <p>
          Fledge provides college and campus-based housing search, approximate map discovery,
          favourites, saved searches, roommate posts, Need Now requirements, interests, chat,
          consent-based contact sharing, notifications, sponsored placements, and optional
          donations. Features may change, pause, or vary by location and account eligibility.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">3. Accounts and security</h2>
        <p>
          Keep your sign-in method and devices secure, do not share an account, and promptly revoke
          sessions you do not recognise. You are responsible for activity performed through your
          account until you notify us or revoke access. Do not impersonate another person or submit
          false verification evidence.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">4. Listings, posts, and availability</h2>
        <p>
          Listings and user posts are supplied by partners or users. The person publishing content is
          responsible for its accuracy, authority, legality, availability, rent, deposits, amenities,
          condition, and required permissions. Fledge moderation or a verification badge does not
          replace an inspection, identity check, title check, written agreement, or professional advice.
        </p>
        <p>
          Need Now requirements expire after the period displayed in the app. Withdrawing, declining,
          or expiry can close the related response flow or conversation. Review the confirmation copy
          before submitting any of those actions.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">5. Community and content rules</h2>
        <p>
          Content must be genuine, lawful, relevant, and respectful. Do not post scams, harassment,
          discrimination, explicit or unsafe material, misleading prices, duplicate promotions, QR
          codes, or phone, email, social-handle, or WhatsApp details in images or public post text when
          the product requires protected contact sharing. Do not upload content you lack rights to use.
        </p>
        <p>
          Automated checks and authorised reviewers may reject, limit, or remove content. Where the
          product offers an appeal, submit accurate context and evidence through that flow.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">6. Chat, contact sharing, and safety</h2>
        <p>
          Use in-app chat before sharing personal details. A contact grant is temporary and may have a
          view limit, but the recipient can still copy information after it is revealed. Do not misuse
          another person&apos;s contact details, scrape profiles, spam users, or move a conversation off
          platform to evade safety controls. Use block and report tools for abuse; contact local
          emergency services for immediate physical danger.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">7. Sponsored content, payments, and donations</h2>
        <p>
          Sponsored placements are labelled and do not guarantee quality or availability. Payment
          checkout may be provided by Razorpay or another disclosed provider. Any amount, recurrence,
          cancellation, refund, and visibility choice shown before confirmation forms part of that
          transaction. A donation supports Fledge; it does not buy ranking, verification, priority
          support, or a better housing outcome.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">8. Prohibited use</h2>
        <p>
          Do not attack, reverse engineer, overload, automate unauthorised access to, or bypass the
          security and rate limits of Fledge. Do not use the service for unlawful housing practices,
          fraud, surveillance, resale of personal data, or any activity that harms another user or the
          platform.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">9. Enforcement and account deletion</h2>
        <p>
          We may restrict content, features, or accounts to investigate risk, enforce these terms, or
          comply with law. Signed-in customers can schedule account erasure in Settings. The app shows
          the server-returned schedule before and after submission. Some payment, fraud-prevention,
          dispute, backup, or audit records may be retained where reasonably necessary or legally required.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">10. No guarantee and limitation</h2>
        <p>
          Fledge is provided on an “as available” basis. We do not guarantee uninterrupted access,
          a match, continued availability, the identity or conduct of a user, property condition, or
          completion of a transaction. To the extent permitted by applicable law, Fledge is not liable
          for indirect or consequential loss arising from user content or an agreement made outside Fledge.
          Nothing here excludes rights or liability that cannot legally be excluded.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">11. Changes and contact</h2>
        <p>
          We may update the service or these terms. Material changes will be communicated where
          required, and the effective date above identifies the current version. Questions can be sent
          to{' '}
          <a
            href={`mailto:${FLEDGE_SUPPORT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {FLEDGE_SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </SitePage>
  );
}
