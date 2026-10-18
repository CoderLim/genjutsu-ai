import { createFileRoute } from '@tanstack/react-router';

import { resolveFlyingCarAiProviderTarget } from '@/modules/flying-car-ai/provider';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { FlyingCarAiGeneratorPanel } from '@/components/landing/FlyingCarAiGeneratorPanel';
import {
  FlyingCarAiSeoSections,
  getFlyingCarAiFaqItems,
  getFlyingCarAiHowToSteps,
} from '@/components/landing/FlyingCarAiSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const OG_IMAGE = '/og/flying-car-ai.jpg';
const PAGE_PATH = '/flying-car-ai';

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: getFlyingCarAiFaqItems().map((item) => ({
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
    name: m['site.flying_car.seo.howto_title'](),
    totalTime: 'PT10M',
    step: getFlyingCarAiHowToSteps().map((step) => ({
      '@type': 'HowToStep',
      name: step.name,
      text: step.text,
    })),
  };
}

function softwareApplicationJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: m['site.flying_car.jsonld_app_name'](),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web, iOS, Android',
    url: canonical,
    description: m['site.flying_car.jsonld_app_description'](),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      m['site.flying_car.jsonld_feature1'](),
      m['site.flying_car.jsonld_feature2'](),
      m['site.flying_car.jsonld_feature3'](),
    ],
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
        name: m['site.flying_car.jsonld_crumb_home'](),
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: m['site.flying_car.jsonld_crumb_page'](),
        item: canonical,
      },
    ],
  };
}

function FlyingCarAiPage() {
  const { creditProvider } = Route.useLoaderData();
  const canonical = absoluteUrl(PAGE_PATH);

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={softwareApplicationJsonLd(canonical)} />
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={howToJsonLd()} />
      <SeoJsonLd value={breadcrumbJsonLd(canonical)} />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(154,91,55,0.22),transparent_38%),linear-gradient(to_bottom,rgba(13,10,9,0.5),hsl(28_25%_9%)_78%)]" />
          <div className="absolute top-24 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[rgba(204,144,92,0.055)] blur-3xl" />
        </div>

        <div className="relative z-20">
          <SiteHeader />
        </div>

        <main className="relative z-10">
          <section className="mx-auto max-w-7xl px-4 pt-14 pb-6 text-center sm:pt-20 md:px-5">
            <div className="mx-auto mb-4 flex w-fit flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-[rgba(204,144,92,0.2)] bg-[rgba(204,144,92,0.07)] px-3 py-1.5 text-xs font-medium text-[rgb(220,155,99)]">
                {m['site.flying_car.hero_badge']()}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/45">
                {m['site.flying_car.updated']()}
              </span>
            </div>

            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              {m['site.flying_car.hero_title']()}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              {m['site.flying_car.hero_lead']()}
            </p>
            <p className="mx-auto mt-3 max-w-3xl text-base leading-7 font-medium text-white/72 sm:text-lg">
              {m['site.flying_car.hero_answer']()}
            </p>

            <div
              id="generator"
              className="mt-8 scroll-mt-24 text-left sm:mt-10"
            >
              <FlyingCarAiGeneratorPanel creditProvider={creditProvider} />
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/42">
              {m['site.flying_car.hero_note']()}
            </p>
          </section>

          <FlyingCarAiSeoSections />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/flying-car-ai')({
  loader: () => {
    const locale = getLocale();
    const target = resolveFlyingCarAiProviderTarget();
    return { locale, creditProvider: target.provider };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.flying_car.page_title']({}, { locale });
    const description = m['site.flying_car.page_description']({}, { locale });
    const ogTitle = m['site.flying_car.og_title']({}, { locale });
    const ogDescription = m['site.flying_car.og_description']({}, { locale });
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
          title: ogTitle,
          description: ogDescription,
          url: canonical,
          image: absoluteUrl(OG_IMAGE),
        }),
        {
          property: 'og:image:alt',
          content: m['site.flying_car.og_image_alt']({}, { locale }),
        },
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: FlyingCarAiPage,
});
