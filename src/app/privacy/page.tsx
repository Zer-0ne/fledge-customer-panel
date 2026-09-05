import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { env } from '@/lib/env';
import {
  CUSTOMER_EXPORT_SUMMARY,
  FLEDGE_SUPPORT_EMAIL,
  POLICY_LAST_UPDATED,
} from '@/lib/public-info';

export const metadata: Metadata = {
  title: `Privacy Policy — ${env.NEXT_PUBLIC_APP_NAME}`,
  description: 'How Fledge collects, uses, shares, protects, and deletes customer data.',
};

export default function PrivacyPage() {
  return (
    <SitePage
      title="Privacy Policy"
      description={`Effective ${POLICY_LAST_UPDATED}. This policy covers the Fledge customer website and mobile app.`}
    >
      <div
        role="note"
        className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-foreground"
      >
        <p className="font-semibold">Plain-language summary</p>
        <p className="mt-1 text-muted-foreground">
          We use your data to run housing discovery, matching, chat, safety, notifications,
          payments, and account controls. Contact details and exact property addresses are not
          made public by default. The sections below explain each flow and your choices.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">1. Data we collect</h2>
        <p>
          We process information you provide, including your display name, email address, phone
          number, profile, college or campus, preferences, and authentication or verification
          details. If you use verification features, we may also process the evidence you submit
          and the resulting verification status.
        </p>
        <p>
          We also process activity needed to provide the service: searches and saved searches,
          favourites, interests, roommate and Need Now posts, chat messages and attachments,
          contact-sharing requests and grants, reports, blocks, appeals, notification settings,
          donations, and support correspondence.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">2. Device, session, and location data</h2>
        <p>
          We process session identifiers, device labels or fingerprints, push-notification tokens,
          timestamps, and basic diagnostics to keep accounts signed in, deliver notifications,
          prevent abuse, and troubleshoot the service. If you grant location permission or enter a
          location, we use it for nearby search and matching. You can deny device location and use
          a manually selected area instead.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">3. How we use data</h2>
        <p>
          We use data to create and secure accounts; show relevant listings, roommates, and Need
          Now matches; run chat and contact approvals; remember preferences; deliver transactional
          and optional marketing notifications; process donations; select and measure sponsored
          placements; moderate content; investigate reports; prevent fraud; and improve reliability.
        </p>
        <p>
          Product analytics accepts only registered events and allowed properties. Message bodies
          and raw phone or email values are not intended to be analytics properties.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">4. What other people can see</h2>
        <p>
          Other users may see information you deliberately publish, such as your public profile,
          listing or roommate content, Need Now requirements, and the verification or trust badges
          attached to your profile. A badge indicates the check completed by Fledge; it is not a
          guarantee about a person, property, or transaction.
        </p>
        <p>
          Property discovery uses an approximate location. Exact addresses are kept separately and
          are available only through authorised product flows. Donation names and amounts appear on
          the supporters wall only when the donor explicitly opts in.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">5. Chat and contact sharing</h2>
        <p>
          Phone numbers and email addresses are hidden from public cards. Contact details are
          revealed only through an approved access grant, subject to the expiry and view limit shown
          in the app. A verified fallback contact may receive a request when the listing owner is
          unavailable. Grants can be rejected or revoked, but information already viewed or copied
          by another person cannot be pulled back from that person&apos;s device.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">6. Verification and moderation</h2>
        <p>
          Uploaded text, images, and documents may be checked automatically and, when necessary, by
          authorised reviewers. Checks can look for unsafe material, QR codes, contact details,
          promotional layouts, duplicates, or evidence needed for a verification request. Content
          may be rejected, limited, or removed, and supported decisions can be appealed in the app.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">7. Payments and service providers</h2>
        <p>
          Payment checkout is handled by Razorpay. Fledge receives transaction identifiers,
          amounts, status, and related records needed for confirmation, refunds, reconciliation, and
          fraud control; Fledge does not receive your full card details. We also use providers for
          Google sign-in, Firebase phone authentication and push notifications, email delivery,
          hosting, storage, maps, and operational monitoring. Each provider processes data under its
          own terms and privacy policy.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">8. When we disclose data</h2>
        <p>
          We disclose data to other users only through the product flows described above, to service
          providers that operate Fledge, when you direct us to do so, or when reasonably required by
          law, safety, fraud prevention, or the protection of users and the service. We do not sell
          your raw contact details.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">9. Retention and security</h2>
        <p>
          We retain information while your account or content is active and for the period needed to
          provide the service, resolve disputes, prevent abuse, keep legally required payment or
          audit records, and maintain backups. Sensitive contact details and exact addresses are
          stored separately with access controls and encryption. No online service can promise
          absolute security.
        </p>
        <p>
          Export jobs and erasure requests include server-generated expiry or scheduled dates; the
          app displays those dates rather than hiding them. Deletion can be delayed where retention
          is required by law, fraud prevention, payment reconciliation, or a valid dispute.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">10. Your controls</h2>
        <p>
          Settings lets you manage notifications, marketing choices, active sessions, contact
          privacy, and profile information. The current in-app export contains {CUSTOMER_EXPORT_SUMMARY}.
          Signed-in users can request it or schedule account erasure from{' '}
          <Link href="/settings/data" className="font-medium text-primary hover:underline">
            Settings → Data &amp; privacy
          </Link>
          . The confirmation screen explains the effect before the request is sent and shows the
          schedule returned by the API.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">11. Contact and policy changes</h2>
        <p>
          Questions, access requests, or privacy complaints can be sent to{' '}
          <a
            href={`mailto:${FLEDGE_SUPPORT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {FLEDGE_SUPPORT_EMAIL}
          </a>
          . We may update this policy when the product or legal requirements change. The effective
          date at the top identifies the current version.
        </p>
      </section>
    </SitePage>
  );
}
