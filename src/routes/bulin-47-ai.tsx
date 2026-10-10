import { createFileRoute } from '@tanstack/react-router';
import { WandSparkles } from 'lucide-react';

import { localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Bulin47GeneratorPanel } from '@/components/landing/Bulin47GeneratorPanel';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

function Bulin47AiPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 z-[260]">
          <SiteHeader />
        </div>

        <section className="mx-auto w-full max-w-7xl px-4 pt-20 pb-12 text-center sm:pt-24 md:px-5 md:pb-16">
          <div className="border-primary/20 bg-primary/10 text-primary mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
            <WandSparkles className="size-3.5" />
            {m['site.bulin.hero_badge']()}
          </div>

          <h1 className="text-foreground mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
            {m['site.bulin.hero_title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-base leading-7 sm:text-lg">
            {m['site.bulin.hero_desc']()}
          </p>

          <div id="generator" className="mt-8 scroll-mt-24 text-left sm:mt-10">
            <Bulin47GeneratorPanel />
          </div>
        </section>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-5">
        {/* SEO / long-form sections will be added later */}
      </main>

      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/bulin-47-ai')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks('/bulin-47-ai', locale);
    return {
      meta: [
        { title: m['site.bulin.page_title']() },
        { name: 'description', content: m['site.bulin.page_description']() },
        ...socialMeta({
          title: m['site.bulin.page_title'](),
          description: m['site.bulin.page_description'](),
          url: canonical,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: Bulin47AiPage,
});
