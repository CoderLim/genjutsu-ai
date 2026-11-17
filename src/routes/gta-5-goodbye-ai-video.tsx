import { createFileRoute } from '@tanstack/react-router';

import { resolveGta5GoodbyeAiVideoProviderTarget } from '@/modules/gta-5-goodbye-ai-video/provider';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Gta5GoodbyeAiVideoGeneratorPanel } from '@/components/landing/Gta5GoodbyeAiVideoGeneratorPanel';
import {
  getGta5GoodbyeAiVideoFaqItems,
  getGta5GoodbyeAiVideoHowToSteps,
  Gta5GoodbyeAiVideoIntroCopy,
  Gta5GoodbyeAiVideoSeoSections,
} from '@/components/landing/Gta5GoodbyeAiVideoSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const PAGE_PATH = '/gta-5-goodbye-ai-video';
const OG_IMAGE = '/videos/gta-5-goodbye-ai-video-tpl-poster.jpg';
const TEMPLATE_VIDEO = '/videos/gta-5-goodbye-ai-video-tpl.mp4';
const TEMPLATE_POSTER = '/videos/gta-5-goodbye-ai-video-tpl-poster.jpg';
const ARTICLE_DATE_PUBLISHED = '2026-11-17';
const ARTICLE_DATE_MODIFIED = '2026-11-17';

function articleJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: m['site.gta5goodbye.hero_title'](),
    description: m['site.gta5goodbye.meta_description'](),
    datePublished: ARTICLE_DATE_PUBLISHED,
    dateModified: ARTICLE_DATE_MODIFIED,
    author: {
      '@type': 'Organization',
      name: 'Genjutsu AI',
      url: absoluteUrl('/'),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Genjutsu AI',
      url: absoluteUrl('/'),
    },
    image: [absoluteUrl(OG_IMAGE)],
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
  };
}

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: getGta5GoodbyeAiVideoFaqItems().map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function howToJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: m['site.gta5goodbye.seo.howto_schema_name'](),
    description: m['site.gta5goodbye.seo.howto_schema_desc'](),
    step: getGta5GoodbyeAiVideoHowToSteps().map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

function videoJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: m['site.gta5goodbye.seo.sample_title'](),
    description: m['site.gta5goodbye.seo.sample_caption'](),
    contentUrl: absoluteUrl(TEMPLATE_VIDEO),
    thumbnailUrl: absoluteUrl(TEMPLATE_POSTER),
    uploadDate: ARTICLE_DATE_PUBLISHED,
    duration: 'PT15S',
    width: 1280,
    height: 720,
  };
}

function breadcrumbJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'GTA 5 Goodbye AI Video',
        item: canonical,
      },
    ],
  };
}

function Gta5GoodbyeAiVideoPage() {
  const { creditProvider } = Route.useLoaderData();
  const canonical = absoluteUrl(PAGE_PATH);

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={articleJsonLd(canonical)} />
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={howToJsonLd()} />
      <SeoJsonLd value={videoJsonLd()} />
      <SeoJsonLd value={breadcrumbJsonLd(canonical)} />

      <div className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(32_40%_18%)_0%,transparent_55%)]"
        />
        <SiteHeader />

        <main className="relative z-10">
          <section className="mx-auto max-w-6xl px-4 pt-10 pb-10 text-center sm:px-6 sm:text-left md:pb-12">
            <p className="text-sm tracking-wide text-white/55 uppercase">
              {m['site.gta5goodbye.hero_badge']()}
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-white md:text-5xl">
              {m['site.gta5goodbye.hero_title']()}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60 sm:mx-0 sm:text-lg">
              {m['site.gta5goodbye.hero_description']()}
            </p>

            <div
              id="generator"
              className="mt-8 scroll-mt-24 text-left sm:mt-10"
            >
              <h2 className="sr-only">
                {m['site.gta5goodbye.generator_title']()}
              </h2>
              <Gta5GoodbyeAiVideoGeneratorPanel
                creditProvider={creditProvider}
              />
            </div>

            <Gta5GoodbyeAiVideoIntroCopy />
          </section>

          <Gta5GoodbyeAiVideoSeoSections />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/gta-5-goodbye-ai-video')({
  loader: () => {
    const locale = getLocale();
    const target = resolveGta5GoodbyeAiVideoProviderTarget();
    return { locale, creditProvider: target.provider };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.gta5goodbye.meta_title']({}, { locale });
    const description = m['site.gta5goodbye.meta_description']({}, { locale });
    const { canonical, alternates } = localeLinks(PAGE_PATH, locale, ['en']);
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        {
          name: 'robots',
          content: 'index,follow,max-image-preview:large',
        },
        ...socialMeta({
          title,
          description,
          url: canonical,
          image: absoluteUrl(OG_IMAGE),
        }),
        {
          property: 'og:image:alt',
          content:
            'GTA 5 goodbye AI video — one photo dusk drive template, landscape 16:9',
        },
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: Gta5GoodbyeAiVideoPage,
});
