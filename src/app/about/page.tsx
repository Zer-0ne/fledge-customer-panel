import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/layout/site-page';
import { AboutPlatformCarousel } from './about-platform-carousel';
import { env } from '@/lib/env';
import { Heart, Shield, BookOpen, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: `About — ${env.NEXT_PUBLIC_APP_NAME}`,
  description: 'Student housing discovery for verified listings, roommates, and campus-near flats.',
};

function InfoCard({ icon: Icon, title, body }: { icon: typeof Heart; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary shrink-0" />
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <SitePage
      className="max-w-5xl"
      title={`About ${env.NEXT_PUBLIC_APP_NAME}`}
      description="Fledge connects students and housing partners through privacy-first discovery, matching, and in-app conversations."
    >
      {/* Hero card — Made in India */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
          <Heart className="size-3" />
          Made in India
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">
          Housing that feels right
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {env.NEXT_PUBLIC_APP_NAME} is the customer side of a housing marketplace. Students can
          search by college or location, shortlist listings, find roommates, publish time-limited
          Need Now requirements, and talk in-app. Partners use a separate portal to manage
          properties, listings, leads, availability, and sponsored campaigns.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Public discovery uses approximate locations and hides direct contact details. Contact is
          shared only through the approval, expiry, and view-limit rules shown before the action.
          Moderation and trust badges add context, but users should still verify independently.
        </p>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          icon={Heart}
          title="Our mission"
          body="Make student housing discovery easier to understand: clear listing information, approximate-location search, direct matching, and in-app communication before personal details are shared."
        />
        <InfoCard
          icon={Shield}
          title="Privacy by design"
          body="Contact details and exact addresses stay protected by default. Requests, grants, expiry, view limits, fallback contacts, and revocation are explicit product flows."
        />
        <InfoCard
          icon={BookOpen}
          title="Safety with context"
          body="Automated checks, authorised review, reports, blocks, appeals, and verification or trust badges help people judge risk. These signals support — but never replace — independent checks."
        />
        <InfoCard
          icon={ExternalLink}
          title="Transparent actions"
          body="Before sensitive actions such as sharing contact, publishing content, paying, exporting data, or scheduling erasure, Fledge explains what is sent and what happens next."
        />
      </div>

      <AboutPlatformCarousel />

      <div className="rounded-2xl border border-border/60 bg-card p-5 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Questions? Check the{' '}
          <Link href="/faq" className="font-medium text-primary hover:underline">
            FAQ
          </Link>{' '}
          or{' '}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact us
          </Link>
          .
        </p>
        <Link
          href="/faq"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Visit help center →
        </Link>
      </div>
    </SitePage>
  );
}
