import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { AdvancedFeatures } from '@/components/landing/AdvancedFeatures';
import { AiImageTools } from '@/components/landing/AiImageTools';
import { FaqSection } from '@/components/landing/FaqSection';
import { GetInspired } from '@/components/landing/GetInspired';
import { Hero } from '@/components/landing/Hero';
import { KeyFeatures } from '@/components/landing/KeyFeatures';
import { PricingSection } from '@/components/landing/PricingSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { StickyComposer } from '@/components/landing/StickyComposer';
import { StyleDiscovery } from '@/components/landing/StyleDiscovery';
import { Testimonials } from '@/components/landing/Testimonials';
import { TopModels } from '@/components/landing/TopModels';

/**
 * Raphael AI homepage clone — visual 1:1 of https://raphael.app/
 */
function HomePage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-5">
        <Hero />
        <AiImageTools />
        <TopModels />
        <GetInspired />
        <StyleDiscovery />
        <KeyFeatures />
        <AdvancedFeatures />
        <Testimonials />
        <PricingSection />
        <FaqSection />
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
        {
          title: 'Raphael AI - Free Unlimited AI Image Generator',
        },
        {
          name: 'description',
          content:
            'Raphael AI Image Generator: free and unlimited AI image generator, featuring top models including Nano Banana 2 / Pro, Qwen-Image, and Seedream 5.0. No registration, no count limits.',
        },
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
