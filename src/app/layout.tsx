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
import { PushBootstrap } from '@/components/push/push-bootstrap';
import { getFirebaseWebConfig } from '@/lib/push/push-config';
import { AnnouncementProvider } from '@/components/announcements/announcement-provider';
import { GlobalAnnouncementBanner } from '@/components/announcements/global-announcement-banner';
import { Suspense } from 'react';
import { AnnouncementModal } from '@/components/announcements/announcement-modal';
import { NavigationProgressBar } from '@/components/providers/navigation-progress-bar';

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
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fledge',
  },
  icons: {
    icon: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0e12',
};

const themeScript = `
  try {
    const theme = localStorage.getItem('theme') || 'system';
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    const color = localStorage.getItem('theme-color') || 'indigo';
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
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200 overflow-x-hidden">
        <AnalyticsInit />
        <ServiceWorkerRegister />
        <ThemeProvider>
          <PushBootstrap firebaseConfig={firebaseConfig} />
          <AuthProvider>
            <AnnouncementProvider>
              <ToastProvider>
                <Suspense fallback={null}>
                  <NavigationProgressBar />
                </Suspense>
                <SkipToContent />
                <Header appName={env.NEXT_PUBLIC_APP_NAME} />
                <GlobalAnnouncementBanner />
                <main id="main-content" className="flex-1 w-full min-w-0 overflow-x-clip">
                  {children}
                </main>
                <Footer appName={env.NEXT_PUBLIC_APP_NAME} />
                <MobileNav />
                <AnnouncementModal />
              </ToastProvider>
            </AnnouncementProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
