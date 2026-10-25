import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.gasstation.seo.step1_title'](),
    body: () => m['site.gasstation.seo.step1_body'](),
  },
  {
    title: () => m['site.gasstation.seo.step2_title'](),
    body: () => m['site.gasstation.seo.step2_body'](),
  },
  {
    title: () => m['site.gasstation.seo.step3_title'](),
    body: () => m['site.gasstation.seo.step3_body'](),
  },
] as const;

const ORIGIN_H3 = [
  {
    title: () => m['site.gasstation.seo.origin_h3_1'](),
    body: () => m['site.gasstation.seo.origin_p1'](),
  },
  {
    title: () => m['site.gasstation.seo.origin_h3_2'](),
    body: () => m['site.gasstation.seo.origin_p2'](),
  },
  {
    title: () => m['site.gasstation.seo.origin_h3_3'](),
    body: () => m['site.gasstation.seo.origin_p3'](),
  },
] as const;

const PHOTO_TIPS = [
  () => m['site.gasstation.seo.tip1'](),
  () => m['site.gasstation.seo.tip2'](),
  () => m['site.gasstation.seo.tip3'](),
  () => m['site.gasstation.seo.tip4'](),
  () => m['site.gasstation.seo.tip5'](),
] as const;

const PROBLEM_ITEMS = [
  {
    title: () => m['site.gasstation.seo.problem1_title'](),
    body: () => m['site.gasstation.seo.problem1_body'](),
  },
  {
    title: () => m['site.gasstation.seo.problem2_title'](),
    body: () => m['site.gasstation.seo.problem2_body'](),
  },
  {
    title: () => m['site.gasstation.seo.problem3_title'](),
    body: () => m['site.gasstation.seo.problem3_body'](),
  },
  {
    title: () => m['site.gasstation.seo.problem4_title'](),
    body: () => m['site.gasstation.seo.problem4_body'](),
  },
] as const;

const FAQ_KEYS = [
  { q: 'site.gasstation.seo.faq1_q', a: 'site.gasstation.seo.faq1_a' },
  { q: 'site.gasstation.seo.faq2_q', a: 'site.gasstation.seo.faq2_a' },
  { q: 'site.gasstation.seo.faq3_q', a: 'site.gasstation.seo.faq3_a' },
  { q: 'site.gasstation.seo.faq4_q', a: 'site.gasstation.seo.faq4_a' },
  { q: 'site.gasstation.seo.faq5_q', a: 'site.gasstation.seo.faq5_a' },
  { q: 'site.gasstation.seo.faq6_q', a: 'site.gasstation.seo.faq6_a' },
  { q: 'site.gasstation.seo.faq7_q', a: 'site.gasstation.seo.faq7_a' },
] as const;

const RELATED_TEMPLATES = [
  {
    label: () => m['site.gasstation.seo.related_sayitright'](),
    href: '/say-it-right-ai',
  },
  {
    label: () => m['site.gasstation.seo.related_gangnam'](),
    href: '/gangnam-style-ai',
  },
  {
    label: () => m['site.gasstation.seo.related_crazy'](),
    href: '/crazy-frog-ai',
  },
  {
    label: () => m['site.gasstation.seo.related_a2o'](),
    href: '/a2o-lite-ai',
  },
  {
    label: () => m['site.gasstation.seo.related_smalltown'](),
    href: '/smalltown-boy-dance',
  },
  {
    label: () => m['site.gasstation.seo.related_home'](),
    href: '/',
  },
] as const;

const COMPARE_HEADERS = [
  () => m['site.gasstation.seo.compare_col_gen'](),
  () => m['site.gasstation.seo.compare_col_capcut'](),
  () => m['site.gasstation.seo.compare_col_general'](),
] as const;

const COMPARE_ROWS = [
  [
    () => m['site.gasstation.seo.compare_r1_label'](),
    () => m['site.gasstation.seo.compare_r1_gen'](),
    () => m['site.gasstation.seo.compare_r1_capcut'](),
    () => m['site.gasstation.seo.compare_r1_general'](),
  ],
  [
    () => m['site.gasstation.seo.compare_r2_label'](),
    () => m['site.gasstation.seo.compare_r2_gen'](),
    () => m['site.gasstation.seo.compare_r2_capcut'](),
    () => m['site.gasstation.seo.compare_r2_general'](),
  ],
  [
    () => m['site.gasstation.seo.compare_r3_label'](),
    () => m['site.gasstation.seo.compare_r3_gen'](),
    () => m['site.gasstation.seo.compare_r3_capcut'](),
    () => m['site.gasstation.seo.compare_r3_general'](),
  ],
  [
    () => m['site.gasstation.seo.compare_r4_label'](),
    () => m['site.gasstation.seo.compare_r4_gen'](),
    () => m['site.gasstation.seo.compare_r4_capcut'](),
    () => m['site.gasstation.seo.compare_r4_general'](),
  ],
] as const;

