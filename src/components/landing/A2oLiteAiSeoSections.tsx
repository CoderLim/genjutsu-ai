import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.a2o.seo.step1_title'](),
    body: () => m['site.a2o.seo.step1_body'](),
  },
  {
    title: () => m['site.a2o.seo.step2_title'](),
    body: () => m['site.a2o.seo.step2_body'](),
  },
  {
    title: () => m['site.a2o.seo.step3_title'](),
    body: () => m['site.a2o.seo.step3_body'](),
  },
] as const;

const ROUTINE_BEATS = [
  { time: '0:02', body: () => m['site.a2o.seo.beat1']() },
  { time: '0:05', body: () => m['site.a2o.seo.beat2']() },
  { time: '0:09', body: () => m['site.a2o.seo.beat3']() },
  { time: '0:14', body: () => m['site.a2o.seo.beat4']() },
] as const;

const FAQ_KEYS = [
  { q: 'site.a2o.seo.faq1_q', a: 'site.a2o.seo.faq1_a' },
  { q: 'site.a2o.seo.faq2_q', a: 'site.a2o.seo.faq2_a' },
  { q: 'site.a2o.seo.faq3_q', a: 'site.a2o.seo.faq3_a' },
  { q: 'site.a2o.seo.faq4_q', a: 'site.a2o.seo.faq4_a' },
  { q: 'site.a2o.seo.faq5_q', a: 'site.a2o.seo.faq5_a' },
  { q: 'site.a2o.seo.faq6_q', a: 'site.a2o.seo.faq6_a' },
  { q: 'site.a2o.seo.faq7_q', a: 'site.a2o.seo.faq7_a' },
  { q: 'site.a2o.seo.faq8_q', a: 'site.a2o.seo.faq8_a' },
  { q: 'site.a2o.seo.faq9_q', a: 'site.a2o.seo.faq9_a' },
  { q: 'site.a2o.seo.faq10_q', a: 'site.a2o.seo.faq10_a' },
  {
    q: 'site.a2o.seo.faq11_q',
    a: 'site.a2o.seo.faq11_a',
    privacyLink: true as const,
  },
  { q: 'site.a2o.seo.faq12_q', a: 'site.a2o.seo.faq12_a' },
  { q: 'site.a2o.seo.faq13_q', a: 'site.a2o.seo.faq13_a' },
] as const;

const EXPLORE_LINKS = [
  {
    label: () => m['site.a2o.seo.more_flying_car'](),
    href: '/flying-car-ai',
  },
  {
    label: () => m['site.a2o.seo.more_crazy'](),
    href: '/crazy-frog-ai',
  },
  {
    label: () => m['site.a2o.seo.more_smalltown'](),
    href: '/smalltown-boy-dance',
  },
  {
    label: () => m['site.a2o.seo.more_hotel'](),
    href: '/hotel-lobby-ai',
  },
  {
    label: () => m['site.a2o.seo.more_zombie'](),
    href: '/ai-zombie-hug',
  },
  {
    label: () => 'Day of the Dead AI Video',
    href: '/day-of-the-dead-ai-video',
  },
  { label: () => m['site.a2o.seo.more_home'](), href: '/' },
  { label: () => m['site.a2o.seo.more_pricing'](), href: '/pricing' },
] as const;

const IDEA_KEYS = [
  'site.a2o.seo.idea1',
  'site.a2o.seo.idea2',
  'site.a2o.seo.idea3',
  'site.a2o.seo.idea4',
] as const;

export function getA2oLiteAiFaqItems() {
  return FAQ_KEYS.map((item) => {
    const base = m[item.a]();
    const answer =
      'privacyLink' in item && item.privacyLink
        ? `${base} ${m['site.a2o.seo.faq11_privacy']()}.`
        : base;
    return {
      question: m[item.q](),
      answer,
      privacyLink: 'privacyLink' in item ? item.privacyLink : false,
    };
  });
}

