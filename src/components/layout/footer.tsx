import * as React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

export function Footer({ appName = 'Flat Finder' }: { appName?: string }) {
  return (
    <footer className="border-t border-border bg-card/40 py-8 md:py-12 mb-14 md:mb-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Tagline */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <span className="font-bold text-base tracking-tight">{appName}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm">
              Verified student housing, flat shares, and roommate matching platform across top university campuses.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Explore Colleges
            </Link>
            <Link href="/search" className="hover:text-foreground transition-colors">
              Browse Flats
            </Link>
            <Link href="/roommates" className="hover:text-foreground transition-colors">
              Find Roommates
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-border/50 pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
