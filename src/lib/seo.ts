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

/** Canonical + hreflang alternate links for a locale-free path. */
export function localeLinks(path: string, locale: string) {
  const urlFor = (loc: string) =>
    localizeUrl(absoluteUrl(path || '/'), {
      locale: loc as (typeof locales)[number],
    }).href;
  return {
    canonical: urlFor(locale),
    alternates: [
      ...locales.map((loc) => ({
        rel: 'alternate' as const,
        hrefLang: loc,
        href: urlFor(loc),
      })),
      { rel: 'alternate' as const, hrefLang: 'x-default', href: urlFor('en') },
    ],
  };
}
