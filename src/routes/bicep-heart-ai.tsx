import { createFileRoute, redirect } from '@tanstack/react-router';
import { WandSparkles } from 'lucide-react';

import { resolveBicepHeartAiProviderTarget } from '@/modules/bicep-heart-ai/provider';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { BicepHeartAiGeneratorPanel } from '@/components/landing/BicepHeartGeneratorPanel';
import {
  BICEP_HEART_FAQ_ITEMS,
  BicepHeartSeoSections,
} from '@/components/landing/BicepHeartSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const PAGE_PATH = '/bicep-heart-ai';
const OG_IMAGE = '/videos/bicep-heart-tpl-poster.jpg';
/** English editorial first — do not advertise locale mirrors yet. */
const SEO_LOCALES = ['en'] as const;

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: BICEP_HEART_FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
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
        name: 'Bicep Heart Trend',
        item: canonical,
      },
    ],
  };
}

function BicepHeartAiPage() {
  const { creditProvider, creditModel } = Route.useLoaderData();
  const canonical = absoluteUrl(PAGE_PATH);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={breadcrumbJsonLd(canonical)} />

      <SiteHeader />

      <div className="relative">
        <section className="mx-auto w-full max-w-7xl px-4 pt-8 pb-8 text-center md:px-5 md:pb-10">
          <div className="border-primary/20 bg-primary/10 text-primary mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
            <WandSparkles className="size-3.5" />
            {m['site.bicep_heart.hero_badge']()}
          </div>

          <h1 className="text-foreground mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
            {m['site.bicep_heart.hero_title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-base leading-7 sm:text-lg">
            {m['site.bicep_heart.hero_desc']()}
          </p>

          <div
            id="generator"
            className="mx-auto mt-8 w-full max-w-5xl scroll-mt-24 text-left sm:mt-10"
          >
            <BicepHeartAiGeneratorPanel
              creditProvider={creditProvider}
              creditModel={creditModel}
            />
          </div>
        </section>
      </div>

      <main className="flex-1">
        <BicepHeartSeoSections />
      </main>

      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/bicep-heart-ai')({
  // English-only editorial content must not render inside a non-English shell.
  beforeLoad: () => {
    if (getLocale() !== 'en') {
      throw redirect({
        href: '/bicep-heart-ai',
        statusCode: 307,
        reloadDocument: true,
      });
    }
  },
  loader: () => {
    const locale = getLocale();
    const target = resolveBicepHeartAiProviderTarget();
    return {
      locale,
      creditProvider: target.provider,
      creditModel: target.model,
    };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.bicep_heart.page_title']({}, { locale });
    const description = m['site.bicep_heart.page_description']({}, { locale });
    const { canonical, alternates } = localeLinks(PAGE_PATH, locale, [
      ...SEO_LOCALES,
    ]);
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
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: BicepHeartAiPage,
});
