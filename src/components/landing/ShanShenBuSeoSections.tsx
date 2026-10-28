import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import {
  SHAN_SHEN_BU_TEMPLATE_PATH,
  SHAN_SHEN_BU_TEMPLATE_POSTER_PATH,
} from '@/modules/shan-shen-bu/constants';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.shan_shen_bu.seo.step1_title'](),
    body: () => m['site.shan_shen_bu.seo.step1_body'](),
  },
  {
    title: () => m['site.shan_shen_bu.seo.step2_title'](),
    body: () => m['site.shan_shen_bu.seo.step2_body'](),
  },
  {
    title: () => m['site.shan_shen_bu.seo.step3_title'](),
    body: () => m['site.shan_shen_bu.seo.step3_body'](),
  },
] as const;

const FAQ_KEYS = [
  { q: 'site.shan_shen_bu.seo.faq1_q', a: 'site.shan_shen_bu.seo.faq1_a' },
  { q: 'site.shan_shen_bu.seo.faq2_q', a: 'site.shan_shen_bu.seo.faq2_a' },
  { q: 'site.shan_shen_bu.seo.faq3_q', a: 'site.shan_shen_bu.seo.faq3_a' },
  { q: 'site.shan_shen_bu.seo.faq4_q', a: 'site.shan_shen_bu.seo.faq4_a' },
  { q: 'site.shan_shen_bu.seo.faq5_q', a: 'site.shan_shen_bu.seo.faq5_a' },
  { q: 'site.shan_shen_bu.seo.faq6_q', a: 'site.shan_shen_bu.seo.faq6_a' },
  { q: 'site.shan_shen_bu.seo.faq7_q', a: 'site.shan_shen_bu.seo.faq7_a' },
] as const;

const MEANING_ROWS = [
  {
    char: () => m['site.shan_shen_bu.seo.meaning_c1'](),
    pinyin: () => m['site.shan_shen_bu.seo.meaning_p1'](),
    sense: () => m['site.shan_shen_bu.seo.meaning_s1'](),
  },
  {
    char: () => m['site.shan_shen_bu.seo.meaning_c2'](),
    pinyin: () => m['site.shan_shen_bu.seo.meaning_p2'](),
    sense: () => m['site.shan_shen_bu.seo.meaning_s2'](),
  },
  {
    char: () => m['site.shan_shen_bu.seo.meaning_c3'](),
    pinyin: () => m['site.shan_shen_bu.seo.meaning_p3'](),
    sense: () => m['site.shan_shen_bu.seo.meaning_s3'](),
  },
] as const;

const TIMELINE_ROWS = [
  {
    when: () => m['site.shan_shen_bu.seo.timeline_r1_when'](),
    what: () => m['site.shan_shen_bu.seo.timeline_r1_what'](),
  },
  {
    when: () => m['site.shan_shen_bu.seo.timeline_r2_when'](),
    what: () => m['site.shan_shen_bu.seo.timeline_r2_what'](),
  },
  {
    when: () => m['site.shan_shen_bu.seo.timeline_r3_when'](),
    what: () => m['site.shan_shen_bu.seo.timeline_r3_what'](),
  },
  {
    when: () => m['site.shan_shen_bu.seo.timeline_r4_when'](),
    what: () => m['site.shan_shen_bu.seo.timeline_r4_what'](),
  },
  {
    when: () => m['site.shan_shen_bu.seo.timeline_r5_when'](),
    what: () => m['site.shan_shen_bu.seo.timeline_r5_what'](),
  },
] as const;

