import { createFileRoute } from '@tanstack/react-router';
import { ArrowUpRight, ImagePlay } from 'lucide-react';

import { envConfigs } from '@/config';
import { Link } from '@/core/i18n/navigation';
import { localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { FaqSection } from '@/components/landing/FaqSection';
import { getLocalizedGenjutsuFaqs } from '@/components/landing/genjutsu-faqs-i18n';
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
        <aside className="mx-auto mt-8 flex max-w-5xl flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ImagePlay className="mt-1 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                New image-to-video tool
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Start with a photo, describe the motion, and turn it into a short video.
              </p>
            </div>
          </div>
          <Link
            href="/image-to-video/"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Image to Video AI
            <ArrowUpRight className="size-4" />
          </Link>
        </aside>
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
