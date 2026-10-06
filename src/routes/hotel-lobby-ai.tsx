import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, Film, Images, WandSparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { localeLinks, socialMeta } from '@/lib/seo';
import { getLocale } from '@/paraglide/runtime.js';
import { HotelLobbyGeneratorPanel } from '@/components/landing/HotelLobbyGeneratorPanel';
import { SiteHeader } from '@/components/landing/SiteHeader';

const PAGE_TITLE = 'Hotel Lobby AI Video Generator — MiniMax H3';
const PAGE_DESCRIPTION =
  'Create Hotel Lobby AI videos with a reference clip and character images. Preserve the original motion, camera, timing, and lobby scene with MiniMax H3.';

const STEPS = [
  {
    icon: Film,
    title: 'Add the lobby video',
    description:
      'Upload a 2–15 second clip. H3 uses it as the motion, timing, camera, and scene reference.',
  },
  {
    icon: Images,
    title: 'Add replacement references',
    description:
      'Upload the people, outfits, products, or visual references you want to bring into the clip.',
  },
  {
    icon: WandSparkles,
    title: 'Describe the replacement',
    description:
      'Tell H3 what to replace while asking it to preserve the original framing, lighting, and motion.',
  },
] as const;

function HotelLobbyAiPage() {
  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(154,91,55,0.22),transparent_38%),linear-gradient(to_bottom,rgba(13,10,9,0.5),hsl(28_25%_9%)_78%)]" />
          <div className="absolute top-24 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[rgba(204,144,92,0.055)] blur-3xl" />
        </div>

        <div className="relative z-20">
          <SiteHeader />
        </div>

        <main className="relative z-10">
          <section className="mx-auto max-w-7xl px-4 pt-14 pb-12 text-center sm:pt-20 md:px-5 md:pb-16">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-[rgba(204,144,92,0.2)] bg-[rgba(204,144,92,0.07)] px-3 py-1.5 text-xs font-medium text-[rgb(220,155,99)]">
              <WandSparkles className="size-3.5" />
              Powered by MiniMax H3 on fal
            </div>

            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              Hotel Lobby AI Video Generator
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              Recreate the viral hotel-lobby style with your own reference
              subjects. Keep the source video&apos;s motion, timing, camera,
              framing, and lobby scene while changing who or what appears in
              the shot.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {['5–15s output', 'Up to 9 images', '480P to 4K', '16:9 · 9:16 · adaptive'].map(
                (badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[11px] font-medium text-white/45"
                  >
                    {badge}
                  </span>
                )
              )}
            </div>

            <div id="generator" className="mt-8 text-left sm:mt-10">
              <HotelLobbyGeneratorPanel />
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:py-20">
            <div className="mx-auto mb-9 max-w-2xl text-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-[rgb(204,144,92)] uppercase">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Reference the motion. Replace the subjects.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/45 sm:text-base">
                MiniMax H3 can combine a motion video with multiple visual
                references in one generation.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-[rgba(204,144,92,0.1)] text-[rgb(220,155,99)]">
                        <Icon className="size-5" />
                      </span>
                      <span className="text-xs font-semibold text-white/18">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/42">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-4 pb-16 md:px-5 md:pb-24">
            <div className="grid gap-5 rounded-[28px] border border-white/8 bg-[rgba(255,255,255,0.025)] p-5 sm:p-7 md:grid-cols-[0.9fr_1.1fr] md:p-9">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-[rgb(204,144,92)] uppercase">
                  Prompt tip
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  Name the references by order
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/43">
                  H3 understands references as Video 1, Image 1, Image 2, and
                  so on. Explicit mapping is especially useful when a lobby
                  clip contains multiple people.
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/20 p-4 sm:p-5">
                <p className="text-sm leading-6 text-white/66">
                  “Replace the two people in Video 1 with Image 1 and Image 2.
                  Preserve the original motion, timing, camera movement,
                  framing, lighting, and hotel lobby scene.”
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-white/32">
                  <CheckCircle2 className="size-3.5 text-[rgb(204,144,92)]" />
                  Prompt expansion is disabled for more literal replacement
                  instructions.
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-4xl px-4 pb-20 text-center md:px-5">
            <div className="rounded-[28px] border border-[rgba(204,144,92,0.15)] bg-[rgba(204,144,92,0.055)] px-5 py-9 sm:px-8">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Ready to make your version?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">
                Start with a short source clip and clear reference images for
                the most consistent result.
              </p>
              <a
                href="#generator"
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[rgb(204,144,92)] px-4 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Open generator
                <ArrowRight className="size-4" />
              </a>
            </div>
          </section>
        </main>
      </div>

      <footer className="border-t border-white/7 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center text-xs text-white/32 sm:flex-row sm:text-left md:px-5">
          <p>© 2026 {envConfigs.app_name}. Only upload media you have the right to use.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy-policy" className="transition hover:text-white/65">
              Privacy
            </Link>
            <Link href="/terms-of-service" className="transition hover:text-white/65">
              Terms
            </Link>
            <Link href="/refund-policy" className="transition hover:text-white/65">
              Refunds
            </Link>
            <a
              href={`mailto:${envConfigs.app_support_email}`}
              className="transition hover:text-white/65"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const Route = createFileRoute('/hotel-lobby-ai')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks('/hotel-lobby-ai', locale);
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
    };
  },
  component: HotelLobbyAiPage,
});
