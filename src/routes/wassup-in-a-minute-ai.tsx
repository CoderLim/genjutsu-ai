import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  CheckCircle2,
  Film,
  ImageIcon,
  Music,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { resolveWassupInAMinuteAiProviderTarget } from '@/modules/wassup-in-a-minute-ai/provider';
import { getWassupInAMinuteAiSeoPriceAmounts } from '@/modules/wassup-in-a-minute-ai/seo-pricing';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { WassupInAMinuteGeneratorPanel } from '@/components/landing/WassupInAMinuteGeneratorPanel';
import { SeoJsonLd } from '@/components/seo-json-ld';

const PAGE_PATH = '/wassup-in-a-minute-ai';
const GENERATOR_HREF = '#generator';
const DEMO_POSTER_PATH = '/videos/wassup-in-a-minute-ai-tpl-poster.jpg';
const OG_IMAGE = DEMO_POSTER_PATH;

const VARIANT_LINKS = [
  { label: 'Crazy Frog chase video', href: '/crazy-frog-ai' },
  { label: 'Tiny Desk AI', href: '/tiny-desk-ai' },
  { label: 'Gas station dance AI', href: '/gas-station-dance-ai' },
  { label: 'Gangnam Style AI', href: '/gangnam-style-ai' },
  { label: 'Kairo bad times', href: '/kairo-bad-times' },
  { label: 'Smalltown boy dance', href: '/smalltown-boy-dance' },
] as const;

const ALT_LINKS = [
  { label: 'Video face swap', href: '/video-face-swap' },
  { label: 'Live face swap', href: '/live-face-swap' },
  { label: 'A2O Lite AI', href: '/a2o-lite-ai' },
] as const;

const EXPLORE_LINKS = [
  ...VARIANT_LINKS,
  { label: 'Genjutsu prompt library', href: '/genjutsu-prompts' },
  { label: 'Credit packs', href: '/pricing' },
] as const;

const EXAMPLE_CARDS = [
  {
    title: 'Center only',
    body: 'Fill the middle slot — the left and right dancers stay from the template.',
    meta: '1 photo · ~15 s · 16:9',
    image: '/images/demos/wassup-in-a-minute-ai/example-center.jpg',
    alt: 'Wassup in a Minute AI example: only the center person swapped',
    width: 1200,
    height: 900,
  },
  {
    title: 'Two friends',
    body: 'Fill left + right — only the side dancers swap; the center stays from the template.',
    meta: '2 photos · ~15 s · 16:9',
    image: '/images/demos/wassup-in-a-minute-ai/example-sides.jpg',
    alt: 'Wassup in a Minute AI example: left and right people swapped',
    width: 1200,
    height: 687,
  },
  {
    title: 'Full trio',
    body: 'Fill all three slots to restage the whole hillside sway cast.',
    meta: '3 photos · ~15 s · 16:9',
    image: '/images/demos/wassup-in-a-minute-ai/example-trio.jpg',
    alt: 'Wassup in a Minute AI example: all three people swapped',
    width: 1200,
    height: 900,
  },
] as const;

function faqItems() {
  const price = getWassupInAMinuteAiSeoPriceAmounts();
  return [
    {
      question: 'What is the wassup in a minute trend?',
      answer:
        'A sync-sway meme: three people bounce side to side outdoors on a grassy hillside. This tool keeps that motion from a fixed template and swaps who is in each slot from your photos.',
    },
    {
      question: 'Where does the name come from?',
      answer:
        'From a misheard lyric — “wassup, been a minute” — that travelers often write as wassup in a minute, wasala in a minute, or wassup been a minute.',
    },
    {
      question: 'Do I need to upload my own swaying clip?',
      answer:
        'No. The page already loads the fixed template. You only upload 1–3 photos into the left, center, or right slots.',
    },
    {
      question: 'Can I fill only the center slot?',
      answer:
        'Yes. Sparse slots are supported — fill only the people you want to replace; empty slots keep the original cast.',
    },
    {
      question: 'How much does it cost?',
      answer: `Credit packs start at ${price.starterPrice} one-time. A full ~15 s 720p run is about ${price.credits720} credits (around ${price.usd720} at the Creator pack rate). The generate button shows the exact cost before you confirm.`,
    },
    {
      question: 'How long does it take?',
      answer: 'A few minutes per run, depending on queue.',
    },
    {
      question:
        'Is this official or affiliated with Drake or the original creators?',
      answer:
        'No. It is an independent tool inspired by the trend. Use photos of yourself or people who agreed, and pick audio from your platform’s licensed library when you post.',
    },
  ] as const;
}

