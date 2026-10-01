import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localeLinks, socialMeta } from '@/lib/seo';
import { getLocale } from '@/paraglide/runtime.js';
import { GENJUTSU_FAQS } from '@/components/landing/content';
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

const PAGE_TITLE = 'Genjutsu AI Video Generator — Video Restyling';
const PAGE_DESCRIPTION =
  'Genjutsu AI restyles any video without changing who or what is in it. Transfer motion into a new scene, style, or objects — upload a clip, write a prompt, get your new video in minutes.';

function HomePage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-5">
        <Hero />
        <WhatIsGenjutsu />
        <HowGenjutsuWorks />
        <WhatYouCanChange />
        <HowToUseGenerator />
        <PromptIdeas />
        <PricingSection />
        <VsOfficial />
        <Testimonials />
        <FaqSection
          items={GENJUTSU_FAQS}
          title="Genjutsu AI FAQ"
          description={
            <>
              Answers about video-to-video, credits, and how Genjutsu preserves
              motion. Contact{' '}
              <a
                href={`mailto:${envConfigs.app_support_email}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {envConfigs.app_support_email}
              </a>{' '}
              if you need help.
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
      mainEntity: GENJUTSU_FAQS.map((item) => ({
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
        { title: PAGE_TITLE },
        { name: 'description', content: PAGE_DESCRIPTION },
        ...socialMeta({
          title: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
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
