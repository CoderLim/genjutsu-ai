import { createFileRoute } from '@tanstack/react-router';
import { WandSparkles } from 'lucide-react';

import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
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
/** English-only at launch — advertise en + x-default only. */
const SEO_LOCALES = ['en'] as const;

const TITLE = 'Video Face Swap Generator – AI Head Swap | Genjutsu AI';
const DESCRIPTION =
  'Swap a face in a video with one authorized portrait. Upload a 3–120s clip, keep the original body motion, and generate an AI head swap in 480p or 720p.';

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

function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Video Face Swap Generator',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: absoluteUrl(PAGE_PATH),
    description: DESCRIPTION,
    image: absoluteUrl(OG_IMAGE),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Prepaid credits; estimate shown before generation',
    },
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
        name: 'Video Face Swap',
        item: canonical,
      },
    ],
  };
}

export const Route = createFileRoute('/video-face-swap')({
  loader: () => {
    const locale = getLocale();
    const { canonical, alternates } = localeLinks(PAGE_PATH, locale, [
      ...SEO_LOCALES,
    ]);
    return {
      title: TITLE,
      description: DESCRIPTION,
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
          content: 'Video face swap before and after with reference portrait',
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

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={softwareApplicationJsonLd()} />
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
          <section className="mx-auto max-w-7xl px-4 pt-10 pb-8 text-center sm:pt-14 md:px-5 md:pb-10">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-[rgba(204,144,92,0.2)] bg-[rgba(204,144,92,0.07)] px-3 py-1.5 text-xs font-medium text-[rgb(220,155,99)]">
              <WandSparkles className="size-3.5" />
              Video Face Swap · Head Swap
            </div>

            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              Video Face Swap Generator
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              Replace a head in your video with one portrait you have permission
              to use. Keep the original performance and scene while AI adapts
              the head to the camera angle and lighting.
            </p>
            <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
              <span>One Portrait</span>
              <span aria-hidden>·</span>
              <span>Original Motion</span>
              <span aria-hidden>·</span>
              <span>Up to 720p</span>
              <span aria-hidden>·</span>
              <span>Authorized Media Only</span>
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
