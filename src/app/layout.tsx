import type { Metadata, Viewport } from 'next';
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
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { AppUpdatePrompt } from '@/components/pwa/app-update-prompt';
import { PushBootstrap } from '@/components/push/push-bootstrap';
import { getFirebaseWebConfig } from '@/lib/push/push-config';
import { AnnouncementProvider } from '@/components/announcements/announcement-provider';
import { GlobalAnnouncementBanner } from '@/components/announcements/global-announcement-banner';
import { FaviconSync } from '@/components/brand/favicon-sync';
import { ICON_VERSION } from '@/lib/brand/icon-version';
import { Suspense } from 'react';
import { DomSelfHeal } from '@/components/providers/dom-self-heal';
import { AnnouncementModal } from '@/components/announcements/announcement-modal';
// Navigation progress bar — disabled on request (see usage note in the tree below).
// import { NavigationProgressBar } from '@/components/providers/navigation-progress-bar';
import { PushPromptBanner } from '@/components/push/push-prompt-banner';
import { JsonLd } from '@/components/seo/json-ld';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://fledge.nearestz.com'),
  title: `${env.NEXT_PUBLIC_APP_NAME} — Student Housing, PG & Flat Sharing`,
  description:
    'Find student apartments, PG accommodation, shared flats and compatible roommates near top colleges and university campuses across India. Chat first — contact details stay private until you approve.',
  applicationName: 'Fledge',
  keywords: [
    'student housing',
    'PG near college',
    'flat sharing',
    'roommate finder India',
    'student apartments',
    'paying guest accommodation',
    'college area rentals',
    'urgent housing requirement',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Fledge',
    url: '/',
    title: 'Fledge — Student Housing, PG & Flat Sharing',
    description:
      'Discover flats, PG accommodation and compatible roommates near your college, and post urgent housing requirements with Need Now.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fledge — Student Housing, PG & Flat Sharing',
    description:
      'Find student housing and roommates near your college on Fledge — free for students and tenants.',
  },
  // NOTE: the manifest link is rendered MANUALLY in <head> below — Next's
  // metadata.manifest normalises the URL and drops the `?v=` content hash,
  // which is exactly the part the browser needs to see change. See
  // src/lib/brand/icon-version.ts.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fledge',
  },
  icons: {
    icon: [
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: `/icons/apple-touch-icon.png?v=${ICON_VERSION}`, sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  // viewport-fit=cover — the standalone PWA paints edge-to-edge (iOS
  // black-translucent status bar, Android display cutouts); the shell adds
  // safe-area padding (Header pt-safe, MobileNav pb-safe).
  viewportFit: 'cover',
  // Status-bar tint: Chrome (Android) colours the installed app's status bar
  // from the ACTIVE theme-color meta — the ThemeProvider re-points it on every
  // in-app theme change; these static media variants cover the first paint
  // before hydration.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

const themeScript = `
  try {
    const theme = localStorage.getItem('theme') || 'system';
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    const color = localStorage.getItem('theme-color') || 'slate';
    document.documentElement.setAttribute('data-theme-color', color);

    const fontScale = localStorage.getItem('theme-font-scale') || 'normal';
    document.documentElement.setAttribute('data-font-scale', fontScale);
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const firebaseConfig = getFirebaseWebConfig();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Versioned manifest link — see the note on `metadata` above. */}
        <link rel="manifest" href={`/manifest.webmanifest?v=${ICON_VERSION}`} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200 overflow-x-hidden">
        {/* Site-wide structured data — Organization + WebSite + app (schema.org). */}
        <JsonLd
          id="site-jsonld"
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://fledge.nearestz.com/#organization',
                name: 'Fledge',
                alternateName: 'Fledge by NearestZ',
                url: 'https://fledge.nearestz.com',
                logo: 'https://fledge.nearestz.com/icons/favicon.svg',
                parentOrganization: {
                  '@type': 'Organization',
                  name: 'NearestZ',
                  url: 'https://www.nearestz.com',
                },
                areaServed: 'IN',
              },
              {
                '@type': 'WebSite',
                '@id': 'https://fledge.nearestz.com/#website',
                name: 'Fledge',
                url: 'https://fledge.nearestz.com',
                publisher: { '@id': 'https://fledge.nearestz.com/#organization' },
                inLanguage: 'en-IN',
              },
              {
                '@type': 'SoftwareApplication',
                '@id': 'https://fledge.nearestz.com/#app',
                name: 'Fledge',
                applicationCategory: 'LifestyleApplication',
                operatingSystem: 'Web, Android',
                url: 'https://fledge.nearestz.com',
                description:
                  'Fledge — student housing and roommate discovery for India: nearby flats and PG accommodation, compatible roommates, and urgent housing requirements.',
                publisher: { '@id': 'https://fledge.nearestz.com/#organization' },
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
              },
            ],
          }}
        />
        <AnalyticsInit />
        <ServiceWorkerRegister />
        <ThemeProvider>
        <DomSelfHeal />
        <PushBootstrap firebaseConfig={firebaseConfig} />
          <PushPromptBanner />
          <FaviconSync />
          <AuthProvider>
            <AnnouncementProvider>
              <ToastProvider>
                {/*
                  Navigation progress bar — DISABLED on request (2026-09-17).
                  Navigation must feel native with no top loading chrome.
                  Re-enable by uncommenting the block below (the component is
                  still maintained in src/components/providers/navigation-progress-bar.tsx
                  and is fully passive — it never touches navigation).
                  <Suspense fallback={null}>
                    <NavigationProgressBar />
                  </Suspense>
                */}
                <SkipToContent />
                <Header appName={env.NEXT_PUBLIC_APP_NAME} />
                <GlobalAnnouncementBanner />
                <main id="main-content" className="flex-1 w-full min-w-0 overflow-x-clip">
                  {children}
                </main>
                <Footer appName={env.NEXT_PUBLIC_APP_NAME} />
                <MobileNav />
                <AppUpdatePrompt />
                <AnnouncementModal />
              </ToastProvider>
            </AnnouncementProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
