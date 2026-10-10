import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { localeLinks, socialMeta } from '@/lib/seo';
import { getLocale } from '@/paraglide/runtime.js';
import { getLocalizedGenjutsuPromptIdeas } from '@/components/landing/genjutsu-prompts-i18n';
import { m } from '@/paraglide/messages.js';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';


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
            <span>{m['site.prompts.breadcrumb']()}</span>
          </p>
          <h1 className="text-foreground mx-auto mt-4 max-w-3xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
            {m['site.seo.ideas_title']()}
          </h1>
          <p className="text-foreground/70 mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed sm:text-lg">
            {m['site.prompts.description_before']()}{' '}
            <Link
              href="/#hero-generator"
              className="text-primary underline-offset-4 hover:underline"
            >
              {m['site.prompts.home_generator']()}
            </Link>
            {m['site.prompts.description_after']()}
          </p>

          <div className="mx-auto mt-12 grid max-w-[1180px] gap-8 sm:grid-cols-2">
            {getLocalizedGenjutsuPromptIdeas().map((item) => (
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
              {m['site.prompts.open']()}
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
    const { canonical, alternates } = localeLinks('/genjutsu-prompts', locale);
    return {
      meta: [
        { title: m['site.prompts.meta_title']() },
        { name: 'description', content: m['site.prompts.meta_description']() },
        ...socialMeta({
          title: m['site.prompts.meta_title'](),
          description: m['site.prompts.meta_description'](),
          url: canonical,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: GenjutsuPromptsPage,
});
