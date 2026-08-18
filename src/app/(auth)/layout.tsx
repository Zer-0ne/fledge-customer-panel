import * as React from 'react';
import Link from 'next/link';
import { Building2, ShieldCheck } from 'lucide-react';
import { env } from '@/lib/env';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-background via-muted/30 to-background overflow-hidden">
      {/* Background Glow Decorations */}
      <div className="absolute -top-40 -left-40 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-transform hover:scale-105 duration-200"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Building2 className="size-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {env.NEXT_PUBLIC_APP_NAME}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Verified Student & Flat Sharing Community</span>
          </div>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-border/80 bg-card/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl transition-all">
          {children}
        </div>
      </div>
    </div>
  );
}
