import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

const SPOT_KEYS = [
  'site.flying_car.seo.spot1',
  'site.flying_car.seo.spot2',
  'site.flying_car.seo.spot3',
  'site.flying_car.seo.spot4',
  'site.flying_car.seo.spot5',
] as const;

const MAKE_STEPS = [
  {
    title: () => m['site.flying_car.seo.step1_title'](),
    body: () => m['site.flying_car.seo.step1_body'](),
  },
  {
    title: () => m['site.flying_car.seo.step2_title'](),
    body: () => m['site.flying_car.seo.step2_body'](),
  },
  {
    title: () => m['site.flying_car.seo.step3_title'](),
    body: () => m['site.flying_car.seo.step3_body'](),
  },
] as const;

const STUNT_KEYS = [
  {
    title: 'site.flying_car.seo.stunt1_title',
    body: 'site.flying_car.seo.stunt1_body',
  },
  {
    title: 'site.flying_car.seo.stunt2_title',
    body: 'site.flying_car.seo.stunt2_body',
  },
  {
    title: 'site.flying_car.seo.stunt3_title',
    body: 'site.flying_car.seo.stunt3_body',
  },
  {
    title: 'site.flying_car.seo.stunt4_title',
    body: 'site.flying_car.seo.stunt4_body',
  },
] as const;

const PHOTO_KEYS = [
  'site.flying_car.seo.photo1',
  'site.flying_car.seo.photo2',
  'site.flying_car.seo.photo3',
  'site.flying_car.seo.photo4',
] as const;

const FAQ_KEYS = [
  { q: 'site.flying_car.seo.faq1_q', a: 'site.flying_car.seo.faq1_a' },
  { q: 'site.flying_car.seo.faq2_q', a: 'site.flying_car.seo.faq2_a' },
  { q: 'site.flying_car.seo.faq3_q', a: 'site.flying_car.seo.faq3_a' },
  { q: 'site.flying_car.seo.faq4_q', a: 'site.flying_car.seo.faq4_a' },
  { q: 'site.flying_car.seo.faq5_q', a: 'site.flying_car.seo.faq5_a' },
  { q: 'site.flying_car.seo.faq6_q', a: 'site.flying_car.seo.faq6_a' },
] as const;

const EXPLORE_LINKS = [
  {
    label: () => m['site.flying_car.seo.more_shan_shen'](),
    href: '/shan-shen-bu',
  },
  {
    label: () => m['site.flying_car.seo.more_enzo'](),
    href: '/enzo-fernandez-ai',
  },
  {
    label: () => m['site.flying_car.seo.more_crazy'](),
    href: '/crazy-frog-ai',
  },
  {
    label: () => m['site.flying_car.seo.more_a2o'](),
    href: '/a2o-lite-ai',
  },
  { label: () => m['site.flying_car.seo.more_home'](), href: '/' },
  { label: () => m['site.flying_car.seo.more_pricing'](), href: '/pricing' },
] as const;

export const FLYING_CAR_SEO_IMAGES = [
  {
    src: '/img/flying-car-ai-generator-step1.jpg',
    altKey: 'site.flying_car.seo.img_step1_alt' as const,
    width: 1200,
    height: 675,
  },
  {
    src: '/img/flying-car-ai-video-ramp-flip.jpg',
    altKey: 'site.flying_car.seo.img_ramp_alt' as const,
    width: 1200,
    height: 675,
  },
  {
    src: '/img/flying-car-ai-fake-vs-real.jpg',
    altKey: 'site.flying_car.seo.img_fake_alt' as const,
    width: 1200,
    height: 675,
  },
] as const;

export function getFlyingCarAiFaqItems() {
  return FAQ_KEYS.map((item) => ({
    question: m[item.q](),
    answer: m[item.a](),
  }));
}

