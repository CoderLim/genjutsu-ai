import { createFileRoute } from '@tanstack/react-router';

import { resolveSayItRightAiProviderTarget } from '@/modules/say-it-right-ai/provider';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SayItRightAiGeneratorPanel } from '@/components/landing/SayItRightAiGeneratorPanel';
import {
  getSayItRightAiFaqSchemaItems,
  getSayItRightAiHowToSteps,
  SayItRightAiIntroCopy,
  SayItRightAiSeoSections,
} from '@/components/landing/SayItRightAiSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const PAGE_PATH = '/say-it-right-ai';
const OG_IMAGE = '/videos/say-it-right-dance-tpl-poster.jpg';
const TEMPLATE_VIDEO = '/videos/say-it-right-dance-tpl.mp4';
const TEMPLATE_POSTER = '/videos/say-it-right-dance-tpl-poster.jpg';
const TEMPLATE_DURATION = 'PT15S';
const TEMPLATE_UPLOAD_DATE = '2026-10-25';

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: getSayItRightAiFaqSchemaItems().map((item) => ({
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
    name: m['site.sayitright.seo.howto_schema_name'](),
    step: getSayItRightAiHowToSteps().map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

function webApplicationJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: m['site.sayitright.hero_title'](),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: canonical,
    description: m['site.sayitright.seo.webapp_description'](),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

function videoJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: m['site.sayitright.seo.sample_title'](),
    description: m['site.sayitright.seo.sample_caption'](),
    contentUrl: absoluteUrl(TEMPLATE_VIDEO),
    thumbnailUrl: absoluteUrl(TEMPLATE_POSTER),
    uploadDate: TEMPLATE_UPLOAD_DATE,
    duration: TEMPLATE_DURATION,
    width: 720,
    height: 1280,
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
        name: 'Say It Right AI',
        item: canonical,
      },
    ],
  };
}

function SayItRightAiPage() {
  const { creditProvider } = Route.useLoaderData();
  const canonical = absoluteUrl(PAGE_PATH);

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={howToJsonLd()} />
      <SeoJsonLd value={webApplicationJsonLd(canonical)} />
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
              {m['site.sayitright.hero_badge']()}
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-white md:text-5xl">
              {m['site.sayitright.hero_title']()}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60 sm:mx-0 sm:text-lg">
              {m['site.sayitright.hero_description']()}
            </p>

            <div
              id="generator"
              className="mt-8 scroll-mt-24 text-left sm:mt-10"
            >
              <h2 className="sr-only">
                {m['site.sayitright.generator_title']()}
              </h2>
              <SayItRightAiGeneratorPanel creditProvider={creditProvider} />
            </div>

            <SayItRightAiIntroCopy />
          </section>

          <SayItRightAiSeoSections />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/say-it-right-ai')({
  loader: () => {
    const locale = getLocale();
    const target = resolveSayItRightAiProviderTarget();
    return { locale, creditProvider: target.provider };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.sayitright.meta_title']({}, { locale });
    const description = m['site.sayitright.meta_description']({}, { locale });
    const { canonical, alternates } = localeLinks(PAGE_PATH, locale);
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
            'Say It Right AI trio dance — lead dancer in pink T-shirt and purple backpack',
        },
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: SayItRightAiPage,
});
