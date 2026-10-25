import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.gangnam.seo.step1_title'](),
    body: () => m['site.gangnam.seo.step1_body'](),
  },
  {
    title: () => m['site.gangnam.seo.step2_title'](),
    body: () => m['site.gangnam.seo.step2_body'](),
  },
  {
    title: () => m['site.gangnam.seo.step3_title'](),
    body: () => m['site.gangnam.seo.step3_body'](),
  },
] as const;

const SUBJECT_ITEMS = [
  () => m['site.gangnam.seo.subjects_li1'](),
  () => m['site.gangnam.seo.subjects_li2'](),
  () => m['site.gangnam.seo.subjects_li3'](),
  () => m['site.gangnam.seo.subjects_li4'](),
] as const;

const TEMPLATE_ITEMS = [
  () => m['site.gangnam.seo.template_li1'](),
  () => m['site.gangnam.seo.template_li2'](),
  () => m['site.gangnam.seo.template_li3'](),
  () => m['site.gangnam.seo.template_li4'](),
  () => m['site.gangnam.seo.template_li5'](),
] as const;

const TIP_ITEMS = [
  () => m['site.gangnam.seo.tip1'](),
  () => m['site.gangnam.seo.tip2'](),
  () => m['site.gangnam.seo.tip3'](),
  () => m['site.gangnam.seo.tip4'](),
  () => m['site.gangnam.seo.tip5'](),
] as const;

const USE_ITEMS = [
  () => m['site.gangnam.seo.use1'](),
  () => m['site.gangnam.seo.use2'](),
  () => m['site.gangnam.seo.use3'](),
  () => m['site.gangnam.seo.use4'](),
  () => m['site.gangnam.seo.use5'](),
] as const;

const FAQ_KEYS = [
  { q: 'site.gangnam.seo.faq1_q', a: 'site.gangnam.seo.faq1_a' },
  { q: 'site.gangnam.seo.faq2_q', a: 'site.gangnam.seo.faq2_a' },
  { q: 'site.gangnam.seo.faq3_q', a: 'site.gangnam.seo.faq3_a' },
  { q: 'site.gangnam.seo.faq4_q', a: 'site.gangnam.seo.faq4_a' },
  { q: 'site.gangnam.seo.faq5_q', a: 'site.gangnam.seo.faq5_a' },
  { q: 'site.gangnam.seo.faq6_q', a: 'site.gangnam.seo.faq6_a' },
  { q: 'site.gangnam.seo.faq7_q', a: 'site.gangnam.seo.faq7_a' },
  { q: 'site.gangnam.seo.faq8_q', a: 'site.gangnam.seo.faq8_a' },
] as const;

const RELATED_TEMPLATES = [
  {
    label: () => m['site.gangnam.seo.related_sayitright'](),
    href: '/say-it-right-ai',
  },
  {
    label: () => m['site.gangnam.seo.related_crazy'](),
    href: '/crazy-frog-ai',
  },
  {
    label: () => m['site.gangnam.seo.related_a2o'](),
    href: '/a2o-lite-ai',
  },
  {
    label: () => m['site.gangnam.seo.related_smalltown'](),
    href: '/smalltown-boy-dance',
  },
  {
    label: () => m['site.gangnam.seo.related_hotel'](),
    href: '/hotel-lobby-ai',
  },
  {
    label: () => m['site.gangnam.seo.related_home'](),
    href: '/',
  },
] as const;

export function getGangnamStyleAiFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

export function getGangnamStyleAiHowToSteps() {
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

export function GangnamStyleAiIntroCopy() {
  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-3 text-left text-sm leading-7 text-white/48 sm:text-base">
      <p>{m['site.gangnam.seo.intro_p1']()}</p>
      <p>{m['site.gangnam.seo.intro_p2']()}</p>
    </div>
  );
}

export function GangnamStyleAiSeoSections() {
  return (
    <div className="text-left">
      <Section
        id="sample"
        title={m['site.gangnam.seo.sample_title']()}
        tone="band"
      >
        <p>{m['site.gangnam.seo.sample_caption']()}</p>
        <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-[20px] border border-white/10 bg-black/25 p-2.5">
          <video
            src="/videos/gangnam-style-ai-tpl.mp4"
            poster="/videos/gangnam-style-ai-tpl-poster.jpg"
            title={m['site.gangnam.seo.sample_title']()}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full rounded-xl bg-black object-contain"
          />
        </div>
      </Section>

      <Section id="how-it-works" title={m['site.gangnam.seo.howto_title']()}>
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
        id="three-subjects"
        title={m['site.gangnam.seo.subjects_title']()}
        tone="band"
      >
        <p>{m['site.gangnam.seo.subjects_p1']()}</p>
        <ul className="mt-2 list-disc space-y-3 pl-5 marker:text-white/30">
          {SUBJECT_ITEMS.map((item) => (
            <li key={item()}>{item()}</li>
          ))}
        </ul>
      </Section>

      <Section title={m['site.gangnam.seo.template_title']()}>
        <ul className="list-disc space-y-3 pl-5 marker:text-white/30">
          {TEMPLATE_ITEMS.map((item) => (
            <li key={item()}>{item()}</li>
          ))}
        </ul>
      </Section>

      <Section title={m['site.gangnam.seo.tips_title']()} tone="band">
        <ol className="list-decimal space-y-3 pl-5 marker:text-white/35">
          {TIP_ITEMS.map((item) => (
            <li key={item()}>{item()}</li>
          ))}
        </ol>
      </Section>

      <Section title={m['site.gangnam.seo.uses_title']()}>
        <ul className="list-disc space-y-3 pl-5 marker:text-white/30">
          {USE_ITEMS.map((item) => (
            <li key={item()}>{item()}</li>
          ))}
        </ul>
      </Section>

      <Section title={m['site.gangnam.seo.history_title']()} tone="band">
        <p>{m['site.gangnam.seo.history_p1']()}</p>
      </Section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {m['site.gangnam.seo.faq_title']()}
          </h2>
          <div className="mt-7 space-y-8">
            {getGangnamStyleAiFaqItems().map((item) => (
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
          {m['site.gangnam.seo.legal']()}
        </p>
        <div className="mt-10 rounded-[26px] border border-white/8 bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.gangnam.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.gangnam.seo.more_intro']()}
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
