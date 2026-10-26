import { createFileRoute } from '@tanstack/react-router';

import { localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Pricing } from '@/blocks/pricing';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import {
  getPricingFaqItems,
  PricingCreditsGuide,
} from '@/components/pricing-credits-guide';
import { SeoJsonLd } from '@/components/seo-json-ld';

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: getPricingFaqItems().map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export const Route = createFileRoute('/pricing')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks('/pricing', locale);
    return {
      meta: [
        { title: m['site.pricing.standalone_meta_title']({}, { locale }) },
        {
          name: 'description',
          content: m['site.pricing.standalone_meta_desc']({}, { locale }),
        },
        ...socialMeta({
          title: m['site.pricing.standalone_meta_title']({}, { locale }),
          description: m['site.pricing.standalone_meta_desc']({}, { locale }),
          url: canonical,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-16">
        <SeoJsonLd value={faqJsonLd()} />
        <Pricing />
        <PricingCreditsGuide />
      </main>
      <SiteFooter />
    </div>
  );
}
