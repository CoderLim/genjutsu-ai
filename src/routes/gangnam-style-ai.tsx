import { createFileRoute } from '@tanstack/react-router';

import { resolveGangnamStyleAiProviderTarget } from '@/modules/gangnam-style-ai/provider';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { GangnamStyleAiGeneratorPanel } from '@/components/landing/GangnamStyleAiGeneratorPanel';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

const PAGE_PATH = '/gangnam-style-ai';
const OG_IMAGE = '/videos/gangnam-style-ai-tpl-poster.jpg';

function GangnamStyleAiPage() {
  const { creditProvider } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <div className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(32_40%_18%)_0%,transparent_55%)]"
        />
        <SiteHeader />

        <main className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6">
          <section className="text-center sm:text-left">
            <p className="text-sm tracking-wide text-white/55 uppercase">
              {m['site.gangnam.hero_badge']()}
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-white md:text-5xl">
              {m['site.gangnam.hero_title']()}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60 sm:mx-0 sm:text-lg">
              {m['site.gangnam.hero_description']()}
            </p>

            <div id="generator" className="mt-8 text-left sm:mt-10">
              <h2 className="sr-only">{m['site.gangnam.generator_title']()}</h2>
              <GangnamStyleAiGeneratorPanel creditProvider={creditProvider} />
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/gangnam-style-ai')({
  loader: () => {
    const locale = getLocale();
    const target = resolveGangnamStyleAiProviderTarget();
    return { locale, creditProvider: target.provider };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['site.gangnam.meta_title']({}, { locale });
    const description = m['site.gangnam.meta_description']({}, { locale });
    const { canonical, alternates } = localeLinks(PAGE_PATH, locale, ['en']);
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        {
          name: 'robots',
          content: 'index,follow,max-image-preview:large',
        },
        ...socialMeta({
          title,
          description,
          url: canonical,
          image: absoluteUrl(OG_IMAGE),
        }),
        {
          property: 'og:image:alt',
          content: 'Gangnam Style AI dance video made from three photos',
        },
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: GangnamStyleAiPage,
});
