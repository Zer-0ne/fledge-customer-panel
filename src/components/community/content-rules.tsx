'use client';

import { CheckCircle2, XCircle, ImageOff } from 'lucide-react';

/**
 * Community post content rules (Phase 12).
 * Shows what personal posts may/may not contain — plain language, no internal
 * moderation thresholds. Used on the create/edit forms.
 */
export function ContentRules() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">What is allowed</h3>
        <ul className="mt-2 space-y-1.5">
          {ALLOWED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Not allowed</h3>
        <ul className="mt-2 space-y-1.5">
          {PROHIBITED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
              <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
        <ImageOff className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Contact details found in an image (phone numbers, WhatsApp, emails,
          website or QR codes) are not allowed. Personal posts are only for
          genuine personal accommodation needs.
        </p>
      </div>
    </div>
  );
}

const ALLOWED = [
  'Actual room or flat photographs',
  'Common-area and furniture photographs',
  'Normal property walkthrough images',
  'Personal roommate requirements',
  'One genuine room in your existing flat',
];

const PROHIBITED = [
  'Promotional banners or branded marketing creatives',
  'Company logos used for promotion',
  'QR codes, phone numbers, emails or website URLs in images',
  'WhatsApp, Telegram or social-media handles for contact',
  '“Call now”, “Book now”, “Limited offer” or “Best deals”',
  'Price-list posters or multiple unrelated properties',
];