const COMPARE_ROWS = [
  {
    label: () => m['site.shan_shen_bu.seo.compare_r1_label'](),
    ssb: () => m['site.shan_shen_bu.seo.compare_r1_ssb'](),
    griddy: () => m['site.shan_shen_bu.seo.compare_r1_griddy'](),
    floss: () => m['site.shan_shen_bu.seo.compare_r1_floss'](),
  },
  {
    label: () => m['site.shan_shen_bu.seo.compare_r2_label'](),
    ssb: () => m['site.shan_shen_bu.seo.compare_r2_ssb'](),
    griddy: () => m['site.shan_shen_bu.seo.compare_r2_griddy'](),
    floss: () => m['site.shan_shen_bu.seo.compare_r2_floss'](),
  },
  {
    label: () => m['site.shan_shen_bu.seo.compare_r3_label'](),
    ssb: () => m['site.shan_shen_bu.seo.compare_r3_ssb'](),
    griddy: () => m['site.shan_shen_bu.seo.compare_r3_griddy'](),
    floss: () => m['site.shan_shen_bu.seo.compare_r3_floss'](),
  },
  {
    label: () => m['site.shan_shen_bu.seo.compare_r4_label'](),
    ssb: () => m['site.shan_shen_bu.seo.compare_r4_ssb'](),
    griddy: () => m['site.shan_shen_bu.seo.compare_r4_griddy'](),
    floss: () => m['site.shan_shen_bu.seo.compare_r4_floss'](),
  },
  {
    label: () => m['site.shan_shen_bu.seo.compare_r5_label'](),
    ssb: () => m['site.shan_shen_bu.seo.compare_r5_ssb'](),
    griddy: () => m['site.shan_shen_bu.seo.compare_r5_griddy'](),
    floss: () => m['site.shan_shen_bu.seo.compare_r5_floss'](),
  },
] as const;

const EXPLORE_LINKS = [
  {
    label: () => m['site.shan_shen_bu.seo.more_flying'](),
    href: '/flying-car-ai',
  },
  {
    label: () => m['site.shan_shen_bu.seo.more_enzo'](),
    href: '/enzo-fernandez-ai',
  },
  {
    label: () => m['site.shan_shen_bu.seo.more_crazy'](),
    href: '/crazy-frog-ai',
  },
  {
    label: () => m['site.shan_shen_bu.seo.more_zombie'](),
    href: '/ai-zombie-hug',
  },
  { label: () => m['site.shan_shen_bu.seo.more_home'](), href: '/' },
  { label: () => m['site.shan_shen_bu.seo.more_pricing'](), href: '/pricing' },
] as const;

export function getShanShenBuFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

/** Dance tutorial steps for HowTo JSON-LD (not the AI upload flow). */
export function getShanShenBuHowToSteps() {
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
  wide = false,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  tone?: 'plain' | 'band';
  wide?: boolean;
}) {
  const inner = (
    <div
      className={
        wide
          ? 'mx-auto max-w-6xl px-4 py-14 md:px-5 md:py-20'
          : 'mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20'
      }
    >
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
      <section id={id} className="border-y border-white/[0.04] bg-black/20">
        {inner}
      </section>
    );
  }
  return <section id={id}>{inner}</section>;
}

function ProseTable({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 max-w-none overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm text-white/55">
        {children}
      </table>
    </div>
  );
}

