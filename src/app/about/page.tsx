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
      description="We help students find verified housing near campus — without brokers, public phone numbers, or spammy classifieds."
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
          {env.NEXT_PUBLIC_APP_NAME} is the student-facing app of a housing marketplace: discovery
          (listings, map/geo search), roommates, Need Now requirements, favorites, chat, and
          campus-aware ads. Partners list properties; you search, shortlist, and talk in-app.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Phone numbers are never dumped on listing cards. Contact sharing is request-based,
          time-bounded, and can fall back to a verified backup contact when the owner is unavailable.
        </p>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          icon={Heart}
          title="Our mission"
          body="Make student housing discovery safe, transparent, and broker-free. Every listing is verified, every contact is consent-based, and every interaction happens in-app."
        />
        <InfoCard
          icon={Shield}
          title="Privacy by design"
          body="Your phone number is never public. Contact sharing requires approval, has daily limits, and can route to a verified backup contact when you're unavailable."
        />
        <InfoCard
          icon={BookOpen}
          title="Community first"
          body="Roommate matching, college-specific rules, and a moderation system that keeps the community safe. Post restrictions are transparent and appealable."
        />
        <InfoCard
          icon={ExternalLink}
          title="Open-source notices"
          body="Built with open-source tools and libraries. We believe in giving back to the community that makes this possible."
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
