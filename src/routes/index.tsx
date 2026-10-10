import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localeLinks, socialMeta } from '@/lib/seo';
import { getLocale } from '@/paraglide/runtime.js';
import { getLocalizedGenjutsuFaqs } from '@/components/landing/genjutsu-faqs-i18n';
import { m } from '@/paraglide/messages.js';
import { FaqSection } from '@/components/landing/FaqSection';
import {
  BackToToolCta,
  HowGenjutsuWorks,
  HowToUseGenerator,
  PromptIdeas,
  VsOfficial,
  WhatIsGenjutsu,
  WhatYouCanChange,
} from '@/components/landing/GenjutsuSeoSections';
import { Hero } from '@/components/landing/Hero';
import { PricingSection } from '@/components/landing/PricingSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { StickyComposer } from '@/components/landing/StickyComposer';
import { Testimonials } from '@/components/landing/Testimonials';



function HomePage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 z-[260]">
          <SiteHeader />
        </div>
        <Hero />
      </div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-5">
        <WhatIsGenjutsu />
        <HowGenjutsuWorks />
        <WhatYouCanChange />
        <HowToUseGenerator />
        <PromptIdeas />
        <PricingSection />
        <VsOfficial />
        <Testimonials />
        <FaqSection
          items={getLocalizedGenjutsuFaqs()}
          title={m['site.home.faq_title']()}
          description={
            <>
              {m['site.home.faq_intro']()}{' '}
              <a
                href={`mailto:${envConfigs.app_support_email}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {envConfigs.app_support_email}
              </a>{' '}
              {m['site.home.faq_help']()}
            </>
          }
        />
        <BackToToolCta />
      </main>
      <SiteFooter />
      <StickyComposer />
    </div>
  );
}

export const Route = createFileRoute('/')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks('/', locale);
    const faqLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: getLocalizedGenjutsuFaqs().map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
    return {
      meta: [
        { title: m['site.home.meta_title']() },
        { name: 'description', content: m['site.home.meta_description']() },
        ...socialMeta({
          title: m['site.home.meta_title'](),
          description: m['site.home.meta_description'](),
          url: canonical,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(faqLd),
        },
      ],
    };
  },
  component: HomePage,
});