export function ShanShenBuSeoSections() {
  return (
    <div className="mt-6 text-left">
      <Section
        id="meaning"
        title={m['site.shan_shen_bu.seo.meaning_title']()}
        tone="band"
      >
        <p>{m['site.shan_shen_bu.seo.intro_p2']()}</p>
        <p>{m['site.shan_shen_bu.seo.meaning_intro']()}</p>
        <ProseTable>
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-white/70">
              <th className="px-4 py-3 font-medium">
                {m['site.shan_shen_bu.seo.meaning_th_char']()}
              </th>
              <th className="px-4 py-3 font-medium">
                {m['site.shan_shen_bu.seo.meaning_th_pinyin']()}
              </th>
              <th className="px-4 py-3 font-medium">
                {m['site.shan_shen_bu.seo.meaning_th_sense']()}
              </th>
            </tr>
          </thead>
          <tbody>
            {MEANING_ROWS.map((row) => (
              <tr key={row.char()} className="border-b border-white/[0.06]">
                <td className="px-4 py-3 text-lg text-white/85">
                  {row.char()}
                </td>
                <td className="px-4 py-3">{row.pinyin()}</td>
                <td className="px-4 py-3">{row.sense()}</td>
              </tr>
            ))}
          </tbody>
        </ProseTable>
        <p className="mt-6">{m['site.shan_shen_bu.seo.meaning_together']()}</p>
        <p>{m['site.shan_shen_bu.seo.meaning_clear_intro']()}</p>
        <ul className="list-disc space-y-3 pl-5">
          <li>{m['site.shan_shen_bu.seo.meaning_clear1']()}</li>
          <li>{m['site.shan_shen_bu.seo.meaning_clear2']()}</li>
        </ul>
        <p>{m['site.shan_shen_bu.seo.meaning_spelling']()}</p>
      </Section>

      <Section id="origin" title={m['site.shan_shen_bu.seo.origin_title']()}>
        <p>{m['site.shan_shen_bu.seo.origin_p1']()}</p>
        <p>{m['site.shan_shen_bu.seo.origin_p2']()}</p>
        <p>{m['site.shan_shen_bu.seo.origin_p3']()}</p>
        <h3 className="mt-8 text-lg font-semibold text-white/85">
          {m['site.shan_shen_bu.seo.timeline_title']()}
        </h3>
        <ul className="mt-4 space-y-4">
          {TIMELINE_ROWS.map((row) => (
            <li key={row.when()} className="list-none">
              <p className="text-xs font-semibold tracking-[0.14em] text-[rgb(220,155,99)] uppercase">
                {row.when()}
              </p>
              <p className="mt-1 text-white/55">{row.what()}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="original-video"
        title={m['site.shan_shen_bu.seo.original_title']()}
        tone="band"
      >
        <p>{m['site.shan_shen_bu.seo.original_p1']()}</p>
        <figure className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <video
            className="mx-auto max-h-[520px] w-full bg-black object-contain"
            src={SHAN_SHEN_BU_TEMPLATE_PATH}
            poster={SHAN_SHEN_BU_TEMPLATE_POSTER_PATH}
            muted
            playsInline
            loop
            autoPlay
            preload="metadata"
            controls
            aria-label={m['site.shan_shen_bu.seo.original_video_alt']()}
          />
          <figcaption className="border-t border-white/8 px-4 py-3 text-xs leading-5 text-white/40">
            {m['site.shan_shen_bu.seo.original_caption']()}
          </figcaption>
        </figure>
      </Section>

      <Section id="how-to" title={m['site.shan_shen_bu.seo.howto_title']()}>
        <p>{m['site.shan_shen_bu.seo.howto_intro']()}</p>
        <ol className="mt-6 space-y-6">
          {HOW_STEPS.map((step, index) => (
            <li key={step.title()} className="list-none">
              <p className="text-xs font-semibold tracking-[0.16em] text-[rgb(220,155,99)] uppercase">
                {m['site.shan_shen_bu.seo.step_label']({
                  n: String(index + 1),
                })}
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
        <h3 className="mt-10 text-lg font-semibold text-white/85">
          {m['site.shan_shen_bu.seo.mistakes_title']()}
        </h3>
        <ol className="mt-4 list-decimal space-y-3 pl-5">
          <li>{m['site.shan_shen_bu.seo.mistake1']()}</li>
          <li>{m['site.shan_shen_bu.seo.mistake2']()}</li>
          <li>{m['site.shan_shen_bu.seo.mistake3']()}</li>
        </ol>
      </Section>

      <Section
        id="why"
        title={m['site.shan_shen_bu.seo.why_title']()}
        tone="band"
      >
        <p>{m['site.shan_shen_bu.seo.why_intro']()}</p>
        <ol className="list-decimal space-y-3 pl-5">
          <li>{m['site.shan_shen_bu.seo.why1']()}</li>
          <li>{m['site.shan_shen_bu.seo.why2']()}</li>
          <li>{m['site.shan_shen_bu.seo.why3']()}</li>
        </ol>
        <p>{m['site.shan_shen_bu.seo.why_outro']()}</p>
      </Section>

      <Section id="formats" title={m['site.shan_shen_bu.seo.formats_title']()}>
        <p>{m['site.shan_shen_bu.seo.formats_intro']()}</p>
        <ul className="list-disc space-y-3 pl-5">
          <li>{m['site.shan_shen_bu.seo.format1']()}</li>
          <li>{m['site.shan_shen_bu.seo.format2']()}</li>
          <li>{m['site.shan_shen_bu.seo.format3']()}</li>
          <li>{m['site.shan_shen_bu.seo.format4']()}</li>
          <li>{m['site.shan_shen_bu.seo.format5']()}</li>
          <li>{m['site.shan_shen_bu.seo.format6']()}</li>
        </ul>
        <p>{m['site.shan_shen_bu.seo.formats_companion']()}</p>
      </Section>

      <Section
        id="real-life"
        title={m['site.shan_shen_bu.seo.reallife_title']()}
        tone="band"
      >
        <p>{m['site.shan_shen_bu.seo.reallife_p1']()}</p>
        <p>{m['site.shan_shen_bu.seo.reallife_p2']()}</p>
      </Section>

      <Section id="song" title={m['site.shan_shen_bu.seo.song_title']()}>
        <p>{m['site.shan_shen_bu.seo.song_p1']()}</p>
        <p>{m['site.shan_shen_bu.seo.song_p2']()}</p>
      </Section>

      <Section
        id="make-yours"
        title={m['site.shan_shen_bu.seo.ai_title']()}
        tone="band"
      >
        <p>{m['site.shan_shen_bu.seo.ai_p1']()}</p>
        <p className="pt-2">
          <a
            href="#generator"
            className="inline-flex rounded-full border border-[rgba(204,144,92,0.45)] bg-[rgba(204,144,92,0.12)] px-5 py-2.5 text-sm font-semibold text-[rgb(220,155,99)] transition hover:bg-[rgba(204,144,92,0.2)]"
          >
            {m['site.shan_shen_bu.seo.cta_start']()}
          </a>
        </p>
        <p className="text-sm text-white/40">
          {m['site.shan_shen_bu.seo.ai_note']()}
        </p>
      </Section>

      <Section
        id="compare"
        title={m['site.shan_shen_bu.seo.compare_title']()}
        wide
      >
        <ProseTable>
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-white/70">
              <th className="px-4 py-3 font-medium">
                {m['site.shan_shen_bu.seo.compare_th_aspect']()}
              </th>
              <th className="px-4 py-3 font-medium">
                {m['site.shan_shen_bu.seo.compare_th_ssb']()}
              </th>
              <th className="px-4 py-3 font-medium">
                {m['site.shan_shen_bu.seo.compare_th_griddy']()}
              </th>
              <th className="px-4 py-3 font-medium">
                {m['site.shan_shen_bu.seo.compare_th_floss']()}
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label()} className="border-b border-white/[0.06]">
                <td className="px-4 py-3 font-medium text-white/75">
                  {row.label()}
                </td>
                <td className="px-4 py-3">{row.ssb()}</td>
                <td className="px-4 py-3">{row.griddy()}</td>
                <td className="px-4 py-3">{row.floss()}</td>
              </tr>
            ))}
          </tbody>
        </ProseTable>
      </Section>

      <Section
        id="faq"
        title={m['site.shan_shen_bu.seo.faq_title']()}
        tone="band"
      >
        <div className="space-y-6">
          {FAQ_KEYS.map((item) => (
            <div key={item.q}>
              <h3 className="text-base font-medium text-white/78">
                {m[item.q]()}
              </h3>
              <p className="mt-2 text-white/48">{m[item.a]()}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="sources" title={m['site.shan_shen_bu.seo.sources_title']()}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{m['site.shan_shen_bu.seo.source1']()}</li>
          <li>{m['site.shan_shen_bu.seo.source2']()}</li>
          <li>{m['site.shan_shen_bu.seo.source3']()}</li>
          <li>{m['site.shan_shen_bu.seo.source4']()}</li>
        </ul>
      </Section>

      <Section id="more" title={m['site.shan_shen_bu.seo.more_title']()}>
        <p>{m['site.shan_shen_bu.seo.more_intro']()}</p>
        <ul className="mt-4 space-y-2">
          {EXPLORE_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-[rgb(220,155,99)] underline-offset-4 hover:underline"
              >
                {link.label()}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-white/36">
          {m['site.shan_shen_bu.seo.disclaimer']()}
        </p>
      </Section>
    </div>
  );
}
