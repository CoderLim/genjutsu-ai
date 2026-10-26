import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const HOW_STEPS = [
  {
    title: () => m['site.kisscam.seo.step1_title'](),
    body: () => m['site.kisscam.seo.step1_body'](),
  },
  {
    title: () => m['site.kisscam.seo.step2_title'](),
    body: () => m['site.kisscam.seo.step2_body'](),
  },
  {
    title: () => m['site.kisscam.seo.step3_title'](),
    body: () => m['site.kisscam.seo.step3_body'](),
  },
] as const;

const FAQ_KEYS = [
  { q: 'site.kisscam.seo.faq1_q', a: 'site.kisscam.seo.faq1_a' },
  { q: 'site.kisscam.seo.faq2_q', a: 'site.kisscam.seo.faq2_a' },
  { q: 'site.kisscam.seo.faq3_q', a: 'site.kisscam.seo.faq3_a' },
  { q: 'site.kisscam.seo.faq4_q', a: 'site.kisscam.seo.faq4_a' },
  { q: 'site.kisscam.seo.faq5_q', a: 'site.kisscam.seo.faq5_a' },
  { q: 'site.kisscam.seo.faq6_q', a: 'site.kisscam.seo.faq6_a' },
  { q: 'site.kisscam.seo.faq7_q', a: 'site.kisscam.seo.faq7_a' },
  { q: 'site.kisscam.seo.faq8_q', a: 'site.kisscam.seo.faq8_a' },
] as const;

const COMPARE_ROWS = [
  {
    label: () => m['site.kisscam.seo.compare_row_control'](),
    template: () => m['site.kisscam.seo.compare_tpl_control'](),
    full: () => m['site.kisscam.seo.compare_full_control'](),
  },
  {
    label: () => m['site.kisscam.seo.compare_row_time'](),
    template: () => m['site.kisscam.seo.compare_tpl_time'](),
    full: () => m['site.kisscam.seo.compare_full_time'](),
  },
  {
    label: () => m['site.kisscam.seo.compare_row_likeness'](),
    template: () => m['site.kisscam.seo.compare_tpl_likeness'](),
    full: () => m['site.kisscam.seo.compare_full_likeness'](),
  },
  {
    label: () => m['site.kisscam.seo.compare_row_fit'](),
    template: () => m['site.kisscam.seo.compare_tpl_fit'](),
    full: () => m['site.kisscam.seo.compare_full_fit'](),
  },
] as const;

const RELATED_TEMPLATES = [
  {
    label: () => m['site.kisscam.seo.related_zombie'](),
    href: '/ai-zombie-hug',
  },
  {
    label: () => m['site.kisscam.seo.related_crazy'](),
    href: '/crazy-frog-ai',
  },
  {
    label: () => 'Day of the Dead AI Video',
    href: '/day-of-the-dead-ai-video',
  },
] as const;

export function getColdplayKissCamFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
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

export function ColdplayKissCamIntroCopy() {
  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-3 text-left text-sm leading-7 text-white/48 sm:text-base">
      <p>{m['site.kisscam.seo.make_p1']()}</p>
      <p>{m['site.kisscam.seo.make_p2']()}</p>
      <p>{m['site.kisscam.seo.make_p3']()}</p>
    </div>
  );
}

export function ColdplayKissCamSeoSections() {
  return (
    <div className="text-left">
      <Section id="how-it-works" title={m['site.kisscam.seo.howto_title']()}>
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
        id="template-look"
        title={m['site.kisscam.seo.look_title']()}
        tone="band"
      >
        <p>{m['site.kisscam.seo.look_p1']()}</p>
        <p>{m['site.kisscam.seo.look_p2']()}</p>
        <p>{m['site.kisscam.seo.look_p3']()}</p>
        <p>{m['site.kisscam.seo.look_p4']()}</p>
        <p>{m['site.kisscam.seo.look_p5']()}</p>
        <div className="mx-auto mt-8 max-w-sm overflow-hidden rounded-[20px] border border-white/10 bg-black/25 p-2.5">
          <video
            src="/videos/coldplay-kiss-cam-tpl.mp4"
            poster="/videos/coldplay-kiss-cam-tpl-poster.jpg"
            title={m['site.kisscam.seo.look_video_title']()}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-full rounded-xl bg-black object-contain"
          />
        </div>
      </Section>

      <Section title={m['site.kisscam.seo.photos_title']()}>
        <p>{m['site.kisscam.seo.photos_p1']()}</p>
        <p>{m['site.kisscam.seo.photos_p2']()}</p>
        <p>{m['site.kisscam.seo.photos_p3']()}</p>
      </Section>

      <Section title={m['site.kisscam.seo.compare_title']()} tone="band">
        <p>{m['site.kisscam.seo.compare_intro']()}</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.03]">
                <th className="px-4 py-3 font-semibold text-white/70">
                  {m['site.kisscam.seo.compare_col_metric']()}
                </th>
                <th className="px-4 py-3 font-semibold text-white/70">
                  {m['site.kisscam.seo.compare_col_template']()}
                </th>
                <th className="px-4 py-3 font-semibold text-white/70">
                  {m['site.kisscam.seo.compare_col_full']()}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr
                  key={row.label()}
                  className="border-b border-white/7 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-white/75">
                    {row.label()}
                  </td>
                  <td className="px-4 py-3 text-white/45">{row.template()}</td>
                  <td className="px-4 py-3 text-white/45">{row.full()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          {m['site.kisscam.seo.compare_outro_before']()}{' '}
          <Link
            href="/"
            className="font-medium text-[rgb(220,155,99)] underline-offset-4 hover:underline"
          >
            {m['site.kisscam.seo.link_kissing_generator']()}
          </Link>{' '}
          {m['site.kisscam.seo.compare_outro_after']()}
        </p>
      </Section>

      <Section title={m['site.kisscam.seo.permission_title']()}>
        <p>{m['site.kisscam.seo.permission_p1']()}</p>
        <p>{m['site.kisscam.seo.permission_p2']()}</p>
        <p>{m['site.kisscam.seo.permission_p3']()}</p>
      </Section>

      <Section title={m['site.kisscam.seo.free_title']()} tone="band">
        <p>{m['site.kisscam.seo.free_p1']()}</p>
        <p>{m['site.kisscam.seo.free_p2']()}</p>
        <p>{m['site.kisscam.seo.free_p3']()}</p>
        <p>
          {m['site.kisscam.seo.free_p4_before']()}{' '}
          <Link
            href="/pricing"
            className="font-medium text-[rgb(220,155,99)] underline-offset-4 hover:underline"
          >
            {m['site.kisscam.seo.link_pricing']()}
          </Link>
          {m['site.kisscam.seo.free_p4_after']()}
        </p>
      </Section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {m['site.kisscam.seo.faq_title']()}
          </h2>
          <div className="mt-7 space-y-8">
            {getColdplayKissCamFaqItems().map((item) => (
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
          {m['site.kisscam.seo.legal']()}
        </p>
        <div className="mt-10 rounded-[26px] border border-white/8 bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.kisscam.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.kisscam.seo.more_intro_before']()}{' '}
            <Link
              href="/"
              className="font-medium text-[rgb(220,155,99)] underline-offset-4 hover:underline"
            >
              {m['site.kisscam.seo.link_templates']()}
            </Link>
            {m['site.kisscam.seo.more_intro_after']()}
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
