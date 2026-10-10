import { envConfigs } from '@/config';
import { locales, localizeUrl } from '@/paraglide/runtime.js';

/** Absolute URL for social/share cards. Prefer raster over SVG. */
export function absoluteUrl(path = '/'): string {
  const base = envConfigs.app_url || 'http://localhost:3000';
  return new URL(path, base).href;
}

export function ogImageUrl(): string {
  return absoluteUrl(envConfigs.app_logo || '/logo.webp');
}

/** Shared Open Graph + Twitter tags for a public page. */
export function socialMeta(opts: {
  title: string;
  description: string;
  url?: string;
  image?: string;
}) {
  const image = opts.image || ogImageUrl();
  return [
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: opts.title },
    { property: 'og:description', content: opts.description },
    { property: 'og:image', content: image },
    ...(opts.url ? [{ property: 'og:url', content: opts.url }] : []),
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: opts.title },
    { name: 'twitter:description', content: opts.description },
    { name: 'twitter:image', content: image },
  ];
}

/**
 * Canonical + hreflang alternate links for a locale-free path.
 * Limit supportedLocales to real translated versions for content-backed pages.
 * Missing translations may render an English fallback, but must not advertise
 * that fallback as a separate language version in search results.
 */
export function localeLinks(
  path: string,
  locale: string,
  supportedLocales: readonly string[] = locales
) {
  const available = locales.filter((loc) => supportedLocales.includes(loc));
  const canonicalLocale = available.includes(locale as (typeof locales)[number])
    ? locale
    : available.includes('en') ? 'en' : (available[0] ?? 'en');
  const urlFor = (loc: string) =>
    localizeUrl(absoluteUrl(path || '/'), {
      locale: loc as (typeof locales)[number],
    }).href;
  return {
    canonical: urlFor(canonicalLocale),
    alternates: available.length > 1
      ? [
          ...available.map((loc) => ({
            rel: 'alternate' as const,
            hrefLang: loc,
            href: urlFor(loc),
          })),
          {
            rel: 'alternate' as const,
            hrefLang: 'x-default',
            href: urlFor(available.includes('en') ? 'en' : available[0]!),
          },
        ]
      : [],
  };
}
