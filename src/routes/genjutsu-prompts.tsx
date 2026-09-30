import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { GENJUTSU_PROMPT_IDEAS } from '@/components/landing/content';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

const PAGE_TITLE = 'Genjutsu Prompt Ideas — Character, Outfit & Scene Swaps';
const PAGE_DESCRIPTION =
  'Ready-to-use Genjutsu prompts for swapping characters, outfits, scenes, and props while keeping the original video motion.';

function GenjutsuPromptsPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 md:px-5">
        <div className="container mx-auto px-4">
          <p className="text-foreground/60 text-center text-sm">
            <Link
              href="/"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Genjutsu AI
            </Link>
            <span className="mx-2">/</span>
            <span>Prompt ideas</span>
          </p>
          <h1 className="text-foreground mx-auto mt-4 max-w-3xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Genjutsu Prompt Ideas
          </h1>
          <p className="text-foreground/70 mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed sm:text-lg">
            Copy a prompt, upload your clip on the{' '}
            <Link
              href="/#hero-generator"
              className="text-primary underline-offset-4 hover:underline"
            >
              homepage generator
            </Link>
            , and rewrite who or what is in the shot while keeping the original
            motion.
          </p>

          <div className="mx-auto mt-12 grid max-w-[1180px] gap-8 sm:grid-cols-2">
            {GENJUTSU_PROMPT_IDEAS.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
              >
                <h2 className="text-foreground text-lg font-semibold">
                  {item.title}
                </h2>
                <p className="text-foreground/65 mt-3 text-sm leading-relaxed">
                  {item.prompt}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-14 flex justify-center">
            <Link
              href="/#hero-generator"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-6 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105"
            >
              Open the generator
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/genjutsu-prompts')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const urlFor = (loc: string) => {
      const base = envConfigs.app_url || 'http://localhost:3000';
      return localizeUrl(new URL('/genjutsu-prompts', base).href, {
        locale: loc as 'en' | 'zh',
      }).href;
    };
    return {
      meta: [
        { title: PAGE_TITLE },
        { name: 'description', content: PAGE_DESCRIPTION },
        { property: 'og:title', content: PAGE_TITLE },
        { property: 'og:description', content: PAGE_DESCRIPTION },
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
  component: GenjutsuPromptsPage,
});
