'use client';

import * as React from 'react';
import { Mail, Send, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { showToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const TOPICS = [
  'General',
  'Account or login',
  'Listing, roommate, or Need Now',
  'Safety or abuse report',
  'Payment or donation',
  'Privacy or data',
] as const;

type ContactFormProps = {
  supportEmail: string;
};

export function ContactForm({ supportEmail }: ContactFormProps) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [topic, setTopic] = React.useState<(typeof TOPICS)[number]>('General');
  const [message, setMessage] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      showToast({
        title: 'Missing fields',
        description: 'Name, email, and message are required.',
        variant: 'error',
      });
      return;
    }

    const subject = encodeURIComponent(`[${topic}] ${envSafeSubject(name)}`);
    const body = encodeURIComponent(
      `Name: ${name.trim()}\nEmail: ${email.trim()}\nTopic: ${topic}\n\n${message.trim()}`
    );
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    showToast({
      title: 'Opening email app',
      description: `Draft addressed to ${supportEmail}.`,
      variant: 'info',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-foreground">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Send a message</h2>
          <Badge variant="secondary">Opens your mail app</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          We do not submit these fields to the Fledge API. Submit creates a draft to {supportEmail};
          you review and send it from your own email app.
        </p>
      </div>

      <Separator />

      <FieldGroup>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="contact-name">Name</FieldLabel>
            <InputGroup className="h-10">
              <InputGroupAddon>
                <User />
              </InputGroupAddon>
              <InputGroupInput
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your name"
              />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="contact-email">Email</FieldLabel>
            <InputGroup className="h-10">
              <InputGroupAddon>
                <Mail />
              </InputGroupAddon>
              <InputGroupInput
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@college.edu"
              />
            </InputGroup>
          </Field>
        </div>

        <Field>
          <FieldLabel>Topic</FieldLabel>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Topic">
            {TOPICS.map((item) => {
              const selected = topic === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTopic(item)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="contact-message">Message</FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="What do you need help with?"
            />
          </InputGroup>
          <FieldDescription>
            For listing or chat issues, in-app report is usually faster.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <ShimmerButton type="submit" className="h-10 w-fit gap-2 rounded-xl px-5 py-2 text-sm">
        <Send />
        Send message
      </ShimmerButton>
    </form>
  );
}

function envSafeSubject(name: string) {
  return `Support from ${name.trim().slice(0, 80)}`;
}
