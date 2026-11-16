import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.deckhalls.seo.step1_title'](),
    body: () => m['site.deckhalls.seo.step1_body'](),
  },
  {
    title: () => m['site.deckhalls.seo.step2_title'](),
    body: () => m['site.deckhalls.seo.step2_body'](),
  },
  {
    title: () => m['site.deckhalls.seo.step3_title'](),
    body: () => m['site.deckhalls.seo.step3_body'](),
  },
  {
    title: () => m['site.deckhalls.seo.step4_title'](),
    body: () => m['site.deckhalls.seo.step4_body'](),
  },
] as const;

const PHOTO_TIPS = [
  () => m['site.deckhalls.seo.tip1'](),
  () => m['site.deckhalls.seo.tip2'](),
  () => m['site.deckhalls.seo.tip3'](),
  () => m['site.deckhalls.seo.tip4'](),
  () => m['site.deckhalls.seo.tip5'](),
] as const;

const GLANCE_ITEMS = [
  {
    title: () => m['site.deckhalls.seo.glance_upload_title'](),
    body: () => m['site.deckhalls.seo.glance_upload_body'](),
  },
  {
    title: () => m['site.deckhalls.seo.glance_output_title'](),
    body: () => m['site.deckhalls.seo.glance_output_body'](),
  },
  {
    title: () => m['site.deckhalls.seo.glance_price_title'](),
    body: () => m['site.deckhalls.seo.glance_price_body'](),
  },
] as const;

/** Full on-page FAQ (6). Schema uses a shorter subset via getDeckTheHallsDanceAiFaqSchemaItems. */
const FAQ_KEYS = [
  { q: 'site.deckhalls.seo.faq1_q', a: 'site.deckhalls.seo.faq1_a' },
  { q: 'site.deckhalls.seo.faq2_q', a: 'site.deckhalls.seo.faq2_a' },
  { q: 'site.deckhalls.seo.faq3_q', a: 'site.deckhalls.seo.faq3_a' },
  { q: 'site.deckhalls.seo.faq4_q', a: 'site.deckhalls.seo.faq4_a' },
  { q: 'site.deckhalls.seo.faq5_q', a: 'site.deckhalls.seo.faq5_a' },
  { q: 'site.deckhalls.seo.faq6_q', a: 'site.deckhalls.seo.faq6_a' },
] as const;

/** FAQPage JSON-LD — keep to 3–5 entries; include photo-count (Solo/Duo). */
const FAQ_SCHEMA_KEYS = [
  FAQ_KEYS[0],
  FAQ_KEYS[1],
  FAQ_KEYS[2],
  FAQ_KEYS[3],
  FAQ_KEYS[4],
] as const;

const RELATED_TEMPLATES = [
  {
    label: () => m['site.deckhalls.seo.related_caniride'](),
    href: '/can-i-ride-dance-ai',
  },
  {
    label: () => m['site.deckhalls.seo.related_gas'](),
    href: '/gas-station-dance-ai',
  },
  {
    label: () => m['site.deckhalls.seo.related_gangnam'](),
    href: '/gangnam-style-ai',
  },
  {
    label: () => m['site.deckhalls.seo.related_crazy'](),
    href: '/crazy-frog-ai',
  },
  {
    label: () => m['site.deckhalls.seo.related_smalltown'](),
    href: '/smalltown-boy-dance',
  },
  {
    label: () => m['site.deckhalls.seo.related_home'](),
    href: '/',
  },
] as const;

export function getDeckTheHallsDanceAiFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

