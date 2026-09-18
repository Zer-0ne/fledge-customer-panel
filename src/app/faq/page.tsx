import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { FaqList } from './faq-list';
import { JsonLd } from '@/components/seo/json-ld';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: `FAQ — ${env.NEXT_PUBLIC_APP_NAME}`,
  description:
    'Answers about listings, roommates, Need Now, verification badges, contact privacy, sponsorships, and your data on Fledge.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: `FAQ — ${env.NEXT_PUBLIC_APP_NAME}`,
    description: 'How Fledge works: search, roommates, Need Now, verification, privacy and data.',
    url: '/faq',
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Who is Fledge for?',
    a: 'The customer app is built around students and college-area housing. Housing owners, managers, and advertisers use a separate partner portal. Access to individual features can depend on account role, verification, college rules, and availability in your area.',
  },
  {
    q: 'How do I sign in to Fledge?',
    a: 'The Fledge customer website and app sign you in with Google: a Google identity token is exchanged for a Fledge session, and Fledge never receives your Google password. The older phone one-time-code (OTP) login is retired. The partner portal additionally supports email/phone and password sign-in.',
  },
  {
    q: 'How does nearby search use my location?',
    a: 'If you allow device location, Fledge sends coordinates and a search radius to find nearby results. You can deny permission and choose an area manually. Public property results use approximate rather than exact address coordinates.',
  },
  {
    q: 'What happens when I express interest?',
    a: 'Fledge records your interest and may open or reuse a conversation with the relevant owner or user. Expressing interest is not a booking, tenancy agreement, payment, or guarantee of availability.',
  },
  {
    q: 'What is Need Now?',
    a: 'Need Now is a time-limited housing requirement, and it is chat-first: when someone responds, a conversation opens straight away so both sides can discuss the offer in context. The requirement owner can accept or decline the response inside that thread. Withdrawing a response, declining it, or expiry closes the linked conversation; contact details remain protected unless a separate contact flow is approved.',
  },
  {
    q: 'How do roommate posts work?',
    a: 'You can publish a genuine personal requirement, browse matches, express interest, and chat in-app. Posts and images are moderated. Promotional layouts, QR codes, and public phone, email, social-handle, or WhatsApp details can be rejected; eligible decisions can be appealed.',
  },
  {
    q: 'What do verification badges and owl trust tiers mean?',
    a: 'Fledge shows role verification badges — verified student, verified faculty, verified partner, or verified college membership (a college email proves membership only, never a role) — and owl trust tiers (bronze, silver, gold, diamond) that reflect verified identity, approved activity, and account history. A badge shows the checks completed at that time, can change if a verification is revoked, and is context, not a guarantee of identity, conduct, ownership, property quality, or transaction safety. Always verify independently before meeting or paying.',
  },
  {
    q: 'Can one account be both a customer and a partner?',
    a: 'Portal identities are mutually exclusive. An account uses the customer or the partner portal at a time; switching requires re-authentication and an explicit confirmation, revokes the role-specific verification of the previous identity, and pauses content published under it — records are preserved, not deleted. Existing sessions are signed out because your access set changes.',
  },
  {
    q: 'Why is the phone number hidden?',
    a: 'Direct contact details are hidden from public cards. Depending on the listing preference, you may need to chat, request access, wait for approval, or use a verified fallback-contact flow. The approval screen shows the grant expiry and view limit (a single view by default) before contact is revealed.',
  },
  {
    q: 'Can contact access be revoked?',
    a: 'A pending request can be rejected and an active grant can be revoked through supported flows. Revocation blocks later retrieval, but it cannot remove details that the recipient already viewed, copied, or stored outside Fledge.',
  },
  {
    q: 'How do sponsored listings and donations work?',
    a: 'Sponsored placements are labelled and selected for supported home, search, or listing locations. Sponsorship does not verify a property or guarantee availability. Donations support Fledge and do not buy ranking or trust; supporter name and amount are public only when the donor opts in.',
  },
  {
    q: 'What does the data export include?',
    a: 'The current export contains account status, profile and contact details, settings, saved searches, favourites, and trust score. The API generates a completed JSON snapshot and returns its expiry. The Data & privacy screen shows the job status and lets you retrieve it while available.',
  },
  {
    q: 'What happens when I schedule data erasure?',
    a: 'You must type PURGE and confirm before Fledge sends the request. The backend returns a scheduled erase date, which the app displays. Data remains during the grace period and limited payment, dispute, fraud-prevention, backup, or audit records may be retained when required.',
  },
  {
    q: 'How do I report a safety or content issue?',
    a: 'Use the in-app report or block action for a listing, post, or conversation so the relevant identifiers reach moderation. Email support for account or privacy help. For immediate physical danger, contact local emergency services; Fledge is not an emergency service.',
  },
];

export default function FaqPage() {
  return (
    <SitePage
      title="Frequently asked questions"
      description={`How ${env.NEXT_PUBLIC_APP_NAME} works for search, roommates, Need Now, and privacy.`}
    >
      <div role="note" className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <p className="font-semibold text-foreground">Current product behaviour</p>
        <p className="mt-1 text-muted-foreground">
          These answers describe the live API flows used by the customer website and Flutter app.
          For actions covered here, the applicable screen explains what is sent and what happens next.
        </p>
      </div>
      <FaqList items={FAQS} />
      <p>
        Still stuck?{' '}
        <Link href="/contact" className="font-medium text-primary hover:underline">
          Contact us
        </Link>
        {' '}or read the{' '}
        <Link href="/privacy" className="font-medium text-primary hover:underline">
          privacy policy
        </Link>
        .
      </p>
      <JsonLd
        id="faq-jsonld"
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />
    </SitePage>
  );
}
