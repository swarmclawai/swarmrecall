/**
 * Canonical host and public route inventory.
 *
 * The apex (swarmrecall.ai) 200-redirects to www, so www is the canonical
 * host. Every canonical URL and sitemap entry must use it.
 */
export const SITE_URL = 'https://www.swarmrecall.ai';

export interface DocsNavItem {
  title: string;
  slug: string;
}

/** Every page under /docs. Drives both the sidebar and the sitemap. */
export const DOCS_NAV: DocsNavItem[] = [
  { title: 'Overview', slug: '' },
  { title: 'Getting Started', slug: 'getting-started' },
  { title: 'MCP Server', slug: 'mcp' },
  { title: 'API Reference', slug: 'api-reference' },
  { title: 'SDK', slug: 'sdk' },
  { title: 'Skills', slug: 'skills' },
];

export function docsPath(slug: string): string {
  return slug ? `/docs/${slug}` : '/docs';
}

/**
 * Authenticated / non-content areas. These render an empty auth shell to
 * crawlers, so they are kept out of the index rather than served as thin
 * duplicates of the homepage.
 */
export const PRIVATE_PATHS = [
  '/dashboard',
  '/agents',
  '/pools',
  '/settings',
  '/observability',
  '/login',
  '/claim',
];
