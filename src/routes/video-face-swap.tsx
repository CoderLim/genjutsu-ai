import { createFileRoute } from '@tanstack/react-router';
import { WandSparkles } from 'lucide-react';

import { getVideoFaceSwapSeoPriceAmounts } from '@/modules/video-face-swap/seo-pricing';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { VideoFaceSwapGeneratorPanel } from '@/components/landing/VideoFaceSwapGeneratorPanel';
import {
  getVideoFaceSwapFaqSchemaItems,
  VideoFaceSwapEffectDemo,
  VideoFaceSwapSeoSections,
} from '@/components/landing/VideoFaceSwapSeoSections';
import { SeoJsonLd } from '@/components/seo-json-ld';

const PAGE_PATH = '/video-face-swap';
const OG_IMAGE = '/og/video-face-swap.jpg';

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: getVideoFaceSwapFaqSchemaItems().map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function softwareApplicationJsonLd(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: m['site.vfs.software_name']({}, { locale }),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: absoluteUrl(PAGE_PATH),
    description: m['site.vfs.page_description']({}, { locale }),
    image: absoluteUrl(OG_IMAGE),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: m['site.vfs.offer_description'](
        getVideoFaceSwapSeoPriceAmounts(),
        { locale }
      ),
    },
  };
}

function breadcrumbJsonLd(canonical: string, locale: string) {
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
        name: m['site.vfs.breadcrumb_name']({}, { locale }),
        item: canonical,
      },
    ],
  };
}

export const Route = createFileRoute('/video-face-swap')({
  loader: () => {
    const locale = getLocale();
    const { canonical, alternates } = localeLinks(PAGE_PATH, locale);
    return {
      locale,
      title: m['site.vfs.page_title']({}, { locale }),
      description: m['site.vfs.page_description']({}, { locale }),
      canonical,
      alternates,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return {
      meta: [
        { title: loaderData.title },
        { name: 'description', content: loaderData.description },
        ...socialMeta({
          title: loaderData.title,
          description: loaderData.description,
          url: loaderData.canonical,
          image: absoluteUrl(OG_IMAGE),
        }),
        {
          property: 'og:image:alt',
          content: m['site.vfs.og_image_alt'](
            {},
            { locale: loaderData.locale }
          ),
        },
      ],
      links: [
        { rel: 'canonical', href: loaderData.canonical },
        ...loaderData.alternates,
      ],
    };
  },
  component: VideoFaceSwapPage,
});

function VideoFaceSwapPage() {
  const loaderData = Route.useLoaderData();
  const canonical = loaderData.canonical;
  const locale = loaderData.locale;

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={softwareApplicationJsonLd(locale)} />
      <SeoJsonLd value={breadcrumbJsonLd(canonical, locale)} />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(154,91,55,0.22),transparent_38%),linear-gradient(to_bottom,hsl(13,10,9,0.5),hsl(28_25%_9%)_78%)]" />
          <div className="absolute top-24 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[rgba(204,144,92,0.055)] blur-3xl" />
        </div>

        <div className="relative z-20">
          <SiteHeader />
        </div>

        <main className="relative z-10">
          <section className="mx-auto max-w-7xl px-4 pt-10 pb-8 text-center sm:pt-14 md:px-5 md:pb-10">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-[rgba(204,144,92,0.2)] bg-[rgba(204,144,92,0.07)] px-3 py-1.5 text-xs font-medium text-[rgb(220,155,99)]">
              <WandSparkles className="size-3.5" />
              {m['site.vfs.hero_badge']()}
            </div>

            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              {m['site.vfs.hero_title']()}
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              {m['site.vfs.hero_desc']()}
            </p>
            <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
              <span>{m['site.vfs.chip_portrait']()}</span>
              <span aria-hidden>·</span>
              <span>{m['site.vfs.chip_motion']()}</span>
              <span aria-hidden>·</span>
              <span>{m['site.vfs.chip_resolution']()}</span>
              <span aria-hidden>·</span>
              <span>{m['site.vfs.chip_authorized']()}</span>
            </div>

            <div id="generator" className="mt-8 text-left sm:mt-10">
              <VideoFaceSwapGeneratorPanel />
            </div>

            <div className="mx-auto mt-6 w-full max-w-[1120px] text-left sm:mt-8">
              <VideoFaceSwapEffectDemo />
            </div>
          </section>

          <section className="border-t border-white/7 bg-white/[0.018]">
            <VideoFaceSwapSeoSections />
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
