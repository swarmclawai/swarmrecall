import type { MetadataRoute } from 'next';
import { DOCS_NAV, SITE_URL, docsPath } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      // Matches the homepage's rel=canonical exactly.
      url: SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...DOCS_NAV.map((item) => ({
      url: `${SITE_URL}${docsPath(item.slug)}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: item.slug ? 0.7 : 0.8,
    })),
  ];
}
