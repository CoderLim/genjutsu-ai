import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const FORMAT_A_STEPS = [
  {
    title: () => m['site.burningbridges.seo.format_a_step1_title'](),
    body: () => m['site.burningbridges.seo.format_a_step1_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.format_a_step2_title'](),
    body: () => m['site.burningbridges.seo.format_a_step2_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.format_a_step3_title'](),
    body: () => m['site.burningbridges.seo.format_a_step3_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.format_a_step4_title'](),
    body: () => m['site.burningbridges.seo.format_a_step4_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.format_a_step5_title'](),
    body: () => m['site.burningbridges.seo.format_a_step5_body'](),
  },
] as const;

const FORMAT_B_STEPS = [
  {
    title: () => m['site.burningbridges.seo.format_b_step1_title'](),
    body: () => m['site.burningbridges.seo.format_b_step1_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.format_b_step2_title'](),
    body: () => m['site.burningbridges.seo.format_b_step2_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.format_b_step3_title'](),
    body: () => m['site.burningbridges.seo.format_b_step3_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.format_b_step4_title'](),
    body: () => m['site.burningbridges.seo.format_b_step4_body'](),
  },
] as const;

const TIMELINE_ROWS = [
  {
    when: () => m['site.burningbridges.seo.timeline_r1_when'](),
    what: () => m['site.burningbridges.seo.timeline_r1_what'](),
  },
  {
    when: () => m['site.burningbridges.seo.timeline_r2_when'](),
    what: () => m['site.burningbridges.seo.timeline_r2_what'](),
  },
  {
    when: () => m['site.burningbridges.seo.timeline_r3_when'](),
    what: () => m['site.burningbridges.seo.timeline_r3_what'](),
  },
  {
    when: () => m['site.burningbridges.seo.timeline_r4_when'](),
    what: () => m['site.burningbridges.seo.timeline_r4_what'](),
  },
  {
    when: () => m['site.burningbridges.seo.timeline_r5_when'](),
    what: () => m['site.burningbridges.seo.timeline_r5_what'](),
  },
] as const;

const COMPARE_ROWS = [
  [
    () => m['site.burningbridges.seo.compare_r1_label'](),
    () => m['site.burningbridges.seo.compare_r1_a'](),
    () => m['site.burningbridges.seo.compare_r1_b'](),
  ],
  [
    () => m['site.burningbridges.seo.compare_r2_label'](),
    () => m['site.burningbridges.seo.compare_r2_a'](),
    () => m['site.burningbridges.seo.compare_r2_b'](),
  ],
  [
    () => m['site.burningbridges.seo.compare_r3_label'](),
    () => m['site.burningbridges.seo.compare_r3_a'](),
    () => m['site.burningbridges.seo.compare_r3_b'](),
  ],
  [
    () => m['site.burningbridges.seo.compare_r4_label'](),
    () => m['site.burningbridges.seo.compare_r4_a'](),
    () => m['site.burningbridges.seo.compare_r4_b'](),
  ],
  [
    () => m['site.burningbridges.seo.compare_r5_label'](),
    () => m['site.burningbridges.seo.compare_r5_a'](),
    () => m['site.burningbridges.seo.compare_r5_b'](),
  ],
] as const;

const PROMPT_RULES = [
  () => m['site.burningbridges.seo.prompt_rule1'](),
  () => m['site.burningbridges.seo.prompt_rule2'](),
  () => m['site.burningbridges.seo.prompt_rule3'](),
] as const;

const PHOTO_TIPS = [
  () => m['site.burningbridges.seo.tip1'](),
  () => m['site.burningbridges.seo.tip2'](),
  () => m['site.burningbridges.seo.tip3'](),
  () => m['site.burningbridges.seo.tip4'](),
  () => m['site.burningbridges.seo.tip5'](),
  () => m['site.burningbridges.seo.tip6'](),
] as const;

const RIGHTS_ITEMS = [
  {
    title: () => m['site.burningbridges.seo.rights1_title'](),
    body: () => m['site.burningbridges.seo.rights1_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.rights2_title'](),
    body: () => m['site.burningbridges.seo.rights2_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.rights3_title'](),
    body: () => m['site.burningbridges.seo.rights3_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.rights4_title'](),
    body: () => m['site.burningbridges.seo.rights4_body'](),
  },
  {
    title: () => m['site.burningbridges.seo.rights5_title'](),
    body: () => m['site.burningbridges.seo.rights5_body'](),
  },
] as const;

