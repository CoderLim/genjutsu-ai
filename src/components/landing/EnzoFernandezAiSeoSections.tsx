import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.enzo.seo.step1_title'](),
    body: () => m['site.enzo.seo.step1_body'](),
  },
  {
    title: () => m['site.enzo.seo.step2_title'](),
    body: () => m['site.enzo.seo.step2_body'](),
  },
  {
    title: () => m['site.enzo.seo.step3_title'](),
    body: () => m['site.enzo.seo.step3_body'](),
  },
  {
    title: () => m['site.enzo.seo.step4_title'](),
    body: () => m['site.enzo.seo.step4_body'](),
  },
] as const;

const TIP_KEYS = [
  'site.enzo.seo.tip1',
  'site.enzo.seo.tip2',
  'site.enzo.seo.tip3',
  'site.enzo.seo.tip4',
  'site.enzo.seo.tip5',
] as const;

const USE_KEYS = [
  'site.enzo.seo.use1',
  'site.enzo.seo.use2',
  'site.enzo.seo.use3',
  'site.enzo.seo.use4',
  'site.enzo.seo.use5',
] as const;

const GIF_KEYS = [
  'site.enzo.seo.gif_li1',
  'site.enzo.seo.gif_li2',
  'site.enzo.seo.gif_li3',
  'site.enzo.seo.gif_li4',
] as const;

const FAQ_KEYS = [
  { q: 'site.enzo.seo.faq1_q', a: 'site.enzo.seo.faq1_a' },
  { q: 'site.enzo.seo.faq2_q', a: 'site.enzo.seo.faq2_a' },
  { q: 'site.enzo.seo.faq3_q', a: 'site.enzo.seo.faq3_a' },
  { q: 'site.enzo.seo.faq4_q', a: 'site.enzo.seo.faq4_a' },
  { q: 'site.enzo.seo.faq5_q', a: 'site.enzo.seo.faq5_a' },
  { q: 'site.enzo.seo.faq6_q', a: 'site.enzo.seo.faq6_a' },
  { q: 'site.enzo.seo.faq7_q', a: 'site.enzo.seo.faq7_a' },
] as const;

const EXPLORE_LINKS = [
  {
    label: () => m['site.enzo.seo.more_flying_car'](),
    href: '/flying-car-ai',
  },
  {
    label: () => m['site.enzo.seo.more_crazy'](),
    href: '/crazy-frog-ai',
  },
  {
    label: () => m['site.enzo.seo.more_a2o'](),
    href: '/a2o-lite-ai',
  },
  {
    label: () => m['site.enzo.seo.more_zombie'](),
    href: '/ai-zombie-hug',
  },
  {
    label: () => 'Day of the Dead AI Video',
    href: '/day-of-the-dead-ai-video',
  },
  {
    label: () => m['site.enzo.seo.more_hotel'](),
    href: '/hotel-lobby-ai',
  },
  { label: () => m['site.enzo.seo.more_home'](), href: '/' },
  { label: () => m['site.enzo.seo.more_pricing'](), href: '/pricing' },
] as const;

export function getEnzoFernandezAiFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

export function getEnzoFernandezAiHowToSteps() {
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

export function EnzoFernandezAiSeoSections() {
  return (
    <div className="text-left">
      <Section title={m['site.enzo.seo.what_title']()} tone="band">
        <p>{m['site.enzo.seo.what_p1']()}</p>
        <p>{m['site.enzo.seo.what_p2']()}</p>
      </Section>

      <Section title={m['site.enzo.seo.origin_title']()}>
        <p>{m['site.enzo.seo.origin_p1']()}</p>
      </Section>

      <Section id="how-to" title={m['site.enzo.seo.howto_title']()} tone="band">
        <ol className="mt-2 space-y-6">
          {HOW_STEPS.map((step, index) => (
            <li key={step.title()} className="list-none">
              <p className="text-xs font-semibold tracking-[0.16em] text-[rgb(204,144,92)] uppercase">
                {m['site.enzo.seo.step_label']({ n: String(index + 1) })}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white/88">
                {step.title()}
              </h3>
              <p className="mt-2 text-sm leading-7 text-white/45">
                {step.body()}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-white/88 sm:text-xl">
            {m['site.enzo.seo.tips_title']()}
          </h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-white/45 sm:text-base">
            {TIP_KEYS.map((key) => (
              <li key={key}>{m[key]()}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title={m['site.enzo.seo.uses_title']()}>
        <ul className="list-disc space-y-2 pl-5">
          {USE_KEYS.map((key) => (
            <li key={key}>{m[key]()}</li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-7 text-white/40 italic">
          {m['site.enzo.seo.uses_note']()}
        </p>
      </Section>

      <Section title={m['site.enzo.seo.gif_title']()} tone="band">
        <p>{m['site.enzo.seo.gif_intro']()}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          {GIF_KEYS.map((key) => (
            <li key={key}>{m[key]()}</li>
          ))}
        </ul>
      </Section>

      <Section title={m['site.enzo.seo.other_title']()}>
        <p>{m['site.enzo.seo.other_p1']()}</p>
      </Section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {m['site.enzo.seo.faq_title']()}
          </h2>
          <div className="mt-7 divide-y divide-white/7 rounded-2xl border border-white/8 bg-white/[0.02] px-5 sm:px-7">
            {getEnzoFernandezAiFaqItems().map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-white/82 sm:text-base">
                  {item.question}
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:pb-10">
        <div className="rounded-[26px] border border-white/8 bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.enzo.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.enzo.seo.more_intro']()}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {EXPLORE_LINKS.map((item) => (
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

      <p className="mx-auto max-w-5xl px-4 pb-14 text-center text-xs leading-6 text-white/30 md:px-5 md:pb-16">
        {m['site.enzo.seo.disclaimer']()}
      </p>
    </div>
  );
}
