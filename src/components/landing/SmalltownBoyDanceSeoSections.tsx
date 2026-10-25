import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const SOURCE_LINKS = {
  nyt: 'https://www.nytimes.com/2024/05/25/arts/dance/tiktok-parents-dance-1980s.html',
  stereogum:
    'https://stereogum.com/2265007/bronski-beat-celebrate-smalltown-boy-turning-40-today-as-it-soundtracks-tiktoks-80s-dance-challenge/news',
  wikiSong: 'https://en.wikipedia.org/wiki/Smalltown_Boy',
  wikiBand: 'https://en.wikipedia.org/wiki/Bronski_Beat',
  bbc: 'https://www.bbc.com/culture/article/20240619-poignant-queer-hit-to-viral-tiktok-trend-how-bronski-beats-smalltown-boy-became-the-ultimate-lgbtq-anthem',
  tiktokTag: 'https://www.tiktok.com/tag/smalltownboy',
  kym: 'https://knowyourmeme.com/memes/dance-like-its-the-80s-tiktok',
} as const;

const STEPS = [
  {
    title: () => m['site.smalltown.seo.step1_title'](),
    body: () => m['site.smalltown.seo.step1_body'](),
    alt: () => m['site.smalltown.seo.step1_alt'](),
    image: '/images/smalltown-boy-dance/smalltown-boy-dance-moves-step-1.jpg',
  },
  {
    title: () => m['site.smalltown.seo.step2_title'](),
    body: () => m['site.smalltown.seo.step2_body'](),
    alt: () => m['site.smalltown.seo.step2_alt'](),
    image: '/images/smalltown-boy-dance/smalltown-boy-dance-moves-step-2.jpg',
  },
  {
    title: () => m['site.smalltown.seo.step3_title'](),
    body: () => m['site.smalltown.seo.step3_body'](),
    alt: () => m['site.smalltown.seo.step3_alt'](),
    image: '/images/smalltown-boy-dance/smalltown-boy-dance-moves-step-3.jpg',
  },
  {
    title: () => m['site.smalltown.seo.step4_title'](),
    body: () => m['site.smalltown.seo.step4_body'](),
    alt: () => m['site.smalltown.seo.step4_alt'](),
    image: '/images/smalltown-boy-dance/smalltown-boy-dance-moves-step-4.jpg',
  },
  {
    title: () => m['site.smalltown.seo.step5_title'](),
    body: () => m['site.smalltown.seo.step5_body'](),
    alt: () => m['site.smalltown.seo.step5_alt'](),
    image: '/images/smalltown-boy-dance/smalltown-boy-dance-moves-step-5.jpg',
  },
] as const;

const FAQ_KEYS = [
  { q: 'site.smalltown.seo.faq1_q', a: 'site.smalltown.seo.faq1_a' },
  { q: 'site.smalltown.seo.faq2_q', a: 'site.smalltown.seo.faq2_a' },
  { q: 'site.smalltown.seo.faq3_q', a: 'site.smalltown.seo.faq3_a' },
  { q: 'site.smalltown.seo.faq4_q', a: 'site.smalltown.seo.faq4_a' },
  { q: 'site.smalltown.seo.faq5_q', a: 'site.smalltown.seo.faq5_a' },
] as const;

const EXPLORE_LINKS = [
  {
    label: () => m['site.smalltown.seo.more_a2o'](),
    href: '/a2o-lite-ai',
  },
  { label: () => m['site.smalltown.seo.more_crazy'](), href: '/crazy-frog-ai' },
  {
    label: () => m['site.smalltown.seo.more_sayitright'](),
    href: '/say-it-right-ai',
  },
  {
    label: () => m['site.smalltown.seo.more_hotel'](),
    href: '/hotel-lobby-ai',
  },
  {
    label: () => m['site.smalltown.seo.more_zombie'](),
    href: '/ai-zombie-hug',
  },
  { label: () => m['site.smalltown.seo.more_bulin'](), href: '/bulin-47-ai' },
  { label: () => m['site.smalltown.seo.more_home'](), href: '/' },
  { label: () => m['site.smalltown.seo.more_pricing'](), href: '/pricing' },
] as const;

const externalLinkClass =
  'font-medium text-[rgb(220,155,99)] underline-offset-4 hover:underline';

