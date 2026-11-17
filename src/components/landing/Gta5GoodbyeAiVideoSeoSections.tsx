import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.gta5goodbye.seo.step1_title'](),
    body: () => m['site.gta5goodbye.seo.step1_body'](),
  },
  {
    title: () => m['site.gta5goodbye.seo.step2_title'](),
    body: () => m['site.gta5goodbye.seo.step2_body'](),
  },
  {
    title: () => m['site.gta5goodbye.seo.step3_title'](),
    body: () => m['site.gta5goodbye.seo.step3_body'](),
  },
] as const;

const FAQ_KEYS = [
  { q: 'site.gta5goodbye.seo.faq1_q', a: 'site.gta5goodbye.seo.faq1_a' },
  { q: 'site.gta5goodbye.seo.faq2_q', a: 'site.gta5goodbye.seo.faq2_a' },
  { q: 'site.gta5goodbye.seo.faq3_q', a: 'site.gta5goodbye.seo.faq3_a' },
  { q: 'site.gta5goodbye.seo.faq4_q', a: 'site.gta5goodbye.seo.faq4_a' },
  { q: 'site.gta5goodbye.seo.faq5_q', a: 'site.gta5goodbye.seo.faq5_a' },
  { q: 'site.gta5goodbye.seo.faq6_q', a: 'site.gta5goodbye.seo.faq6_a' },
  { q: 'site.gta5goodbye.seo.faq7_q', a: 'site.gta5goodbye.seo.faq7_a' },
  { q: 'site.gta5goodbye.seo.faq8_q', a: 'site.gta5goodbye.seo.faq8_a' },
  { q: 'site.gta5goodbye.seo.faq9_q', a: 'site.gta5goodbye.seo.faq9_a' },
  { q: 'site.gta5goodbye.seo.faq10_q', a: 'site.gta5goodbye.seo.faq10_a' },
] as const;

const RELATED = [
  {
    label: () => m['site.gta5goodbye.seo.more_day_of_dead'](),
    href: '/day-of-the-dead-ai-video',
  },
  {
    label: () => m['site.gta5goodbye.seo.more_crazy'](),
    href: '/crazy-frog-ai',
  },
  {
    label: () => m['site.gta5goodbye.seo.more_coldplay'](),
    href: '/coldplay-kiss-cam',
  },
  {
    label: () => m['site.gta5goodbye.seo.more_hotel'](),
    href: '/hotel-lobby-ai',
  },
  {
    label: () => m['site.gta5goodbye.seo.more_58th'](),
    href: '/58th-floor-ai-video',
  },
  {
    label: () => m['site.gta5goodbye.seo.more_gas'](),
    href: '/gas-station-dance-ai',
  },
  {
    label: () => m['site.gta5goodbye.seo.more_pricing'](),
    href: '/pricing',
  },
] as const;

export function getGta5GoodbyeAiVideoFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

export function getGta5GoodbyeAiVideoHowToSteps() {
  return HOW_STEPS.map((step) => ({
    name: step.title(),
    text: step.body(),
  }));
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <h2 className="font-serif text-2xl tracking-tight text-white md:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-white/65">
        {children}
      </div>
    </section>
  );
}

export function Gta5GoodbyeAiVideoIntroCopy() {
  return (
    <div className="mx-auto mt-10 max-w-2xl space-y-3 text-left text-sm leading-6 text-white/55 sm:mx-0">
      <p>{m['site.gta5goodbye.seo.updated_note']()}</p>
    </div>
  );
}

export function Gta5GoodbyeAiVideoSeoSections() {
  return (
    <div className="border-t border-white/10 bg-[hsl(28_22%_7%)]">
      <Section title={m['site.gta5goodbye.seo.howto_title']()}>
        <ol className="space-y-5">
          {HOW_STEPS.map((step, index) => (
            <li key={step.title()}>
              <p className="font-medium text-white/85">
                {index + 1}. {step.title()}
              </p>
              <p className="mt-1">{step.body()}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={m['site.gta5goodbye.seo.looks_title']()}>
        <p>{m['site.gta5goodbye.seo.looks_intro']()}</p>
        <p>{m['site.gta5goodbye.seo.looks_beat1']()}</p>
        <p>{m['site.gta5goodbye.seo.looks_beat2']()}</p>
        <p>{m['site.gta5goodbye.seo.looks_why15']()}</p>
        <p>{m['site.gta5goodbye.seo.looks_others']()}</p>
      </Section>

      <Section title={m['site.gta5goodbye.seo.likeness_title']()}>
        <p>{m['site.gta5goodbye.seo.likeness_p1']()}</p>
        <p>{m['site.gta5goodbye.seo.likeness_p2']()}</p>
      </Section>

      <Section title={m['site.gta5goodbye.seo.vs10_title']()}>
        <p>{m['site.gta5goodbye.seo.vs10_p1']()}</p>
        <p>{m['site.gta5goodbye.seo.vs10_p2']()}</p>
      </Section>

      <Section title={m['site.gta5goodbye.seo.template_vs_title']()}>
        <p>{m['site.gta5goodbye.seo.template_vs_p1']()}</p>
        <p>{m['site.gta5goodbye.seo.template_vs_p2']()}</p>
      </Section>

      <Section title={m['site.gta5goodbye.seo.consent_title']()}>
        <p>{m['site.gta5goodbye.seo.consent_p1']()}</p>
      </Section>

      <Section title={m['site.gta5goodbye.seo.free_title']()}>
        <p>{m['site.gta5goodbye.seo.free_p1']()}</p>
      </Section>

      <Section title={m['site.gta5goodbye.seo.why_now_title']()}>
        <p>{m['site.gta5goodbye.seo.why_now_p1']()}</p>
      </Section>

      <Section title={m['site.gta5goodbye.seo.footage_title']()}>
        <p>{m['site.gta5goodbye.seo.footage_p1']()}</p>
        <p>{m['site.gta5goodbye.seo.footage_p2']()}</p>
      </Section>

      <Section id="faq" title={m['site.gta5goodbye.seo.faq_title']()}>
        <dl className="space-y-5">
          {FAQ_KEYS.map((item) => (
            <div key={item.q}>
              <dt className="font-medium text-white/85">{m[item.q]()}</dt>
              <dd className="mt-1">{m[item.a]()}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={m['site.gta5goodbye.seo.more_title']()}>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {RELATED.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-white/80 underline-offset-4 hover:text-white hover:underline"
              >
                {item.label()}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