export function getA2oLiteAiHowToSteps() {
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

export function A2oLiteAiSeoSections() {
  return (
    <div className="text-left">
      <Section title={m['site.a2o.seo.what_title']()} tone="band">
        <p>{m['site.a2o.seo.what_p1']()}</p>
        <p>{m['site.a2o.seo.what_p2']()}</p>
        <div className="mt-8 rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-white/88 sm:text-xl">
            {m['site.a2o.seo.clarify_title']()}
          </h3>
          <p className="mt-3 text-sm leading-7 text-white/45 sm:text-base">
            {m['site.a2o.seo.clarify_intro']()}
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-white/45 sm:text-base">
            <li>{m['site.a2o.seo.clarify_li1']()}</li>
            <li>{m['site.a2o.seo.clarify_li2']()}</li>
            <li>{m['site.a2o.seo.clarify_li3']()}</li>
          </ul>
          <p className="mt-4 text-sm leading-7 text-white/45 sm:text-base">
            {m['site.a2o.seo.clarify_outro']()}
          </p>
        </div>
      </Section>

      <Section id="how-to" title={m['site.a2o.seo.howto_title']()}>
        <p>{m['site.a2o.seo.howto_intro']()}</p>
        <ol className="mt-8 space-y-6">
          {HOW_STEPS.map((step, index) => (
            <li key={step.title()} className="list-none">
              <p className="text-xs font-semibold tracking-[0.16em] text-[rgb(204,144,92)] uppercase">
                {m['site.a2o.seo.step_label']({ n: String(index + 1) })}
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

      <Section title={m['site.a2o.seo.routine_title']()} tone="band">
        <p>{m['site.a2o.seo.routine_intro']()}</p>
        <ul className="mt-6 space-y-3">
          {ROUTINE_BEATS.map((beat) => (
            <li
              key={beat.time}
              className="flex gap-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3"
            >
              <span className="shrink-0 font-mono text-sm font-semibold text-[rgb(220,155,99)]">
                {beat.time}
              </span>
              <span className="text-sm leading-7 text-white/55">
                {beat.body()}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-white/35 italic">
          {m['site.a2o.seo.routine_note']()}
        </p>
      </Section>

      <Section title={m['site.a2o.seo.photos_title']()}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{m['site.a2o.seo.photos_li1']()}</li>
          <li>{m['site.a2o.seo.photos_li2']()}</li>
          <li>{m['site.a2o.seo.photos_li3']()}</li>
          <li>{m['site.a2o.seo.photos_li4']()}</li>
          <li>{m['site.a2o.seo.photos_li5']()}</li>
        </ul>
      </Section>

      <Section title={m['site.a2o.seo.permission_title']()} tone="band">
        <p>{m['site.a2o.seo.permission_intro']()}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{m['site.a2o.seo.permission_li1']()}</li>
          <li>{m['site.a2o.seo.permission_li2']()}</li>
          <li>{m['site.a2o.seo.permission_li3']()}</li>
          <li>{m['site.a2o.seo.permission_li4']()}</li>
        </ul>
      </Section>

      <Section title={m['site.a2o.seo.music_title']()}>
        <p>{m['site.a2o.seo.music_body']()}</p>
      </Section>

      <Section title={m['site.a2o.seo.ideas_title']()} tone="band">
        <ul className="list-disc space-y-2 pl-5">
          {IDEA_KEYS.map((key) => (
            <li key={key}>{m[key]()}</li>
          ))}
        </ul>
      </Section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {m['site.a2o.seo.faq_title']()}
          </h2>
          <div className="mt-7 divide-y divide-white/7 rounded-2xl border border-white/8 bg-white/[0.02] px-5 sm:px-7">
            {getA2oLiteAiFaqItems().map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-white/82 sm:text-base">
                  {item.question}
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
                  {item.privacyLink ? (
                    <>
                      {m['site.a2o.seo.faq11_a']()}{' '}
                      <Link
                        href="/privacy-policy"
                        className="font-medium text-[rgb(220,155,99)] underline-offset-4 hover:underline"
                      >
                        {m['site.a2o.seo.faq11_privacy']()}
                      </Link>
                      .
                    </>
                  ) : (
                    item.answer
                  )}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:pb-16">
        <div className="rounded-[26px] border border-white/8 bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.a2o.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.a2o.seo.more_intro']()}
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
    </div>
  );
}