const HOW_STEPS = [
  {
    name: 'Fill one or more slots',
    text: 'Left, center, and right match the three people in the template. Skip any slot you want to leave unchanged.',
  },
  {
    name: 'Pick resolution and generate',
    text: '480p or 720p. Check the credit cost on the button, then run. Preview uses a short 4s trim at 480p.',
  },
  {
    name: 'Download the landscape MP4',
    text: 'Output is about 15 seconds at 16:9. Crop for vertical feeds if you need TikTok or Reels.',
  },
  {
    name: 'Add licensed audio before you post',
    text: 'Use a track from the platform library or audio you own. Do not rip audio from someone else’s clip.',
  },
] as const;

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems().map((item) => ({
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
    name: 'How to make a Wassup in a Minute AI video',
    totalTime: 'PT5M',
    step: HOW_STEPS.map((step) => ({
      '@type': 'HowToStep',
      name: step.name,
      text: step.text,
    })),
  };
}

function breadcrumbJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Motion templates',
        item: absoluteUrl('/#templates'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Wassup in a Minute AI',
        item: canonical,
      },
    ],
  };
}

function softwareApplicationJsonLd(canonical: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Wassup in a Minute AI Video Generator',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      description:
        'Generation uses Genjutsu AI credits; cost is shown before you confirm',
    },
    url: canonical,
    description: m['site.wassup.page_description'](),
    image: absoluteUrl(OG_IMAGE),
  };
}

