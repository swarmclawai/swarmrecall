import type { MetadataRoute } from 'next';
import { PRIVATE_PATHS, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Prefix match: "/agents" also covers "/agents/<id>/memory".
        // Never disallow /_next/ — crawlers need the JS and CSS to render.
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
