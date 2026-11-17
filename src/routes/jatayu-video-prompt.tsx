import { createFileRoute, redirect } from '@tanstack/react-router';

import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { getLocale } from '@/paraglide/runtime.js';
import {
  JATAYU_DEMO_DURATION,
  JATAYU_DEMO_POSTER,
  JATAYU_DEMO_UPLOAD_DATE,
  JATAYU_DEMO_VIDEO,
  JATAYU_FAQ_ITEMS,
  JATAYU_PAGE_DESCRIPTION,
  JATAYU_PAGE_PATH,
  JATAYU_PAGE_TITLE,
} from '@/components/landing/jatayu-video-prompt-content';
import { JatayuVideoPromptSeoSections } from '@/components/landing/JatayuVideoPromptSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

/** English editorial first — do not advertise locale mirrors yet. */
const SEO_LOCALES = ['en'] as const;

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: JATAYU_FAQ_ITEMS.map((item) => ({
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
    name: 'Jatayu AI video — golden-hour eagle scene',
    description:
      'Jatayu AI video made with Google Flow — eagle spreading its wings behind the subject at golden hour',
    contentUrl: absoluteUrl(JATAYU_DEMO_VIDEO),
    thumbnailUrl: absoluteUrl(JATAYU_DEMO_POSTER),
    uploadDate: JATAYU_DEMO_UPLOAD_DATE,
    duration: JATAYU_DEMO_DURATION,
  };
}

function breadcrumbJsonLd() {
  // Two-level until /ai-video-trends hub exists — do not invent a fake middle crumb.
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
        name: 'Jatayu AI Video Prompt',
        item: absoluteUrl(JATAYU_PAGE_PATH),
      },
    ],
  };
}

function JatayuVideoPromptPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={videoJsonLd()} />
      <SeoJsonLd value={breadcrumbJsonLd()} />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(154,91,55,0.22),transparent_38%),linear-gradient(to_bottom,rgba(13,10,9,0.5),hsl(28_25%_9%)_78%)]" />
          <div className="absolute top-24 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[rgba(204,144,92,0.055)] blur-3xl" />
        </div>

        <div className="relative z-20">
          <SiteHeader />
        </div>

        <main className="relative z-10">
          <JatayuVideoPromptSeoSections />
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/jatayu-video-prompt')({
  beforeLoad: () => {
    if (getLocale() !== 'en') {
      throw redirect({
        href: JATAYU_PAGE_PATH,
        statusCode: 307,
        reloadDocument: true,
      });
    }
  },
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks(
      JATAYU_PAGE_PATH,
      locale,
      SEO_LOCALES
    );
    return {
      meta: [
        { title: JATAYU_PAGE_TITLE },
        { name: 'description', content: JATAYU_PAGE_DESCRIPTION },
        ...socialMeta({
          title: JATAYU_PAGE_TITLE,
          description: JATAYU_PAGE_DESCRIPTION,
          url: canonical,
          image: absoluteUrl(JATAYU_DEMO_POSTER),
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: JatayuVideoPromptPage,
});
