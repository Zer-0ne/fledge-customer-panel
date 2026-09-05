import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { FaqList } from './faq-list';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: `FAQ — ${env.NEXT_PUBLIC_APP_NAME}`,
  description: 'Answers about listings, roommates, Need Now, chat, and your data.',
};

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Who is Fledge for?',
    a: 'The customer app is built around students and college-area housing. Housing owners, managers, and advertisers use a separate partner portal. Access to individual features can depend on account role, verification, college rules, and availability in your area.',
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
    a: 'Need Now is a time-limited housing requirement. A response creates or opens a conversation so both sides can discuss the request. Withdrawing a request, declining a response, or expiry closes that response flow; contact details remain protected unless separately approved.',
  },
  {
    q: 'How do roommate posts work?',
    a: 'You can publish a genuine personal requirement, browse matches, express interest, and chat in-app. Posts and images are moderated. Promotional layouts, QR codes, and public phone, email, social-handle, or WhatsApp details can be rejected; eligible decisions can be appealed.',
  },
  {
    q: 'What do verification and owl trust badges mean?',
    a: 'A badge shows the specific check or trust tier completed by Fledge. It is context, not a guarantee of identity, conduct, ownership, property quality, or transaction safety. Always verify independently before meeting or paying.',
  },
  {
    q: 'Why is the phone number hidden?',
    a: 'Direct contact details are hidden from public cards. Depending on the listing preference, you may need to chat, request access, wait for approval, or use a verified fallback-contact flow. The approval screen shows the grant expiry and view limit before contact is revealed.',
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
    </SitePage>
  );
}
