import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { resolveShanShenBuProviderTarget } from '@/modules/shan-shen-bu/provider';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { ShanShenBuGeneratorPanel } from '@/components/landing/ShanShenBuGeneratorPanel';
import {
  getShanShenBuFaqItems,
  getShanShenBuHowToSteps,
  ShanShenBuSeoSections,
} from '@/components/landing/ShanShenBuSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const OG_IMAGE = '/videos/shan-shen-bu-tpl-poster.jpg';
const PAGE_PATH = '/shan-shen-bu';
/** English editorial first — do not advertise empty locale mirrors. */
const SEO_LOCALES = ['en'] as const;

function pageJsonLd(canonical: string) {
  const siteName = envConfigs.app_name || 'Genjutsu';
  const howtoSteps = getShanShenBuHowToSteps();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: m['site.shan_shen_bu.jsonld_article_headline'](),
        description: m['site.shan_shen_bu.jsonld_article_description'](),
        inLanguage: 'en',
        datePublished: '2026-10-28',
        dateModified: '2026-10-28',
        mainEntityOfPage: canonical,
        author: { '@type': 'Organization', name: siteName },
        publisher: { '@type': 'Organization', name: siteName },
        about: [
          { '@type': 'Thing', name: 'Shan Shen Bu' },
          { '@type': 'Thing', name: 'Huagudeng' },
          { '@type': 'Person', name: 'Zhao Tiechun' },
        ],
        mentions: [{ '@type': 'Thing', name: '闪身步' }],
      },
      {
        '@type': 'HowTo',
        name: m['site.shan_shen_bu.jsonld_howto_name'](),
        totalTime: 'PT10M',
        step: howtoSteps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
      },
      {
        '@type': 'VideoObject',
        name: m['site.shan_shen_bu.jsonld_video_name'](),
        description: m['site.shan_shen_bu.jsonld_video_description'](),
        uploadDate: '2018-01-01',
        thumbnailUrl: absoluteUrl(OG_IMAGE),
        contentUrl: absoluteUrl(`/api/genjutsu/template?product=shan-shen-bu`),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: m['site.shan_shen_bu.jsonld_crumb_home'](),
            item: absoluteUrl('/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: m['site.shan_shen_bu.jsonld_crumb_page'](),
            item: canonical,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: getShanShenBuFaqItems().map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
      {
        '@type': 'SoftwareApplication',
        name: m['site.shan_shen_bu.jsonld_app_name'](),
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web, iOS, Android',
        url: canonical,
        description: m['site.shan_shen_bu.jsonld_app_description'](),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          m['site.shan_shen_bu.jsonld_feature1'](),
          m['site.shan_shen_bu.jsonld_feature2'](),
          m['site.shan_shen_bu.jsonld_feature3'](),
        ],
      },
    ],
  };
}

function ShanShenBuPage() {
  const { creditProvider } = Route.useLoaderData();
  const canonical = absoluteUrl(PAGE_PATH);

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={pageJsonLd(canonical)} />

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
            <nav
              aria-label="Breadcrumb"
              className="mx-auto mb-5 flex w-fit flex-wrap items-center justify-center gap-1.5 text-xs text-white/40"
            >
              <a href="/" className="hover:text-white/65">
                {m['site.shan_shen_bu.jsonld_crumb_home']()}
              </a>
              <span aria-hidden>›</span>
              <span className="text-white/55">
                {m['site.shan_shen_bu.jsonld_crumb_page']()}
              </span>
            </nav>

            <div className="mx-auto mb-4 flex w-fit flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-[rgba(204,144,92,0.2)] bg-[rgba(204,144,92,0.07)] px-3 py-1.5 text-xs font-medium text-[rgb(220,155,99)]">
                {m['site.shan_shen_bu.hero_badge']()}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/45">
                {m['site.shan_shen_bu.updated']()}
              </span>
            </div>

            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              {m['site.shan_shen_bu.hero_title']()}
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              {m['site.shan_shen_bu.hero_lead']()}
            </p>
            <p className="mx-auto mt-3 max-w-3xl text-base leading-7 font-medium text-white/72 sm:text-lg">
              {m['site.shan_shen_bu.hero_answer']()}
            </p>

            <div
              id="generator"
              className="mt-8 scroll-mt-24 text-left sm:mt-10"
            >
              <ShanShenBuGeneratorPanel creditProvider={creditProvider} />
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/42">
              {m['site.shan_shen_bu.hero_note']()}
            </p>
          </section>

          <ShanShenBuSeoSections />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/shan-shen-bu')({
  loader: () => {
    const locale = getLocale();
    const target = resolveShanShenBuProviderTarget();
    return { locale, creditProvider: target.provider };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.shan_shen_bu.page_title']({}, { locale });
    const description = m['site.shan_shen_bu.page_description']({}, { locale });
    const ogTitle = m['site.shan_shen_bu.og_title']({}, { locale });
    const ogDescription = m['site.shan_shen_bu.og_description']({}, { locale });
    const { canonical, alternates } = localeLinks(
      PAGE_PATH,
      locale,
      SEO_LOCALES
    );
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
          content: m['site.shan_shen_bu.og_image_alt']({}, { locale }),
        },
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: ShanShenBuPage,
});
