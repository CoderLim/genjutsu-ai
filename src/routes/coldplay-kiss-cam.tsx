import { createFileRoute } from '@tanstack/react-router';

import { resolveColdplayKissCamProviderTarget } from '@/modules/coldplay-kiss-cam/provider';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { ColdplayKissCamGeneratorPanel } from '@/components/landing/ColdplayKissCamGeneratorPanel';
import {
  ColdplayKissCamIntroCopy,
  ColdplayKissCamSeoSections,
  getColdplayKissCamFaqItems,
} from '@/components/landing/ColdplayKissCamSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const OG_IMAGE = '/imgs/generated/coldplay-kiss-cam-og.jpg';
const PAGE_PATH = '/coldplay-kiss-cam';
const TEMPLATE_VIDEO = '/videos/coldplay-kiss-cam-tpl.mp4';
const TEMPLATE_POSTER = '/videos/coldplay-kiss-cam-tpl-poster.jpg';
const TEMPLATE_DURATION = 'PT10S';
const TEMPLATE_UPLOAD_DATE = '2026-10-25';

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: getColdplayKissCamFaqItems().map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function videoJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: m['site.kisscam.seo.look_video_title'](),
    description: m['site.kisscam.seo.look_p1'](),
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
        name: 'Coldplay Kiss Cam',
        item: canonical,
      },
    ],
  };
}

function ColdplayKissCamPage() {
  const { creditProvider } = Route.useLoaderData();
  const canonical = absoluteUrl(PAGE_PATH);

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={videoJsonLd()} />
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
          <section className="mx-auto max-w-7xl px-4 pt-14 pb-10 text-center sm:pt-20 md:px-5 md:pb-12">
            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              {m['site.kisscam.hero_title']()}
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              {m['site.kisscam.hero_description']()}
            </p>

            <div id="generator" className="mt-8 text-left sm:mt-10">
              <ColdplayKissCamGeneratorPanel creditProvider={creditProvider} />
            </div>

            <ColdplayKissCamIntroCopy />
          </section>

          <ColdplayKissCamSeoSections />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/coldplay-kiss-cam')({
  loader: () => {
    const locale = getLocale();
    const target = resolveColdplayKissCamProviderTarget();
    return { locale, creditProvider: target.provider };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.kisscam.page_title']({}, { locale });
    const description = m['site.kisscam.page_description']({}, { locale });
    // English-only editorial for now — don't advertise empty locale variants.
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
          content: 'Coldplay Kiss Cam video made from two photos',
        },
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: ColdplayKissCamPage,
});
