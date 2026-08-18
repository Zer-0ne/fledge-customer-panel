import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { env } from '@/lib/env';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { SkipToContent } from '@/components/layout/skip-to-content';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Footer } from '@/components/layout/footer';
import { AnalyticsInit } from '@/components/providers/analytics-init';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_APP_NAME} - Student Housing & Flat Sharing`,
  description:
    'Find student apartments, room rentals, and compatible roommates near top colleges and university campuses.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AnalyticsInit />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <SkipToContent />
              <Header appName={env.NEXT_PUBLIC_APP_NAME} />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer appName={env.NEXT_PUBLIC_APP_NAME} />
              <MobileNav />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