export function getDeckTheHallsDanceAiFaqSchemaItems() {
  return FAQ_SCHEMA_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

export function getDeckTheHallsDanceAiHowToSteps() {
  return HOW_STEPS.map((step) => ({
    name: step.title(),
    text: step.body(),
  }));
}

function Section({
  id,
  title,
  children,
  tone = 'plain',
}: {
  id?: string;
  title: string;
  children: ReactNode;
  tone?: 'plain' | 'band';
}) {
  const inner = (
    <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <div className="mt-5 max-w-3xl space-y-4 text-sm leading-7 text-white/48 sm:text-base">
        {children}
      </div>
    </div>
  );

  if (tone === 'band') {
    return (
      <section id={id} className="border-y border-white/7 bg-white/[0.018]">
        {inner}
      </section>
    );
  }

  return <section id={id}>{inner}</section>;
}

export function DeckTheHallsDanceAiIntroCopy() {
  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-3 text-left text-sm leading-7 text-white/48 sm:text-base">
      <p>{m['site.deckhalls.seo.intro_p1']()}</p>
    </div>
  );
}

export function DeckTheHallsDanceAiSeoSections() {
  return (
    <div className="text-left">
      <Section
        id="quick-answer"
        title={m['site.deckhalls.seo.quick_title']()}
        tone="band"
      >
        <p>{m['site.deckhalls.seo.quick_body']()}</p>
      </Section>

      <Section id="what-is" title={m['site.deckhalls.seo.what_title']()}>
        <p>{m['site.deckhalls.seo.what_body']()}</p>
      </Section>

      <Section
        id="song-disambig"
        title={m['site.deckhalls.seo.song_title']()}
        tone="band"
      >
        <p>{m['site.deckhalls.seo.song_body']()}</p>
      </Section>

      <Section id="how-to" title={m['site.deckhalls.seo.howto_title']()}>
        <ol className="mt-2 space-y-8">
          {HOW_STEPS.map((step) => (
            <li key={step.title()} className="list-none">
              <h3 className="text-lg font-semibold text-white/88">
                {step.title()}
              </h3>
              <p className="mt-2 text-sm leading-7 text-white/45 sm:text-base">
                {step.body()}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="controls"
        title={m['site.deckhalls.seo.controls_title']()}
        tone="band"
      >
        <p>{m['site.deckhalls.seo.controls_body']()}</p>
      </Section>

      <Section id="tiktok" title={m['site.deckhalls.seo.tiktok_title']()}>
        <p>{m['site.deckhalls.seo.tiktok_body']()}</p>
        <div className="mx-auto mt-10 max-w-sm overflow-hidden rounded-[20px] border border-white/10 bg-black/25 p-2.5">
          <video
            src="/videos/deck-the-halls-dance-duo-tpl.mp4"
            poster="/videos/deck-the-halls-dance-duo-tpl-poster.jpg"
            title={m['site.deckhalls.seo.sample_title']()}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-full rounded-xl bg-black object-contain"
          />
        </div>
        <p className="mt-4 text-center text-sm text-white/40">
          {m['site.deckhalls.seo.sample_caption']()}
        </p>
      </Section>

      <Section
        id="photo-tips"
        title={m['site.deckhalls.seo.tips_title']()}
        tone="band"
      >
        <ul className="mt-2 list-disc space-y-3 pl-5 marker:text-white/30">
          {PHOTO_TIPS.map((item) => (
            <li key={item()}>{item()}</li>
          ))}
        </ul>
      </Section>

      <Section id="glance" title={m['site.deckhalls.seo.glance_title']()}>
        <div className="space-y-6">
          {GLANCE_ITEMS.map((item) => (
            <div key={item.title()}>
              <h3 className="text-lg font-semibold text-white/88">
                {item.title()}
              </h3>
              <p className="mt-2 text-sm leading-7 text-white/45 sm:text-base">
                {item.body()}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {m['site.deckhalls.seo.faq_title']()}
          </h2>
          <div className="mt-7 space-y-8">
            {getDeckTheHallsDanceAiFaqItems().map((item) => (
              <div key={item.question} className="max-w-3xl">
                <h3 className="text-lg font-semibold text-white/88">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/45 sm:text-base">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:pb-16">
        <p className="max-w-3xl text-sm leading-7 text-white/40">
          {m['site.deckhalls.seo.legal']()}
        </p>
        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.deckhalls.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.deckhalls.seo.more_intro']()}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {RELATED_TEMPLATES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition hover:border-[rgba(204,144,92,0.35)] hover:text-[rgb(220,155,99)]"
              >
                {item.label()}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
