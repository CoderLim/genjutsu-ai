import { createFileRoute } from '@tanstack/react-router';

import { resolveBurningBridgesAiProviderTarget } from '@/modules/burning-bridges-ai/provider';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { BurningBridgesAiGeneratorPanel } from '@/components/landing/BurningBridgesAiGeneratorPanel';
import {
  BurningBridgesAiIntroCopy,
  BurningBridgesAiSeoSections,
  getBurningBridgesAiFaqItems,
  getBurningBridgesAiFormatAHowToSteps,
  getBurningBridgesAiFormatBHowToSteps,
} from '@/components/landing/BurningBridgesAiSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const PAGE_PATH = '/burning-bridges-ai';
const OG_IMAGE = '/videos/burning-bridges-tpl-poster.jpg';
const TEMPLATE_VIDEO = '/videos/burning-bridges-tpl.mp4';
const TEMPLATE_POSTER = '/videos/burning-bridges-tpl-poster.jpg';
const ARTICLE_DATE_PUBLISHED = '2026-10-22';
const ARTICLE_DATE_MODIFIED = '2026-10-22';

function articleJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: m['site.burningbridges.hero_title'](),
    description: m['site.burningbridges.meta_description'](),
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
    mainEntity: getBurningBridgesAiFaqItems().map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function howToFormatAJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: m['site.burningbridges.seo.howto_a_schema_name'](),
    description: m['site.burningbridges.seo.howto_a_schema_desc'](),
    step: getBurningBridgesAiFormatAHowToSteps().map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

function howToFormatBJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: m['site.burningbridges.seo.howto_b_schema_name'](),
    description: m['site.burningbridges.seo.howto_b_schema_desc'](),
    step: getBurningBridgesAiFormatBHowToSteps().map((step, index) => ({
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
    name: m['site.burningbridges.seo.sample_title'](),
    description: m['site.burningbridges.seo.sample_caption'](),
    contentUrl: absoluteUrl(TEMPLATE_VIDEO),
    thumbnailUrl: absoluteUrl(TEMPLATE_POSTER),
    uploadDate: ARTICLE_DATE_PUBLISHED,
    duration: 'PT29S',
    width: 1920,
    height: 1080,
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
        name: 'Burning Bridges AI',
        item: canonical,
      },
    ],
  };
}

function BurningBridgesAiPage() {
  const { creditProvider } = Route.useLoaderData();
  const canonical = absoluteUrl(PAGE_PATH);

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={articleJsonLd(canonical)} />
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={howToFormatAJsonLd()} />
      <SeoJsonLd value={howToFormatBJsonLd()} />
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
              {m['site.burningbridges.hero_badge']()}
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-white md:text-5xl">
              {m['site.burningbridges.hero_title']()}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60 sm:mx-0 sm:text-lg">
              {m['site.burningbridges.hero_description']()}
            </p>

            <div
              id="generator"
              className="mt-8 scroll-mt-24 text-left sm:mt-10"
            >
              <h2 className="sr-only">
                {m['site.burningbridges.generator_title']()}
              </h2>
              <BurningBridgesAiGeneratorPanel creditProvider={creditProvider} />
            </div>

            <BurningBridgesAiIntroCopy />
          </section>

          <BurningBridgesAiSeoSections />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/burning-bridges-ai')({
  loader: () => {
    const locale = getLocale();
    const target = resolveBurningBridgesAiProviderTarget();
    return { locale, creditProvider: target.provider };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.burningbridges.meta_title']({}, { locale });
    const description = m['site.burningbridges.meta_description'](
      {},
      { locale }
    );
    // English-only editorial for now — don't advertise empty locale variants.
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
            "Burning Bridges AI party scene with a face swapped into Drake's video",
        },
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: BurningBridgesAiPage,
});
