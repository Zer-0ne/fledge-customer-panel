import type { Metadata } from 'next';
import { SitePage } from '@/components/layout/site-page';
import { ContactContent } from './contact-content';
import { env } from '@/lib/env';

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@flatfinder.local';

export const metadata: Metadata = {
  title: `Contact us — ${env.NEXT_PUBLIC_APP_NAME}`,
  description: 'Reach the team about listings, your account, or privacy.',
};

export default function ContactPage() {
  return (
    <SitePage
      className="max-w-5xl"
      title="Contact us"
      description="Questions about listings, your account, or privacy? Pick a shortcut or send a message — it opens your email app."
    >
      <ContactContent supportEmail={SUPPORT_EMAIL} />
    </SitePage>
  );
}
