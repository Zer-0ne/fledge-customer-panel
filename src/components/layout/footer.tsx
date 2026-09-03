import * as React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

const PRODUCT_LINKS = [
  { href: '/', label: 'Explore Colleges' },
  { href: '/search', label: 'Browse Flats' },
  { href: '/roommates', label: 'Find Roommates' },
  { href: '/donate', label: 'Donate' },
];

const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact us' },
];

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
];

export function Footer({ appName = 'Owl Sight' }: { appName?: string }) {
  return (
    <footer className="mb-14 border-t border-border bg-card/40 py-8 md:mb-0 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 />
              </div>
              <span className="text-base font-bold tracking-tight">{appName}</span>
            </div>
            <p className="mt-2 max-w-sm text-xs text-muted-foreground">
              Verified student housing, flat shares, and roommate matching across university campuses.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-8 text-xs sm:grid-cols-3" aria-label="Footer">
            <FooterColumn title="Product" links={PRODUCT_LINKS} />
            <FooterColumn title="Company" links={COMPANY_LINKS} />
            <FooterColumn title="Legal" links={LEGAL_LINKS} />
          </nav>
        </div>

        <div className="mt-8 border-t border-border/50 pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-foreground">{title}</p>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