export function getFlyingCarAiHowToSteps() {
  return MAKE_STEPS.map((step) => ({
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

function SeoFigure({
  src,
  alt,
  width,
  height,
  caption,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}) {
  return (
    <figure className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="aspect-[16/9] w-full object-cover"
      />
      {caption ? (
        <figcaption className="border-t border-white/8 px-4 py-3 text-xs leading-5 text-white/40">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function FlyingCarAiSeoSections() {
  const [stepImg, rampImg, fakeImg] = FLYING_CAR_SEO_IMAGES;

  return (
    <div className="text-left">
      <Section title={m['site.flying_car.seo.real_title']()} tone="band">
        <p>{m['site.flying_car.seo.real_p1']()}</p>
        <p>{m['site.flying_car.seo.real_p2']()}</p>
        <p className="font-medium text-white/70">
          {m['site.flying_car.seo.real_rule']()}
        </p>
        <SeoFigure
          src={fakeImg.src}
          alt={m[fakeImg.altKey]()}
          width={fakeImg.width}
          height={fakeImg.height}
          caption={m['site.flying_car.seo.img_fake_caption']()}
        />
      </Section>

      <Section title={m['site.flying_car.seo.spot_title']()}>
        <ol className="mt-2 list-decimal space-y-3 pl-5">
          {SPOT_KEYS.map((key) => (
            <li key={key}>{m[key]()}</li>
          ))}
        </ol>
        <p className="mt-5 text-sm leading-7 text-white/40 italic">
          {m['site.flying_car.seo.spot_note']()}
        </p>
      </Section>

      <Section
        id="make-yours"
        title={m['site.flying_car.seo.howto_title']()}
        tone="band"
      >
        <SeoFigure
          src={stepImg.src}
          alt={m[stepImg.altKey]()}
          width={stepImg.width}
          height={stepImg.height}
        />
        <ol className="mt-8 space-y-6">
          {MAKE_STEPS.map((step, index) => (
            <li key={step.title()} className="list-none">
              <p className="text-xs font-semibold tracking-[0.16em] text-[rgb(204,144,92)] uppercase">
                {m['site.flying_car.seo.step_label']({ n: String(index + 1) })}
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
        <p className="mt-8">
          <a
            href="#generator"
            className="inline-flex rounded-full border border-[rgba(204,144,92,0.45)] bg-[rgba(204,144,92,0.12)] px-5 py-2.5 text-sm font-semibold text-[rgb(220,155,99)] transition hover:bg-[rgba(204,144,92,0.2)]"
          >
            {m['site.flying_car.seo.cta_start']()}
          </a>
        </p>
      </Section>

      <Section title={m['site.flying_car.seo.stunts_title']()}>
        <p>{m['site.flying_car.seo.stunts_note']()}</p>
        <SeoFigure
          src={rampImg.src}
          alt={m[rampImg.altKey]()}
          width={rampImg.width}
          height={rampImg.height}
        />
        <ul className="mt-8 space-y-5">
          {STUNT_KEYS.map((item) => (
            <li key={item.title} className="list-none">
              <h3 className="text-lg font-semibold text-white/88">
                {m[item.title]()}
              </h3>
              <p className="mt-2 text-sm leading-7 text-white/45">
                {m[item.body]()}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={m['site.flying_car.seo.photo_title']()} tone="band">
        <ul className="list-disc space-y-3 pl-5">
          {PHOTO_KEYS.map((key) => (
            <li key={key}>{m[key]()}</li>
          ))}
        </ul>
      </Section>

      <Section title={m['site.flying_car.seo.gta_title']()}>
        <p>{m['site.flying_car.seo.gta_p1']()}</p>
      </Section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {m['site.flying_car.seo.faq_title']()}
          </h2>
          <div className="mt-7 divide-y divide-white/7 rounded-2xl border border-white/8 bg-white/[0.02] px-5 sm:px-7">
            {getFlyingCarAiFaqItems().map((item) => (
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
            {m['site.flying_car.seo.more_title']()}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
            {m['site.flying_car.seo.more_intro']()}
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

      <p className="mx-auto max-w-5xl px-4 pb-14 text-center text-xs leading-6 text-white/30 md:px-5 md:pb-16">
        {m['site.flying_car.seo.disclaimer']()}
      </p>
    </div>
  );
}
