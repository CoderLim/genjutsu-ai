import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.caniride.seo.step1_title'](),
    body: () => m['site.caniride.seo.step1_body'](),
  },
  {
    title: () => m['site.caniride.seo.step2_title'](),
    body: () => m['site.caniride.seo.step2_body'](),
  },
  {
    title: () => m['site.caniride.seo.step3_title'](),
    body: () => m['site.caniride.seo.step3_body'](),
  },
  {
    title: () => m['site.caniride.seo.step4_title'](),
    body: () => m['site.caniride.seo.step4_body'](),
  },
  {
    title: () => m['site.caniride.seo.step5_title'](),
    body: () => m['site.caniride.seo.step5_body'](),
  },
  {
    title: () => m['site.caniride.seo.step6_title'](),
    body: () => m['site.caniride.seo.step6_body'](),
  },
] as const;

const TIMELINE = [
  () => m['site.caniride.seo.timeline1'](),
  () => m['site.caniride.seo.timeline2'](),
  () => m['site.caniride.seo.timeline3'](),
  () => m['site.caniride.seo.timeline4'](),
  () => m['site.caniride.seo.timeline5'](),
  () => m['site.caniride.seo.timeline6'](),
] as const;

const MAKE_ITEMS = [
  {
    title: () => m['site.caniride.seo.make_h3_1'](),
    body: () => m['site.caniride.seo.make_p1'](),
  },
  {
    title: () => m['site.caniride.seo.make_h3_2'](),
    body: () => m['site.caniride.seo.make_p2'](),
  },
  {
    title: () => m['site.caniride.seo.make_h3_3'](),
    body: () => m['site.caniride.seo.make_p3'](),
  },
] as const;

const PROBLEM_ITEMS = [
  {
    title: () => m['site.caniride.seo.problem1_title'](),
    body: () => m['site.caniride.seo.problem1_body'](),
  },
  {
    title: () => m['site.caniride.seo.problem2_title'](),
    body: () => m['site.caniride.seo.problem2_body'](),
  },
  {
    title: () => m['site.caniride.seo.problem3_title'](),
    body: () => m['site.caniride.seo.problem3_body'](),
  },
  {
    title: () => m['site.caniride.seo.problem4_title'](),
    body: () => m['site.caniride.seo.problem4_body'](),
  },
] as const;

const FAQ_KEYS = [
  { q: 'site.caniride.seo.faq1_q', a: 'site.caniride.seo.faq1_a' },
  { q: 'site.caniride.seo.faq2_q', a: 'site.caniride.seo.faq2_a' },
  { q: 'site.caniride.seo.faq3_q', a: 'site.caniride.seo.faq3_a' },
  { q: 'site.caniride.seo.faq4_q', a: 'site.caniride.seo.faq4_a' },
  { q: 'site.caniride.seo.faq5_q', a: 'site.caniride.seo.faq5_a' },
  { q: 'site.caniride.seo.faq6_q', a: 'site.caniride.seo.faq6_a' },
  { q: 'site.caniride.seo.faq7_q', a: 'site.caniride.seo.faq7_a' },
  { q: 'site.caniride.seo.faq8_q', a: 'site.caniride.seo.faq8_a' },
  { q: 'site.caniride.seo.faq9_q', a: 'site.caniride.seo.faq9_a' },
] as const;

const RELATED_TEMPLATES = [
  {
    label: () => m['site.caniride.seo.related_gas'](),
    href: '/gas-station-dance-ai',
  },
  {
    label: () => m['site.caniride.seo.related_chipmunks'](),
    href: '/chipmunks-dance',
  },
  {
    label: () => m['site.caniride.seo.related_smalltown'](),
    href: '/smalltown-boy-dance',
  },
  {
    label: () => m['site.caniride.seo.related_deckhalls'](),
    href: '/deck-the-halls-dance-ai',
  },
  {
    label: () => m['site.caniride.seo.related_gangnam'](),
    href: '/gangnam-style-ai',
  },
  {
    label: () => m['site.caniride.seo.related_home'](),
    href: '/',
  },
  {
    label: () => m['site.caniride.seo.related_pricing'](),
    href: '/pricing',
  },
] as const;

