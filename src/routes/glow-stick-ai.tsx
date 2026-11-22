import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  CheckCircle2,
  Film,
  ImageIcon,
  Music,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

import { resolveGlowStickAiProviderTarget } from '@/modules/glow-stick-ai/provider';
import { localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { GlowStickAiGeneratorPanel } from '@/components/landing/GlowStickAiGeneratorPanel';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const DATE_PUBLISHED = '2026-11-03';
const DATE_MODIFIED = '2026-11-03';
const GENERATOR_HREF = '#generator';
const DEMO_POSTER_PATH = '/videos/glow-stick-tpl-poster.jpg';

/** Visible FAQ + FAQPage JSON-LD must stay character-identical. */
const FAQ_ITEMS = [
  {
    question: 'What is the Glow Stick AI video trend?',
    answer:
      'A vertical sync-dance clip where three people wave glowing sticks in a dim studio. AI versions keep the choreography and light trails, then swap each dancer for someone from your photos.',
  },
  {
    question: 'How many photos do I need?',
    answer:
      'Three — one for the left dancer, one for center, one for right. Use clear, front-facing photos with permission from each person.',
  },
  {
    question: 'How do I make a Glow Stick style AI video?',
    answer:
      'Upload three photos in left / center / right order, generate the vertical clip on this page, then add audio you have the rights to before posting.',
  },
  {
    question: 'Can I use the original audio?',
    answer:
      'No. Use your own track or a licensed one. Pulling audio from the original clip is the fastest way to get a takedown.',
  },
  {
    question: 'What aspect ratio should I export?',
    answer:
      '9:16 vertical, about 10 seconds. Short single-beat clips travel furthest on Reels, TikTok, and Shorts.',
  },
] as const;

const HOW_STEPS = [
  {
    name: 'Upload three photos',
    text: 'Left, center, and right — one person each. Front-facing, even light, eyes open, at least 512 px on the short side.',
  },
  {
    name: 'Generate the sync dance',
    text: 'Keep the glow sticks, timing, and studio lighting from the template. The three faces map to the three dancers.',
  },
  {
    name: 'Add audio you have the rights to',
    text: "Use your own track or a licensed one. Don't rip the audio from the original clip.",
  },
  {
    name: 'Export vertical and post',
    text: '9:16, about 10 seconds. Caption with the trend name if you want discovery.',
  },
] as const;

const PHOTO_TIPS = [
  'Three faces — left, center, right',
  'Front-facing, eyes open',
  'Even light, no hard side shadows',
  '512 px minimum on the short side',
  'Permission from everyone in the photos',
] as const;

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function howToJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to make a Glow Stick style AI video',
    step: HOW_STEPS.map((step) => ({
      '@type': 'HowToStep',
      name: step.name,
      text: step.text,
    })),
  };
}

function articleJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Glow Stick AI Video: Sync Dance with Three Photos',
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    about: 'Glow Stick sync dance AI video trend',
  };
}

function GlowStickAiPage() {
  const { creditProvider, creditModel } = Route.useLoaderData();
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SeoJsonLd value={articleJsonLd()} />
      <SeoJsonLd value={howToJsonLd()} />
      <SeoJsonLd value={faqJsonLd()} />

      <SiteHeader />

      <div className="relative">
        <section className="mx-auto w-full max-w-7xl px-4 pt-8 pb-8 text-center md:px-5 md:pb-10">
          <div className="border-primary/20 bg-primary/10 text-primary mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
            <WandSparkles className="size-3.5" />
            {m['site.glow_stick.hero_badge']()}
          </div>

          <h1 className="text-foreground mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
            {m['site.glow_stick.hero_title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-base leading-7 sm:text-lg">
            {m['site.glow_stick.hero_desc']()}
          </p>

          <div id="generator" className="mt-8 scroll-mt-24 text-left sm:mt-10">
            <GlowStickAiGeneratorPanel
              creditProvider={creditProvider}
              creditModel={creditModel}
            />
          </div>
        </section>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-5">
        <section
          id="what-is-glow-stick"
          className="scroll-mt-24 py-14 md:py-20"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              What the Glow Stick AI video trend is
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                Three people stand in a dim studio and dance with glowing sticks
                — orange and blue light painting the floor and wall. What
                spreads is not the original faces but the effect: same
                choreography, same sticks, your cast.
              </p>
              <p>
                Upload one photo per dancer (left, center, right). Genjutsu
                keeps the motion and lighting from the template and restages
                each role around the likenesses you authorize.
              </p>
            </div>
            <figure className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <img
                src={DEMO_POSTER_PATH}
                alt="Glow Stick AI video trend: three dancers with glowing sticks in a dim studio"
                className="h-auto w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </section>

        <section id="how-to" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              How to make a Glow Stick style AI video
            </h2>
            <ol className="mt-8 space-y-6">
              {HOW_STEPS.map((step, index) => (
                <li key={step.name} className="flex gap-4">
                  <span className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-foreground text-base font-semibold">
                      {step.name}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm leading-7">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { icon: ImageIcon, label: '3 photos' },
                { icon: Film, label: '9:16 · ~10s' },
                { icon: Music, label: 'Your audio' },
                { icon: Sparkles, label: 'Sync sticks' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="border-border/60 bg-muted/30 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                >
                  <Icon className="size-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="photo-tips" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Photo tips that hold up
            </h2>
            <ul className="mt-6 space-y-3">
              {PHOTO_TIPS.map((tip) => (
                <li
                  key={tip}
                  className="text-muted-foreground flex items-start gap-2 text-sm leading-7 sm:text-base"
                >
                  <CheckCircle2 className="text-primary mt-1 size-4 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              FAQ
            </h2>
            <div className="mt-8 space-y-6">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question}>
                  <h3 className="text-foreground text-base font-semibold">
                    {item.question}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-7 sm:text-base">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              {m['site.glow_stick.cta_title']()}
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm leading-7">
              {m['site.glow_stick.cta_desc']()}
            </p>
            <ul className="text-muted-foreground mx-auto mt-5 max-w-md space-y-2 text-left text-sm">
              <li className="flex gap-2">
                <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                {m['site.glow_stick.cta_tip1']()}
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                {m['site.glow_stick.cta_tip2']()}
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                {m['site.glow_stick.cta_tip3']()}
              </li>
            </ul>
            <a
              href={GENERATOR_HREF}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-6 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105"
            >
              {m['site.glow_stick.hero_cta']()}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/glow-stick-ai')({
  beforeLoad: () => {
    if (getLocale() !== 'en') {
      throw redirect({
        href: '/glow-stick-ai',
        statusCode: 307,
        reloadDocument: true,
      });
    }
  },
  loader: () => {
    const locale = getLocale();
    const target = resolveGlowStickAiProviderTarget();
    return {
      locale,
      creditProvider: target.provider,
      creditModel: target.model,
    };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks('/glow-stick-ai', locale, [
      'en',
    ]);
    return {
      meta: [
        { title: m['site.glow_stick.page_title']() },
        {
          name: 'description',
          content: m['site.glow_stick.page_description'](),
        },
        ...socialMeta({
          title: m['site.glow_stick.page_title'](),
          description: m['site.glow_stick.page_description'](),
          url: canonical,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: GlowStickAiPage,
});
