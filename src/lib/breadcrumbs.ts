/**
 * Build a Schema.org BreadcrumbList from an ordered list of crumbs.
 *
 * Breadcrumbs help Google render breadcrumb trails in results and give AI
 * answer engines the page's place in the site hierarchy. Pass crumbs from
 * least to most specific; the final crumb is the current page.
 *
 * `site` should be the absolute origin (e.g. Astro.site) so each item gets a
 * fully-qualified URL, which Google requires.
 */
export interface Crumb {
  name: string;
  /** Root-relative path, e.g. "/speakers" or "/boston/2026-06-16-ai-as-a-teammate". */
  path: string;
}

export function breadcrumbList(crumbs: Crumb[], site: URL | string | undefined) {
  const origin = (site?.toString() ?? 'https://events.theairuntime.com/').replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${origin}${c.path}`,
    })),
  };
}