const FAQ_KEYS = [
  { q: 'site.burningbridges.seo.faq1_q', a: 'site.burningbridges.seo.faq1_a' },
  { q: 'site.burningbridges.seo.faq2_q', a: 'site.burningbridges.seo.faq2_a' },
  { q: 'site.burningbridges.seo.faq3_q', a: 'site.burningbridges.seo.faq3_a' },
  { q: 'site.burningbridges.seo.faq4_q', a: 'site.burningbridges.seo.faq4_a' },
  { q: 'site.burningbridges.seo.faq5_q', a: 'site.burningbridges.seo.faq5_a' },
  { q: 'site.burningbridges.seo.faq6_q', a: 'site.burningbridges.seo.faq6_a' },
  { q: 'site.burningbridges.seo.faq7_q', a: 'site.burningbridges.seo.faq7_a' },
] as const;

/** Max 3 on-page internal links — tool CTA + two descriptive trend anchors. */
const RELATED_LINKS = [
  {
    label: () => m['site.burningbridges.seo.related_sayitright'](),
    href: '/say-it-right-ai',
  },
  {
    label: () => m['site.burningbridges.seo.related_crazy'](),
    href: '/crazy-frog-ai',
  },
] as const;

export function getBurningBridgesAiFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

export function getBurningBridgesAiFormatAHowToSteps() {
  return FORMAT_A_STEPS.map((step) => ({
    name: step.title(),
    text: step.body(),
  }));
}

