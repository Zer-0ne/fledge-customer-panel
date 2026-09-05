import type { Metadata } from 'next';
import { SitePage } from '@/components/layout/site-page';
import { ContactContent } from './contact-content';
import { env } from '@/lib/env';
import { FLEDGE_SUPPORT_EMAIL } from '@/lib/public-info';

export const metadata: Metadata = {
  title: `Contact us — ${env.NEXT_PUBLIC_APP_NAME}`,
  description: `Contact Fledge support at ${FLEDGE_SUPPORT_EMAIL} for account, listing, safety, payment, or privacy help.`,
};

export default function ContactPage() {
  return (
    <SitePage
      className="max-w-5xl"
      title="Contact us"
      description={`Get help at ${FLEDGE_SUPPORT_EMAIL}. The contact action opens your email app; it does not silently submit data to the Fledge API.`}
    >
      <ContactContent supportEmail={FLEDGE_SUPPORT_EMAIL} />
    </SitePage>
  );
}