export function getSmalltownBoyDanceFaqItems() {
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

export function SmalltownBoyDanceSeoSections() {
  return (
    <div className="text-left">
      <Section title={m['site.smalltown.seo.what_title']()} tone="band">
        <p>{m['site.smalltown.seo.what_p1']()}</p>
        <p>{m['site.smalltown.seo.what_p2']()}</p>
      </Section>

      <Section title={m['site.smalltown.seo.origin_title']()}>
        <p>{m['site.smalltown.seo.origin_p1']()}</p>
        <p>
          {m['site.smalltown.seo.origin_p2_before']()}{' '}
          <a
            href={SOURCE_LINKS.nyt}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            {m['site.smalltown.seo.origin_link_nyt']()}
          </a>{' '}
          {m['site.smalltown.seo.origin_and']()}{' '}
          <a
            href={SOURCE_LINKS.stereogum}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            {m['site.smalltown.seo.origin_link_stereogum']()}
          </a>
          {m['site.smalltown.seo.origin_p2_after']()}
        </p>
        <p>
          <a
            href={SOURCE_LINKS.wikiSong}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            {m['site.smalltown.seo.origin_wiki']()}
          </a>
        </p>
      </Section>

      <Section
        id="how-to"
        title={m['site.smalltown.seo.howto_title']()}
        tone="band"
      >
        <p>{m['site.smalltown.seo.howto_intro']()}</p>
        <ol className="mt-8 space-y-8">
          {STEPS.map((step, index) => (
            <li key={step.image} className="list-none">
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">
                <img
                  src={step.image}
                  alt={step.alt()}
                  width={720}
                  height={960}
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover sm:max-h-[420px] sm:bg-black sm:object-contain"
                />
                <div className="p-5">
                  <p className="text-xs font-semibold tracking-[0.16em] text-[rgb(204,144,92)] uppercase">
                    {m['site.smalltown.seo.step_label']({
                      n: String(index + 1),
                    })}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white/88">
                    {step.title()}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-white/45">
                    {step.body()}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={m['site.smalltown.seo.challenge_title']()}>
        <p>{m['site.smalltown.seo.challenge_p1']()}</p>
        <p>
          {m['site.smalltown.seo.challenge_p2_before']()}{' '}
          <a
            href={SOURCE_LINKS.tiktokTag}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            {m['site.smalltown.seo.challenge_link_tiktok']()}
          </a>{' '}
          {m['site.smalltown.seo.challenge_p2_mid']()}{' '}
          <a
            href={SOURCE_LINKS.kym}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            {m['site.smalltown.seo.challenge_link_kym']()}
          </a>
          {m['site.smalltown.seo.challenge_p2_after']()}
        </p>
        <p>{m['site.smalltown.seo.challenge_p3']()}</p>
      </Section>

      <Section title={m['site.smalltown.seo.make_title']()} tone="band">
        <p>{m['site.smalltown.seo.make_intro']()}</p>
        <ul className="list-disc space-y-3 pl-5 text-white/48">
          <li>
            <strong className="font-semibold text-white/70">
              {m['site.smalltown.seo.make_shoot']()}
            </strong>{' '}
            {m['site.smalltown.seo.make_shoot_body']()}
          </li>
          <li>
            <strong className="font-semibold text-white/70">
              {m['site.smalltown.seo.make_capcut']()}
            </strong>{' '}
            {m['site.smalltown.seo.make_capcut_body']()}
          </li>
          <li>
            <strong className="font-semibold text-white/70">
              {m['site.smalltown.seo.make_ai']()}
            </strong>{' '}
            {m['site.smalltown.seo.make_ai_body']()}
          </li>
        </ul>
        <p>{m['site.smalltown.seo.make_p2']()}</p>
        <p>
          <Link
            href="/smalltown-boy-dance#generator"
            className={externalLinkClass}
          >
            {m['site.smalltown.seo.make_cta']()}
          </Link>{' '}
          {m['site.smalltown.seo.make_cta_suffix']()}
        </p>
      </Section>

      <Section title={m['site.smalltown.seo.song_title']()}>
        <p>
          {m['site.smalltown.seo.song_p1_before']()}{' '}
          <a
            href={SOURCE_LINKS.wikiBand}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            {m['site.smalltown.seo.song_link_wiki']()}
          </a>{' '}
          {m['site.smalltown.seo.song_p1_mid']()}{' '}
          <a
            href={SOURCE_LINKS.bbc}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            {m['site.smalltown.seo.song_link_bbc']()}
          </a>
          {m['site.smalltown.seo.song_p1_after']()}
        </p>
        <p>{m['site.smalltown.seo.song_p2']()}</p>
      </Section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {m['site.smalltown.seo.faq_title']()}
          </h2>
          <div className="mt-7 divide-y divide-white/7 rounded-2xl border border-white/8 bg-white/[0.02] px-5 sm:px-7">
            {getSmalltownBoyDanceFaqItems().map((item) => (
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

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:pb-16">
        <div className="rounded-[26px] border border-white/8 bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {m['site.smalltown.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.smalltown.seo.more_intro_before']()}{' '}
            <strong className="font-medium text-white/70">
              {m['site.smalltown.seo.more_intro_kw']()}
            </strong>
            {m['site.smalltown.seo.more_intro_after']()}
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