export function getBurningBridgesAiFormatBHowToSteps() {
  return FORMAT_B_STEPS.map((step) => ({
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

export function BurningBridgesAiIntroCopy() {
  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-3 text-left text-sm leading-7 text-white/48 sm:text-base">
      <p>{m['site.burningbridges.seo.intro_p1']()}</p>
      <p>{m['site.burningbridges.seo.intro_p2']()}</p>
    </div>
  );
}

export function BurningBridgesAiSeoSections() {
  return (
    <div className="text-left">
      <Section
        id="what-it-means"
        title={m['site.burningbridges.seo.what_title']()}
        tone="band"
      >
        <p>{m['site.burningbridges.seo.what_p1']()}</p>
        <p>{m['site.burningbridges.seo.what_p2']()}</p>
      </Section>

      <Section id="origin" title={m['site.burningbridges.seo.origin_title']()}>
        <h3 className="text-lg font-semibold text-white/88">
          {m['site.burningbridges.seo.origin_h3_1']()}
        </h3>
        <p>{m['site.burningbridges.seo.origin_p1']()}</p>
        <h3 className="mt-8 text-lg font-semibold text-white/88">
          {m['site.burningbridges.seo.origin_h3_2']()}
        </h3>
        <p>{m['site.burningbridges.seo.origin_p2']()}</p>
        <h3 className="mt-8 text-lg font-semibold text-white/88">
          {m['site.burningbridges.seo.origin_h3_3']()}
        </h3>
        <p>{m['site.burningbridges.seo.origin_p3']()}</p>
        <p className="mt-4 text-sm text-white/40">
          {m['site.burningbridges.seo.origin_mv_cta']()}
        </p>

        <h3 className="mt-10 text-lg font-semibold text-white/88">
          {m['site.burningbridges.seo.timeline_title']()}
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm text-white/55">
            <thead>
              <tr className="border-b border-white/10 text-white/80">
                <th className="py-3 pr-4 font-medium">
                  {m['site.burningbridges.seo.timeline_col_when']()}
                </th>
                <th className="py-3 pr-4 font-medium">
                  {m['site.burningbridges.seo.timeline_col_what']()}
                </th>
              </tr>
            </thead>
            <tbody>
              {TIMELINE_ROWS.map((row) => (
                <tr
                  key={row.when()}
                  className="border-b border-white/7 align-top"
                >
                  <th className="py-3 pr-4 font-medium whitespace-nowrap text-white/70">
                    {row.when()}
                  </th>
                  <td className="py-3 pr-4">{row.what()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="two-formats"
        title={m['site.burningbridges.seo.formats_title']()}
        tone="band"
      >
        <p>{m['site.burningbridges.seo.formats_intro']()}</p>
        <h3 className="mt-8 text-lg font-semibold text-white/88">
          {m['site.burningbridges.seo.format_a_title']()}
        </h3>
        <p>{m['site.burningbridges.seo.format_a_body']()}</p>
        <h3 className="mt-8 text-lg font-semibold text-white/88">
          {m['site.burningbridges.seo.format_b_title']()}
        </h3>
        <p>
          {m['site.burningbridges.seo.format_b_body_before']()}{' '}
          <a
            href="#generator"
            className="text-[rgb(220,155,99)] underline-offset-2 hover:underline"
          >
            {m['site.burningbridges.seo.tool_anchor']()}
          </a>{' '}
          {m['site.burningbridges.seo.format_b_body_after']()}
        </p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm text-white/55">
            <thead>
              <tr className="border-b border-white/10 text-white/80">
                <th className="py-3 pr-4 font-medium" />
                <th className="py-3 pr-4 font-medium">
                  {m['site.burningbridges.seo.compare_col_a']()}
                </th>
                <th className="py-3 pr-4 font-medium">
                  {m['site.burningbridges.seo.compare_col_b']()}
                </th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6">{m['site.burningbridges.seo.formats_pick']()}</p>
      </Section>

      <Section id="how-to" title={m['site.burningbridges.seo.howto_title']()}>
        <h3 className="text-lg font-semibold text-white/88">
          {m['site.burningbridges.seo.howto_a_title']()}
        </h3>
        <ol className="mt-4 space-y-6">
          {FORMAT_A_STEPS.map((step) => (
            <li key={step.title()} className="list-none">
              <h4 className="font-semibold text-white/80">{step.title()}</h4>
              <p className="mt-2 text-sm leading-7 text-white/45 sm:text-base">
                {step.body()}
              </p>
            </li>
          ))}
        </ol>

        <h3 className="mt-12 text-lg font-semibold text-white/88">
          {m['site.burningbridges.seo.howto_b_title']()}
        </h3>
        <ol className="mt-4 space-y-6">
          {FORMAT_B_STEPS.map((step) => (
            <li key={step.title()} className="list-none">
              <h4 className="font-semibold text-white/80">{step.title()}</h4>
              <p className="mt-2 text-sm leading-7 text-white/45 sm:text-base">
                {step.body()}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="prompts"
        title={m['site.burningbridges.seo.prompts_title']()}
        tone="band"
      >
        <p>{m['site.burningbridges.seo.prompts_intro']()}</p>
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-left text-xs leading-6 whitespace-pre-wrap text-white/70 sm:text-sm">
          {m['site.burningbridges.seo.prompt_template']()}
        </pre>
        <p className="mt-6 font-medium text-white/70">
          {m['site.burningbridges.seo.prompt_rules_lead']()}
        </p>
        <ul className="mt-2 list-disc space-y-3 pl-5 marker:text-white/30">
          {PROMPT_RULES.map((item) => (
            <li key={item()}>{item()}</li>
          ))}
        </ul>
      </Section>

      <Section
        id="photo-tips"
        title={m['site.burningbridges.seo.tips_title']()}
      >
        <ul className="list-disc space-y-3 pl-5 marker:text-white/30">
          {PHOTO_TIPS.map((item) => (
            <li key={item()}>{item()}</li>
          ))}
        </ul>
      </Section>

      <Section
        id="rights"
        title={m['site.burningbridges.seo.rights_title']()}
        tone="band"
      >
        <p>{m['site.burningbridges.seo.rights_intro']()}</p>
        <div className="mt-6 space-y-6">
          {RIGHTS_ITEMS.map((item) => (
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
            {m['site.burningbridges.seo.faq_title']()}
          </h2>
          <div className="mt-7 space-y-8">
            {getBurningBridgesAiFaqItems().map((item) => (
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
            {m['site.burningbridges.seo.cta_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.burningbridges.seo.cta_body']()}
          </p>
          <a
            href="#generator"
            className="mt-5 inline-flex rounded-full border border-[rgba(204,144,92,0.45)] bg-[rgba(120,87,60,0.55)] px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-[rgba(140,100,70,0.7)]"
          >
            {m['site.burningbridges.seo.cta_button']()}
          </a>
        </div>

        <p className="mt-10 max-w-3xl text-sm leading-7 text-white/40">
          {m['site.burningbridges.seo.legal']()}
        </p>
        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.burningbridges.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.burningbridges.seo.more_intro']()}
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
    </div>
  );
}
