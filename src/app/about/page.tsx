import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { AboutPlatformCarousel } from './about-platform-carousel';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: `About — ${env.NEXT_PUBLIC_APP_NAME}`,
  description: 'Student housing discovery for verified listings, roommates, and campus-near flats.',
};

export default function AboutPage() {
  return (
    <SitePage
      className="max-w-5xl"
      title={`About ${env.NEXT_PUBLIC_APP_NAME}`}
      description="We help students find verified housing near campus — without brokers, public phone numbers, or spammy classifieds."
    >
      <p>
        {env.NEXT_PUBLIC_APP_NAME} is the student-facing app of a housing marketplace: discovery
        (listings, map/geo search), roommates, Need Now requirements, favorites, chat, and
        campus-aware ads. Partners list properties; you search, shortlist, and talk in-app.
      </p>
      <p>
        Phone numbers are not dumped on listing cards. Contact sharing is request-based, time-bounded,
        and can fall back to a verified backup contact when the owner is unavailable.
      </p>

      <AboutPlatformCarousel />

      <p>
        Questions? See the <Link href="/faq" className="font-medium text-primary hover:underline">FAQ</Link>
        {' '}or <Link href="/contact" className="font-medium text-primary hover:underline">contact us</Link>.
      </p>
    </SitePage>
  );
}
