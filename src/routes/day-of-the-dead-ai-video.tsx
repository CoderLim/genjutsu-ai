import { createFileRoute } from '@tanstack/react-router';

import { DAY_OF_THE_DEAD_PRESET_ID } from '@/modules/image-to-video/presets';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import {
  DayOfTheDeadSeoSections,
  DOTD_DEMO_VIDEO,
  DOTD_FAQ_JSON_LD_ITEMS,
  DOTD_HOWTO_STEPS,
} from '@/components/landing/DayOfTheDeadSeoSections';
import { ImageToVideoGeneratorPanel } from '@/components/landing/ImageToVideoGeneratorPanel';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const PAGE_PATH = '/day-of-the-dead-ai-video';
const OG_IMAGE = DOTD_DEMO_VIDEO.poster;

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: DOTD_FAQ_JSON_LD_ITEMS.map((item) => ({
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
    name: 'How to make a Day of the Dead AI video',
    totalTime: 'PT2M',
    step: DOTD_HOWTO_STEPS.map((step) => ({
      '@type': 'HowToStep',
      name: step.name,
      text: step.text,
    })),
  };
}

function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Day of the Dead AI Video Generator',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free to try; generation uses credits',
    },
    url: absoluteUrl(PAGE_PATH),
    description: m['site.dotd.page_description'](),
  };
}

function videoJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'Day of the Dead AI video demo',
    description:
      'Example Day of the Dead (Día de los Muertos) AI video made from one photo — sugar-skull makeup, marigolds, candlelight.',
    contentUrl: absoluteUrl(DOTD_DEMO_VIDEO.src),
    thumbnailUrl: absoluteUrl(DOTD_DEMO_VIDEO.poster),
    uploadDate: DOTD_DEMO_VIDEO.uploadDate,
    duration: DOTD_DEMO_VIDEO.duration,
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
        name: 'Genjutsu AI',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Day of the Dead AI Video',
        item: canonical,
      },
    ],
  };
}

function DayOfTheDeadAiVideoPage() {
  const canonical = absoluteUrl(PAGE_PATH);

  return (
    <div className="flex min-h-screen flex-col">
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={howToJsonLd()} />
      <SeoJsonLd value={softwareApplicationJsonLd()} />
      <SeoJsonLd value={videoJsonLd()} />
      <SeoJsonLd value={breadcrumbJsonLd(canonical)} />

      <div className="relative flex-1 overflow-hidden bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
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
                {m['site.dotd.hero_badge']()}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/45">
                {m['site.dotd.updated']()}
              </span>
            </div>

            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              {m['site.dotd.hero_title']()}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              {m['site.dotd.hero_desc']()}
            </p>

            <div
              id="generator"
              className="mt-8 scroll-mt-24 text-left sm:mt-10"
            >
              <ImageToVideoGeneratorPanel
                presetId={DAY_OF_THE_DEAD_PRESET_ID}
              />
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/42">
              {m['site.dotd.hero_note']()}
            </p>
          </section>

          <DayOfTheDeadSeoSections />
        </main>
      </div>

      <div className="bg-background text-foreground">
        <SiteFooter />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/day-of-the-dead-ai-video')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.dotd.page_title']({}, { locale });
    const description = m['site.dotd.page_description']({}, { locale });
    const { canonical, alternates } = localeLinks(PAGE_PATH, locale);
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...socialMeta({
          title,
          description,
          url: canonical,
          image: absoluteUrl(OG_IMAGE),
        }),
        {
          property: 'og:image:alt',
          content: 'Day of the Dead AI video from one photo',
        },
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: DayOfTheDeadAiVideoPage,
});
