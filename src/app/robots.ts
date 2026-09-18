import type { MetadataRoute } from 'next';

/**
 * robots.txt for the Fledge customer panel.
 *
 * Public marketing and legal pages are crawlable; the logged-in app is gated by
 * `src/proxy.ts` (unauthenticated crawlers get a 302 to /login, so no gated URL
 * can be indexed by accident). Search engines AND AI answer engines are listed
 * explicitly — GPTBot, ClaudeBot, PerplexityBot and friends can only cite pages
 * they are allowed to fetch.
 */
export default function robots(): MetadataRoute.Robots {
  const aiAndSearchAgents = [
    'Googlebot',
    'Bingbot',
    'DuckDuckBot',
    'Applebot',
    'Applebot-Extended',
    'Google-Extended',
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
    'ClaudeBot',
    'Claude-User',
    'anthropic-ai',
    'PerplexityBot',
    'Perplexity-User',
    'CCBot',
    'cohere-ai',
    'meta-externalagent',
  ];

  const disallow = ['/api/', '/contact-approval/', '/ad-style-preview', '/offline'];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...aiAndSearchAgents.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: 'https://fledge.nearestz.com/sitemap.xml',
    host: 'https://fledge.nearestz.com',
  };
}