export function getGasStationDanceAiFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

export function getGasStationDanceAiHowToSteps() {
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

export function GasStationDanceAiIntroCopy() {
  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-3 text-left text-sm leading-7 text-white/48 sm:text-base">
      <p>{m['site.gasstation.seo.intro_p1']()}</p>
      <p>{m['site.gasstation.seo.intro_p2']()}</p>
    </div>
  );
}

export function GasStationDanceAiSeoSections() {
  return (
    <div className="text-left">
      <Section
        id="trend"
        title={m['site.gasstation.seo.trend_title']()}
        tone="band"
      >
        <p>{m['site.gasstation.seo.trend_lead']()}</p>
        <div className="mt-8 space-y-8">
          {ORIGIN_H3.map((item) => (
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
        <div className="mx-auto mt-10 max-w-sm overflow-hidden rounded-[20px] border border-white/10 bg-black/25 p-2.5">
          <video
            src="/videos/long-trival-tpl.mp4"
            poster="/videos/long-trival-tpl-poster.jpg"
            title={m['site.gasstation.seo.sample_title']()}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-full rounded-xl bg-black object-contain"
          />
        </div>
        <p className="mt-4 text-center text-sm text-white/40">
          {m['site.gasstation.seo.sample_caption']()}
        </p>
      </Section>

      <Section id="how-it-works" title={m['site.gasstation.seo.howto_title']()}>
        <p>{m['site.gasstation.seo.howto_intro']()}</p>
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
        id="three-shots"
        title={m['site.gasstation.seo.shots_title']()}
        tone="band"
      >
        <p>{m['site.gasstation.seo.shots_body']()}</p>
      </Section>

      <Section id="credits" title={m['site.gasstation.seo.credits_title']()}>
        <p>{m['site.gasstation.seo.credits_body']()}</p>
      </Section>

      <Section
        id="compare"
        title={m['site.gasstation.seo.compare_title']()}
        tone="band"
      >
        <p>{m['site.gasstation.seo.compare_intro']()}</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm text-white/55">
            <thead>
              <tr className="border-b border-white/10 text-white/80">
                <th className="py-3 pr-4 font-medium" />
                {COMPARE_HEADERS.map((header) => (
                  <th key={header()} className="py-3 pr-4 font-medium">
                    {header()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr
                  key={row[0]()}
                  className="border-b border-white/7 align-top"
                >
                  <th className="py-3 pr-4 font-medium text-white/70">
                    {row[0]()}
                  </th>
                  <td className="py-3 pr-4">{row[1]()}</td>
                  <td className="py-3 pr-4">{row[2]()}</td>
                  <td className="py-3 pr-4">{row[3]()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="photo-tips" title={m['site.gasstation.seo.tips_title']()}>
        <p>{m['site.gasstation.seo.tips_intro']()}</p>
        <ul className="mt-2 list-disc space-y-3 pl-5 marker:text-white/30">
          {PHOTO_TIPS.map((item) => (
            <li key={item()}>{item()}</li>
          ))}
        </ul>
      </Section>

      <Section
        id="problems"
        title={m['site.gasstation.seo.problems_title']()}
        tone="band"
      >
        <div className="space-y-6">
          {PROBLEM_ITEMS.map((item) => (
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
            {m['site.gasstation.seo.faq_title']()}
          </h2>
          <div className="mt-7 space-y-8">
            {getGasStationDanceAiFaqItems().map((item) => (
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
        <div className="rounded-[26px] border border-white/8 bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.gasstation.seo.cta_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.gasstation.seo.cta_body']()}
          </p>
          <a
            href="#generator"
            className="mt-5 inline-flex rounded-full border border-[rgba(204,144,92,0.45)] bg-[rgba(120,87,60,0.55)] px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-[rgba(140,100,70,0.7)]"
          >
            {m['site.gasstation.seo.cta_button']()}
          </a>
        </div>

        <p className="mt-10 max-w-3xl text-sm leading-7 text-white/40">
          {m['site.gasstation.seo.legal']()}
        </p>
        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.gasstation.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.gasstation.seo.more_intro']()}
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
