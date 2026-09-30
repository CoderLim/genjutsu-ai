import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
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

const PAGE_TITLE = 'Genjutsu AI Video Generator — Reality Manipulation';
const PAGE_DESCRIPTION =
  'Genjutsu AI swaps characters, outfits and scenes in any video while keeping the original motion. Upload a clip, write a prompt, get your new video in minutes.';

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
          description="Answers about video-to-video, credits, and how Genjutsu preserves motion."
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
    const urlFor = (loc: string) =>
      localizeUrl(`${envConfigs.app_url}/`, { locale: loc as 'en' | 'zh' })
        .href;
    return {
      meta: [
        { title: PAGE_TITLE },
        { name: 'description', content: PAGE_DESCRIPTION },
        { property: 'og:title', content: PAGE_TITLE },
        { property: 'og:description', content: PAGE_DESCRIPTION },
        { name: 'twitter:title', content: PAGE_TITLE },
        { name: 'twitter:description', content: PAGE_DESCRIPTION },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
    };
  },
  component: HomePage,
});
