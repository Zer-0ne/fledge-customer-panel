'use client';

import { HoverEffect } from '@/components/ui/card-hover-effect';
import { MagicCard } from '@/components/ui/magic-card';
import { BlurFade } from '@/components/ui/blur-fade';
import { Card, CardContent } from '@/components/ui/card';
import { ContactForm } from './contact-form';

type ContactContentProps = {
  supportEmail: string;
};

export function ContactContent({ supportEmail }: ContactContentProps) {
  return (
    <div className="flex flex-col gap-8 text-foreground">
      <div
        role="note"
        className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm"
      >
        <p className="font-semibold">What happens when you contact support</p>
        <p className="mt-1 text-muted-foreground">
          This page builds a draft addressed to {supportEmail} and asks your installed email app to
          open it. Fledge does not receive or store the form fields through this website. Nothing is
          sent until you review the draft and tap Send in your email app. After sending, your email
          provider and Fledge support process the message and attachments you chose to include.
        </p>
        <p className="mt-2 text-muted-foreground">
          Never send passwords, OTPs, full payment credentials, or unnecessary identity documents.
          Use in-app report or block tools for a listing, post, or conversation so the correct record
          identifiers reach moderation. Fledge is not an emergency service.
        </p>
      </div>

      <BlurFade delay={0.05} inView>
        <HoverEffect
          className="py-0 md:grid-cols-3"
          items={[
            {
              title: 'Email',
              description: `Write ${supportEmail} — this page opens a draft in your mail app.`,
              link: `mailto:${supportEmail}`,
            },
            {
              title: 'FAQ',
              description: 'Search, Need Now, roommates, and why listing cards hide phone numbers.',
              link: '/faq',
            },
            {
              title: 'Your data',
              description: 'Export or request erasure from Settings when you are signed in.',
              link: '/settings/data',
            },
          ]}
        />
      </BlurFade>

      <BlurFade delay={0.12} inView>
        <MagicCard className="rounded-2xl">
          <Card className="border-0 bg-transparent py-4 shadow-none ring-0 sm:py-6">
            <CardContent className="px-4 sm:px-6">
              <ContactForm supportEmail={supportEmail} />
            </CardContent>
          </Card>
        </MagicCard>
      </BlurFade>
    </div>
  );
}
