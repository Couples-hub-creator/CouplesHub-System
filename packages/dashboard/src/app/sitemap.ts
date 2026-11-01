import { siteConfig } from '@/config/site';

export const dynamic = 'force-static';

export default function sitemap() {
  const base = siteConfig.url.replace(/\/$/, '');
  const now = new Date();

  const marketing = ['', '/commands', '/pricing', '/docs', '/status', '/terms', '/privacy'].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '' ? 1 : path === '/pricing' || path === '/commands' ? 0.8 : 0.5,
  }));

  return marketing;
}
