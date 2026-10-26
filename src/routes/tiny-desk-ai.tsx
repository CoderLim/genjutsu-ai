import { createFileRoute } from '@tanstack/react-router';

import { resolveTinyDeskAiProviderTarget } from '@/modules/tiny-desk-ai/provider';
import { absoluteUrl, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { TinyDeskAiGeneratorPanel } from '@/components/landing/TinyDeskAiGeneratorPanel';
import {
  getTinyDeskAiFaqSchemaItems,
  getTinyDeskAiHowToSteps,
  TinyDeskAiSeoSections,
} from '@/components/landing/TinyDeskAiSeoSections';
import { SeoJsonLd } from '@/components/seo-json-ld';

const PAGE_PATH = '/tiny-desk-ai';
const TINY_DESK_EXAMPLE_CASES = [
  {
    id: 'case-01',
    src: '/videos/demos/tiny-desk-ai-case-01.mp4',
    poster: '/videos/demos/tiny-desk-ai-case-01-poster.jpg',
  },
  {
    id: 'case-02',
    src: '/videos/demos/tiny-desk-ai-case-02.mp4',
    poster: '/videos/demos/tiny-desk-ai-case-02-poster.jpg',
  },
  {
    id: 'case-03',
    src: '/videos/demos/tiny-desk-ai-case-03.mp4',
    poster: '/videos/demos/tiny-desk-ai-case-03-poster.jpg',
  },
] as const;
const OG_IMAGE = TINY_DESK_EXAMPLE_CASES[0].poster;
const DEMO_VIDEO = TINY_DESK_EXAMPLE_CASES[0].src;
const DEMO_POSTER = TINY_DESK_EXAMPLE_CASES[0].poster;
/** English-only for now — advertise en + x-default only. */
const SEO_LOCALES = ['en'] as const;

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: getTinyDeskAiFaqSchemaItems().map((item) => ({
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
    name: m['site.tinydesk.seo.howto_title'](),
    totalTime: 'PT5M',
    step: getTinyDeskAiHowToSteps().map((step) => ({
      '@type': 'HowToStep',
      name: step.name,
      text: step.text,
    })),
  };
}

function videoJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: m['site.tinydesk.hero_title'](),
    description: m['site.tinydesk.page_description'](),
    thumbnailUrl: [absoluteUrl(DEMO_POSTER)],
    contentUrl: absoluteUrl(DEMO_VIDEO),
    uploadDate: '2026-10-26',
    duration: 'PT19S',
    encodingFormat: 'video/mp4',
    mainEntityOfPage: canonical,
  };
}

function softwareApplicationJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tiny Desk AI Video Generator',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      description:
        'Generation uses Genjutsu AI credits; cost is shown before you confirm',
    },
    url: canonical,
    description: m['site.tinydesk.page_description'](),
    image: absoluteUrl(OG_IMAGE),
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
        name: 'Tiny Desk AI',
        item: canonical,
      },
    ],
  };
}

function TinyDeskAiPage() {
  const { creditProvider } = Route.useLoaderData();
  const canonical = absoluteUrl(PAGE_PATH);

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={howToJsonLd()} />
      <SeoJsonLd value={videoJsonLd(canonical)} />
      <SeoJsonLd value={softwareApplicationJsonLd(canonical)} />
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
                {m['site.tinydesk.hero_badge']()}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/45">
                {m['site.tinydesk.updated']()}
              </span>
            </div>

            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              {m['site.tinydesk.hero_title']()}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-xl font-semibold tracking-tight text-white/82 sm:text-2xl">
              {m['site.tinydesk.hero_subtitle']()}
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              {m['site.tinydesk.hero_description']()}
            </p>

            <div
              id="generator"
              className="mt-8 scroll-mt-24 text-left sm:mt-10"
            >
              <TinyDeskAiGeneratorPanel creditProvider={creditProvider} />
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/42">
              {m['site.tinydesk.hero_note']()}
            </p>
          </section>

          <section
            id="example"
            className="mx-auto max-w-5xl scroll-mt-24 px-4 pb-14 md:px-5 md:pb-16"
          >
            <h2 className="text-xs font-semibold tracking-[0.18em] text-[rgb(204,144,92)] uppercase">
              {m['site.tinydesk.example_title']()}
            </h2>
            <div className="mt-4 grid items-start gap-3 sm:grid-cols-3">
              {TINY_DESK_EXAMPLE_CASES.map((clip, index) => (
                <div
                  key={clip.id}
                  className="overflow-hidden rounded-[20px] border border-white/10 bg-black/25 p-2.5"
                >
                  <video
                    src={clip.src}
                    poster={clip.poster}
                    title={`${m['site.tinydesk.example_title']()} ${index + 1}`}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-[9/16] max-h-[480px] w-full rounded-xl bg-black object-contain"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-white/34">
              {m['site.tinydesk.example_caption']()}
            </p>
          </section>

          <TinyDeskAiSeoSections />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/tiny-desk-ai')({
  loader: () => {
    const locale = getLocale();
    const target = resolveTinyDeskAiProviderTarget();
    return { locale, creditProvider: target.provider };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.tinydesk.page_title']({}, { locale });
    const description = m['site.tinydesk.page_description']({}, { locale });
    const canonical = absoluteUrl(PAGE_PATH);
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
          content: 'Tiny Desk AI concert video from a photo',
        },
      ],
      links: [
        { rel: 'canonical', href: canonical },
        // en-only: advertise en + x-default; do not mirror /ja /ko /es onto EN.
        ...SEO_LOCALES.map((loc) => ({
          rel: 'alternate' as const,
          hrefLang: loc,
          href: canonical,
        })),
        {
          rel: 'alternate' as const,
          hrefLang: 'x-default',
          href: canonical,
        },
      ],
    };
  },
  component: TinyDeskAiPage,
});
