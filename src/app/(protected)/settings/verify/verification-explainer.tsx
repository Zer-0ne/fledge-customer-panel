'use client';

/**
 * Shared explainer: how verification works and which badge each path earns.
 * Rendered on the student/faculty and college-email verification pages so
 * users always see the full picture before choosing a method.
 */

import { BadgeCheck, Clock, GraduationCap, MailCheck, ShieldCheck } from 'lucide-react';

const PATHS = [
  {
    icon: MailCheck,
    color: 'text-sky-500',
    ring: 'border-sky-500/30 bg-sky-500/10',
    title: 'College Email — instant',
    badge: 'College Verified',
    body: 'We send a 6-digit code to your college email address. Enter it and you are verified immediately — no waiting, no document upload. This badge proves you belong to the college. It never says whether you are a student or faculty member.',
  },
  {
    icon: GraduationCap,
    color: 'text-teal-500',
    ring: 'border-teal-500/30 bg-teal-500/10',
    title: 'Student ID / Fee Receipt — up to 24 hours',
    badge: 'Verified Student',
    body: 'Upload your student ID card or fee receipt. Our review checks the document and approves it, usually within 24 hours. This badge tells others you are a verified student.',
  },
  {
    icon: ShieldCheck,
    color: 'text-indigo-500',
    ring: 'border-indigo-500/30 bg-indigo-500/10',
    title: 'Faculty ID / Salary Slip — up to 24 hours',
    badge: 'Verified Faculty',
    body: 'Upload your faculty ID card or salary slip. After document review you get the faculty badge. Only this path (or the student path above) grants a role badge — a college email alone never can.',
  },
];

export default function VerificationExplainer() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BadgeCheck className="size-4 text-primary" />
        <p className="text-sm font-bold text-foreground">How verification works</p>
      </div>
      <div className="space-y-3">
        {PATHS.map((path) => {
          const Icon = path.icon;
          return (
            <div key={path.title} className={`rounded-xl border p-3.5 flex items-start gap-3 ${path.ring}`}>
              <Icon className={`size-5 shrink-0 mt-0.5 ${path.color}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{path.title}</p>
                <p className={`text-[11px] font-bold mt-0.5 ${path.color}`}>Badge: {path.badge}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{path.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl bg-muted/60 p-3 space-y-1.5">
        <p className="text-[11px] text-muted-foreground leading-relaxed flex gap-1.5">
          <Clock className="size-3.5 shrink-0 mt-0.5" />
          Have both? The stronger badge shows. A faculty member with a verified college email still shows Verified Faculty.
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          College email must be your official address — Gmail, Yahoo, Outlook and other public providers are not accepted. Documents are never stored; only extracted text (name, college, roll no.) is saved.
        </p>
      </div>
    </div>
  );
}
