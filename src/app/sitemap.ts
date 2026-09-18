import type { MetadataRoute } from 'next';

/**
 * Sitemap — only URLs that render without a session (see `src/proxy.ts`
 * PUBLIC_PATH_PATTERN). The logged-in app, listing pages and auth screens are
 * intentionally excluded: unauthenticated crawlers get a 302 to /login.
 */
const BASE_URL = 'https://fledge.nearestz.com';

const PUBLIC_PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/refunds', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/donate', changeFrequency: 'monthly', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  // A stable timestamp (not `new Date()` per request) — churning lastmod values
  // make crawlers distrust the sitemap.
  const lastModified = new Date('2026-09-18T00:00:00.000Z');

  return PUBLIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
