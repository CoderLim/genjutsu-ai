import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { getTinyDeskAiSeoPriceAmounts } from '@/modules/tiny-desk-ai/seo-pricing';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.tinydesk.seo.step1_title'](),
    body: () => m['site.tinydesk.seo.step1_body'](),
  },
  {
    title: () => m['site.tinydesk.seo.step2_title'](),
    body: () => m['site.tinydesk.seo.step2_body'](),
  },
  {
    title: () => m['site.tinydesk.seo.step3_title'](),
    body: () => m['site.tinydesk.seo.step3_body'](),
  },
] as const;

function glancePriceBody() {
  return m['site.tinydesk.seo.glance_price_body'](
    getTinyDeskAiSeoPriceAmounts()
  );
}

const GLANCE_ITEMS = [
  {
    title: () => m['site.tinydesk.seo.glance_upload_title'](),
    body: () => m['site.tinydesk.seo.glance_upload_body'](),
  },
  {
    title: () => m['site.tinydesk.seo.glance_output_title'](),
    body: () => m['site.tinydesk.seo.glance_output_body'](),
  },
  {
    title: () => m['site.tinydesk.seo.glance_price_title'](),
    body: glancePriceBody,
  },
] as const;

const OUTSTANDING_POINTS = [
  () => m['site.tinydesk.seo.outstanding_p1'](),
  () => m['site.tinydesk.seo.outstanding_p2'](),
  () => m['site.tinydesk.seo.outstanding_p3'](),
] as const;

const PROMPT_IDEAS = [
  () => m['site.tinydesk.seo.prompt1'](),
  () => m['site.tinydesk.seo.prompt2'](),
  () => m['site.tinydesk.seo.prompt3'](),
  () => m['site.tinydesk.seo.prompt4'](),
  () => m['site.tinydesk.seo.prompt5'](),
  () => m['site.tinydesk.seo.prompt6'](),
] as const;

const FAQ_KEYS = [
  { q: 'site.tinydesk.seo.faq1_q', a: 'site.tinydesk.seo.faq1_a' },
  { q: 'site.tinydesk.seo.faq2_q', a: 'site.tinydesk.seo.faq2_a' },
  {
    q: 'site.tinydesk.seo.faq_template_q',
    a: 'site.tinydesk.seo.faq_template_a',
  },
  { q: 'site.tinydesk.seo.faq3_q', a: 'site.tinydesk.seo.faq3_a' },
  { q: 'site.tinydesk.seo.faq4_q', a: 'site.tinydesk.seo.faq4_a' },
  { q: 'site.tinydesk.seo.faq5_q', a: 'site.tinydesk.seo.faq5_a' },
  { q: 'site.tinydesk.seo.faq6_q', a: 'site.tinydesk.seo.faq6_a' },
  { q: 'site.tinydesk.seo.faq7_q', a: 'site.tinydesk.seo.faq7_a' },
  { q: 'site.tinydesk.seo.faq8_q', a: 'site.tinydesk.seo.faq8_a' },
  { q: 'site.tinydesk.seo.faq9_q', a: 'site.tinydesk.seo.faq9_a' },
  { q: 'site.tinydesk.seo.faq10_q', a: 'site.tinydesk.seo.faq10_a' },
] as const;

/** FAQPage JSON-LD — must match visible FAQ items 1:1. */
const FAQ_SCHEMA_KEYS = FAQ_KEYS;

const RELATED_LINKS = [
  {
    label: () => m['site.tinydesk.seo.related_coldplay'](),
    href: '/coldplay-kiss-cam',
  },
  {
    label: () => m['site.tinydesk.seo.related_prompts'](),
    href: '/genjutsu-prompts',
  },
  {
    label: () => m['site.tinydesk.seo.related_crazy'](),
    href: '/crazy-frog-ai',
  },
] as const;

function faqAnswer(key: (typeof FAQ_KEYS)[number]['a']) {
  if (key === 'site.tinydesk.seo.faq9_a') {
    return m[key](getTinyDeskAiSeoPriceAmounts());
  }
  return m[key]();
}

export function getTinyDeskAiFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: faqAnswer(item.a),
  }));
}

export function getTinyDeskAiFaqSchemaItems() {
  return FAQ_SCHEMA_KEYS.map((item) => ({
    question: m[item.q](),
    answer: faqAnswer(item.a),
  }));
}

export function getTinyDeskAiHowToSteps() {
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

export function TinyDeskAiSeoSections() {
  return (
    <div className="text-left">
      <Section title={m['site.tinydesk.seo.what_title']()} tone="band">
        <p>{m['site.tinydesk.seo.what_p1']()}</p>
        <p>{m['site.tinydesk.seo.what_p2']()}</p>
      </Section>

      <Section id="glance" title={m['site.tinydesk.seo.glance_title']()}>
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

      <Section
        id="how-to"
        title={m['site.tinydesk.seo.howto_title']()}
        tone="band"
      >
        <ol className="mt-2 space-y-6">
          {HOW_STEPS.map((step, index) => (
            <li key={step.title()} className="list-none">
              <p className="text-xs font-semibold tracking-[0.16em] text-[rgb(204,144,92)] uppercase">
                {m['site.tinydesk.seo.step_label']({ n: String(index + 1) })}
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
      </Section>

      <Section title={m['site.tinydesk.seo.outstanding_title']()}>
        <p>{m['site.tinydesk.seo.outstanding_intro']()}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          {OUTSTANDING_POINTS.map((point, index) => (
            <li key={index}>{point()}</li>
          ))}
        </ul>
      </Section>

      <Section title={m['site.tinydesk.seo.team_title']()}>
        <p>{m['site.tinydesk.seo.team_p1']()}</p>
      </Section>

      <Section title={m['site.tinydesk.seo.prompts_title']()} tone="band">
        <p>
          {m['site.tinydesk.seo.prompts_intro']()}{' '}
          <Link
            href="/genjutsu-prompts"
            className="text-[rgb(220,155,99)] underline-offset-2 hover:underline"
          >
            {m['site.tinydesk.seo.prompts_link']()}
          </Link>
          .
        </p>
        <ul className="mt-4 space-y-3">
          {PROMPT_IDEAS.map((idea, index) => (
            <li
              key={index}
              className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 font-mono text-[13px] leading-6 text-white/55"
            >
              {idea()}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={m['site.tinydesk.seo.differs_title']()}>
        <p>{m['site.tinydesk.seo.differs_p1']()}</p>
      </Section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {m['site.tinydesk.seo.faq_title']()}
          </h2>
          <div className="mt-7 divide-y divide-white/7 rounded-2xl border border-white/8 bg-white/[0.02] px-5 sm:px-7">
            {getTinyDeskAiFaqItems().map((item) => (
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
            {m['site.tinydesk.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.tinydesk.seo.more_intro']()}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {RELATED_LINKS.map((item) => (
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
        {m['site.tinydesk.seo.disclaimer']()}
      </p>
    </div>
  );
}