function WassupInAMinuteAiPage() {
  const { creditProvider, creditModel } = Route.useLoaderData();
  const price = getWassupInAMinuteAiSeoPriceAmounts();
  const faqs = faqItems();
  const { canonical } = localeLinks(PAGE_PATH, getLocale(), ['en']);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={howToJsonLd()} />
      <SeoJsonLd value={breadcrumbJsonLd(canonical)} />
      <SeoJsonLd value={softwareApplicationJsonLd(canonical)} />

      <SiteHeader />

      <div className="relative">
        <section className="mx-auto w-full max-w-7xl px-4 pt-8 pb-8 text-center md:px-5 md:pb-10">
          <div className="border-primary/20 bg-primary/10 text-primary mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
            <WandSparkles className="size-3.5" />
            {m['site.wassup.hero_badge']()}
          </div>

          <h1 className="text-foreground mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
            {m['site.wassup.hero_title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-base leading-7 sm:text-lg">
            {m['site.wassup.hero_desc']()}
          </p>
          <p className="text-muted-foreground/80 mx-auto mt-3 max-w-2xl text-sm leading-6">
            {m['site.wassup.hero_meta']({
              starterPrice: price.starterPrice,
              credits720: String(price.credits720),
            })}
          </p>
          <p className="text-muted-foreground/70 mx-auto mt-4 max-w-3xl text-xs leading-5">
            {m['site.wassup.disclaimer']()}
          </p>

          <div id="generator" className="mt-8 scroll-mt-24 text-left sm:mt-10">
            <WassupInAMinuteGeneratorPanel
              creditProvider={creditProvider}
              creditModel={creditModel}
            />
          </div>
        </section>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-5">
        <section id="examples" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Example results
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              AI-made, results vary run to run.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {EXAMPLE_CARDS.map((card) => (
                <article key={card.title} className="text-left">
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={card.image}
                      alt={card.alt}
                      width={card.width}
                      height={card.height}
                      className="aspect-video w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <h3 className="text-foreground mt-3 text-base font-semibold">
                    {card.title}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    {card.body}
                  </p>
                  <p className="text-muted-foreground/70 mt-2 text-xs">
                    {card.meta}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="what-is" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              What Is the Wassup in a Minute Trend?
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                The wassup in a minute trend is a sync-sway clip: three people
                bounce side to side on a grassy hillside with a lake and
                mountains behind them. The hook is the shared bounce and timing
                — not a white-background animation.
              </p>
              <p>
                The name comes from a misheard lyric (“wassup, been a minute”)
                that also travels as wassup been a minute, wasala in a minute,
                or in a minute wassup. This page uses a fixed outdoor trio
                template so the sway stays locked while you swap who stands in
                each slot.
              </p>
            </div>
            <figure className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <img
                src={DEMO_POSTER_PATH}
                alt="Wassup in a Minute AI template: three people swaying on a hillside"
                className="h-auto w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </section>

        <section id="why-template" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Why the Motion Comes From a Template, Not From a Prompt
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                One-photo filters invent movement, so the bounce drifts off the
                beat and bodies reshape between frames. Here the source of truth
                is the fixed clip: the tool follows the sway, camera, and
                hillside framing, then repaints only the slots you filled from
                your reference photos.
              </p>
            </div>
          </div>
        </section>

        <section id="how-to" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              How to Make a Wassup in a Minute Video
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
                { icon: ImageIcon, label: '1–3 photos' },
                { icon: Film, label: '16:9 · ~15s' },
                { icon: Music, label: 'Your audio' },
                { icon: Sparkles, label: 'Sparse slots' },
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
              What Makes a Good Reference Photo
            </h2>
            <ul className="mt-6 space-y-3">
              {[
                'One adult per photo, face toward the camera, sharp and evenly lit',
                'Knees-up or full body beats a tight selfie',
                'No sunglasses or heavy hood if you want hair to carry over',
                'Use only photos of yourself or someone who agreed',
              ].map((tip) => (
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

        <section id="also-called" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Also Called: Wassup Been a Minute, In a Minute Wassup, Wasala in a
              Minute
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                The sound is a misheard lyric, so the trend travels under
                several spellings: wassup been a minute, in a minute wassup,
                wasala in a minute, wassup sway, wassup in a min. They all point
                to the same clip shape — outdoor sync sway, shared bounce,
                people swapping in and out. If you searched any of those, this
                page is the tool for it.
              </p>
            </div>
          </div>
        </section>

        <section id="variants" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Variants People Are Making
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
              Solo center swap · two friends · full trio · same sway with a
              mascot or product character in one slot. Nearby motion templates:
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {VARIANT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-foreground underline underline-offset-2"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="alt-tools" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Not the right scene?
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
              If you need a different face-swap workflow, try these instead:
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {ALT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-foreground underline underline-offset-2"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Wassup in a Minute FAQ
            </h2>
            <div className="mt-8 space-y-6">
              {faqs.map((item) => (
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

        <section id="explore" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Explore More AI Video Templates
            </h2>
            <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-foreground underline underline-offset-2"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              {m['site.wassup.cta_title']()}
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm leading-7">
              {m['site.wassup.cta_desc']()}
            </p>
            <a
              href={GENERATOR_HREF}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-6 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105"
            >
              {m['site.wassup.hero_cta']()}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/wassup-in-a-minute-ai')({
  beforeLoad: () => {
    if (getLocale() !== 'en') {
      throw redirect({
        href: '/wassup-in-a-minute-ai',
        statusCode: 307,
        reloadDocument: true,
      });
    }
  },
  loader: () => {
    const locale = getLocale();
    const target = resolveWassupInAMinuteAiProviderTarget();
    return {
      creditProvider: target.provider,
      creditModel: target.model,
      locale,
      title: m['site.wassup.page_title']({}, { locale }),
      description: m['site.wassup.page_description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks(
      '/wassup-in-a-minute-ai',
      locale,
      ['en']
    );
    const title =
      loaderData?.title ?? m['site.wassup.page_title']({}, { locale });
    const description =
      loaderData?.description ??
      m['site.wassup.page_description']({}, { locale });
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...socialMeta({
          title,
          description,
          url: canonical,
          image: absoluteUrl(OG_IMAGE),
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: WassupInAMinuteAiPage,
});
