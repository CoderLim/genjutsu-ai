import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { RUMPEL_SEO_LOCALES } from '@/components/landing/rumpel-seo-i18n';
import {
  getLocalPostLocales,
  getLocalPosts,
  mergePosts,
} from '@/content/posts';

const STATIC_PATHS = [
  '',
  '/pricing',
  '/genjutsu-prompts',
  '/hotel-lobby-ai',
  '/coldplay-kiss-cam',
  '/gangnam-style-ai',
  '/gas-station-dance-ai',
  '/a2o-lite-ai',
  '/enzo-fernandez-ai',
  '/flying-car-ai',
  '/crazy-frog-ai',
  '/kairo-bad-times',
  '/smalltown-boy-dance',
  '/ai-zombie-hug',
  '/day-of-the-dead-ai-video',
  '/ai-rumpelstiltskin',
  '/bulin-47-ai',
  '/blog',
  '/burning-bridges-ai',
  '/say-it-right-ai',
  '/privacy-policy',
  '/terms-of-service',
  '/refund-policy',
];

/** Only emit variants with real editorial translations. */
const LIMITED_STATIC_PATH_LOCALES: Record<string, readonly string[]> = {
  '/ai-rumpelstiltskin': RUMPEL_SEO_LOCALES,
  // Bulin 47's visible editorial content is not fully localized yet.
  '/bulin-47-ai': [baseLocale],
};

function enabledContentLocales(values: readonly string[]): string[] {
  return values.filter((locale) =>
    locales.includes(locale as (typeof locales)[number])
  );
}

type Entry = {
  path: string;
  locale: string;
  /** Locales to list as xhtml:link alternates. Empty/undefined = none. */
  alternateLocales?: string[];
  lastModified?: string;
  changeFrequency: string;
  priority: number;
};

/** Prefer the request host so prod never emits a baked localhost URL. */
function siteOrigin(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return envConfigs.app_url || 'http://localhost:3000';
  }
}

function urlFor(origin: string, path: string, locale: string): string {
  return localizeUrl(`${origin}${path || '/'}`, {
    locale: locale as (typeof locales)[number],
  }).href;
}

function entryXml(origin: string, e: Entry): string {
  const alternateLocales = e.alternateLocales ?? [];
  const alternates =
    alternateLocales.length === 0
      ? ''
      : [
          ...alternateLocales.map(
            (loc) =>
              `    <xhtml:link rel="alternate" hreflang="${loc}" href="${urlFor(origin, e.path, loc)}"/>`
          ),
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(origin, e.path, alternateLocales.includes(baseLocale) ? baseLocale : alternateLocales[0])}"/>`,
        ].join('\n');

  return [
    '  <url>',
    `    <loc>${urlFor(origin, e.path, e.locale)}</loc>`,
    alternates || null,
    e.lastModified ? `    <lastmod>${e.lastModified}</lastmod>` : null,
    `    <changefreq>${e.changeFrequency}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = siteOrigin(request);
        const entries: Entry[] = STATIC_PATHS.flatMap((path) => {
          const pathLocales = enabledContentLocales(
            LIMITED_STATIC_PATH_LOCALES[path] ?? locales
          );
          return pathLocales.map((locale) => ({
            path,
            locale,
            alternateLocales: pathLocales.length > 1 ? pathLocales : undefined,
            changeFrequency: path === '/blog' ? 'daily' : 'weekly',
            priority: path === '' ? 1 : 0.8,
          }));
        });

        try {
          const { listPublishedArticles } =
            await import('@/modules/posts/service');
          const rows = await listPublishedArticles().catch(() => []);
          const dbPosts = rows.map((row) => ({
            slug: row.slug,
            title: row.title || row.slug,
            description: row.description || '',
            createdAt: new Date(row.createdAt).toISOString(),
            source: 'db' as const,
          }));
          const posts = mergePosts(dbPosts, getLocalPosts(baseLocale));
          for (const post of posts) {
            if (post.source === 'local') {
              const postLocales = enabledContentLocales(
                getLocalPostLocales(post.slug)
              );
              const localesToEmit =
                postLocales.length > 0 ? postLocales : [baseLocale];
              for (const locale of localesToEmit) {
                entries.push({
                  path: `/blog/${post.slug}`,
                  locale,
                  alternateLocales:
                    localesToEmit.length > 1 ? localesToEmit : undefined,
                  lastModified: post.createdAt,
                  changeFrequency: 'monthly',
                  priority: 0.6,
                });
              }
            } else {
              entries.push({
                path: `/blog/${post.slug}`,
                locale: baseLocale,
                lastModified: post.createdAt,
                changeFrequency: 'monthly',
                priority: 0.6,
              });
            }
          }
        } catch {
          for (const post of getLocalPosts(baseLocale)) {
            const postLocales = enabledContentLocales(
              getLocalPostLocales(post.slug)
            );
            const localesToEmit =
              postLocales.length > 0 ? postLocales : [baseLocale];
            for (const locale of localesToEmit) {
              entries.push({
                path: `/blog/${post.slug}`,
                locale,
                alternateLocales:
                  localesToEmit.length > 1 ? localesToEmit : undefined,
                lastModified: post.createdAt,
                changeFrequency: 'monthly',
                priority: 0.6,
              });
            }
          }
        }

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...entries.map((e) => entryXml(origin, e)),
          '</urlset>',
          '',
        ].join('\n');

        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml' },
        });
      },
    },
  },
});