export function getCanIRideDanceAiFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

export function getCanIRideDanceAiFaqSchemaItems() {
  return getCanIRideDanceAiFaqItems();
}

export function getCanIRideDanceAiHowToSteps() {
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

export function CanIRideDanceAiIntroCopy() {
  return null;
}

export function CanIRideDanceAiSeoSections() {
  return (
    <div className="text-left">
      <Section id="what-is" title={m['site.caniride.seo.what_title']()}>
        <p>{m['site.caniride.seo.what_body']()}</p>
      </Section>

      <Section
        id="origin"
        title={m['site.caniride.seo.origin_title']()}
        tone="band"
      >
        <h3 className="text-lg font-semibold text-white/88">
          {m['site.caniride.seo.origin_h3']()}
        </h3>
        <ol className="mt-4 list-decimal space-y-3 pl-5 marker:text-white/35">
          {TIMELINE.map((item) => (
            <li key={item()}>{item()}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-white/35">
          {m['site.caniride.seo.origin_note']()}
        </p>
      </Section>

      <Section id="how-to" title={m['site.caniride.seo.howto_title']()}>
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
        id="make-ai"
        title={m['site.caniride.seo.make_title']()}
        tone="band"
      >
        <div className="space-y-8">
          {MAKE_ITEMS.map((item) => (
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

      <Section id="song" title={m['site.caniride.seo.song_title']()}>
        <p>{m['site.caniride.seo.song_body']()}</p>
        <div className="mx-auto mt-10 max-w-sm overflow-hidden rounded-[20px] border border-white/10 bg-black/25 p-2.5">
          <video
            src="/videos/can-i-ride-dance-duo-tpl.mp4"
            poster="/videos/can-i-ride-dance-duo-tpl-poster.jpg"
            title={m['site.caniride.seo.sample_title']()}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-full rounded-xl bg-black object-contain"
          />
        </div>
        <p className="mt-4 text-center text-sm text-white/40">
          {m['site.caniride.seo.sample_caption']()}
        </p>
      </Section>

      <Section
        id="solo-or-duo"
        title={m['site.caniride.seo.compare_title']()}
        tone="band"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm text-white/55">
            <thead>
              <tr className="border-b border-white/10 text-white/80">
                <th className="py-3 pr-4 font-semibold" />
                <th className="py-3 pr-4 font-semibold">
                  {m['site.caniride.seo.compare_duo']()}
                </th>
                <th className="py-3 font-semibold">
                  {m['site.caniride.seo.compare_solo']()}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/7">
                <th className="py-3 pr-4 font-medium text-white/70">
                  {m['site.caniride.seo.compare_r1_label']()}
                </th>
                <td className="py-3 pr-4">
                  {m['site.caniride.seo.compare_r1_duo']()}
                </td>
                <td className="py-3">
                  {m['site.caniride.seo.compare_r1_solo']()}
                </td>
              </tr>
              <tr className="border-b border-white/7">
                <th className="py-3 pr-4 font-medium text-white/70">
                  {m['site.caniride.seo.compare_r2_label']()}
                </th>
                <td className="py-3 pr-4">
                  {m['site.caniride.seo.compare_r2_duo']()}
                </td>
                <td className="py-3">
                  {m['site.caniride.seo.compare_r2_solo']()}
                </td>
              </tr>
              <tr>
                <th className="py-3 pr-4 font-medium text-white/70">
                  {m['site.caniride.seo.compare_r3_label']()}
                </th>
                <td className="py-3 pr-4">
                  {m['site.caniride.seo.compare_r3_duo']()}
                </td>
                <td className="py-3">
                  {m['site.caniride.seo.compare_r3_solo']()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="fixes" title={m['site.caniride.seo.fixes_title']()}>
        <div className="space-y-8">
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
            {m['site.caniride.seo.faq_title']()}
          </h2>
          <div className="mt-7 space-y-8">
            {getCanIRideDanceAiFaqItems().map((item) => (
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
          {m['site.caniride.seo.legal']()}
        </p>
        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.caniride.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.caniride.seo.more_intro']()}
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
