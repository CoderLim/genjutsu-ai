import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import {
  TEXT_TO_IMAGE_BADGES,
  TEXT_TO_IMAGE_FAQS,
} from '@/components/landing/content';
import { FaqSection } from '@/components/landing/FaqSection';
import { GeneratorPanel } from '@/components/landing/GeneratorPanel';
import { GetInspired } from '@/components/landing/GetInspired';
import { PopularModels } from '@/components/landing/PopularModels';
import { PricingSection } from '@/components/landing/PricingSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { StickyComposer } from '@/components/landing/StickyComposer';
import {
  KeepExploring,
  TextToImageCta,
  TextToImageFeatures,
} from '@/components/landing/TextToImageSections';
import { WorkspaceShell } from '@/components/landing/WorkspaceSidebar';

function TextToImagePage() {
  return (
    <WorkspaceShell>
      <div className="flex min-h-screen flex-col">
        <header className="border-border/15 flex items-center justify-between gap-3 border-b px-4 py-3 lg:px-6">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <img
              src="/logo.webp"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-full"
            />
            <span className="text-sm font-bold text-[rgb(249,166,57)]">
              Raphael AI
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/settings/history"
              className="text-foreground/70 hover:text-foreground hidden rounded-lg px-3 py-1.5 text-sm sm:inline-flex"
            >
              History →
            </Link>
            <Link
              href="/pricing"
              className="text-foreground inline-flex items-center gap-1.5 rounded-lg bg-[rgba(120,87,60,0.4)] px-3 py-1.5 text-sm font-semibold"
            >
              Upgrade
              <span className="rounded-[4px] bg-[#e05256] px-1.5 py-0.5 text-[9px] font-black text-white">
                -50%
              </span>
            </Link>
          </div>
        </header>

        <main className="relative min-h-screen flex-1 overflow-x-clip px-0 py-8">
          <div className="mx-auto w-full max-w-6xl px-6 pb-0 sm:px-8 lg:px-10 xl:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                AI Text to Image Generator
              </h1>
              <p className="text-foreground/70 mt-4 text-base leading-relaxed sm:text-lg">
                Generate images from text with GPT Image 2, Nano Banana 2,
                Seedream 5, and Seedream 3.5 Pro — choose a model, set your
                aspect ratio, and download HD results.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {TEXT_TO_IMAGE_BADGES.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex h-[27px] items-center rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.1)] px-2.5 text-[11px] font-medium text-[rgb(245,158,11)]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div
              id="t2i-generator"
              className="mx-auto mt-8 max-w-[1128px] scroll-mt-24"
            >
              <GeneratorPanel />
            </div>

            <PopularModels className="mt-14" />

            <GetInspired className="mt-8" />
            <TextToImageFeatures />
            <KeepExploring />
            <PricingSection />
            <FaqSection items={TEXT_TO_IMAGE_FAQS} title="FAQs" />
            <TextToImageCta />
          </div>
        </main>

        <SiteFooter />
        <StickyComposer observeId="t2i-generator" />
      </div>
    </WorkspaceShell>
  );
}

export const Route = createFileRoute('/text-to-image')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = 'AI Text to Image Generator | Raphael AI';
    const description =
      'Generate images from text with GPT Image 2, Nano Banana 2, Seedream 5, and Seedream 3.5 Pro.';
    const urlFor = (loc: string) => {
      const base = envConfigs.app_url || 'http://localhost:3000';
      return localizeUrl(new URL('/text-to-image', base).href, {
        locale: loc as 'en' | 'zh',
      }).href;
    };
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
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
  component: TextToImagePage,
});
