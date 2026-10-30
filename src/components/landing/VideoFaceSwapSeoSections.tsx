import { useEffect, useRef } from 'react';

import { Link } from '@/core/i18n/navigation';
import { getVideoFaceSwapSeoPriceAmounts } from '@/modules/video-face-swap/seo-pricing';
import { m } from '@/paraglide/messages.js';

const DEMO_BEFORE_SRC = '/videos/face-swap-demo-before.mp4';
const DEMO_AFTER_SRC = '/videos/face-swap-demo-after.mp4';
const DEMO_FACE_SRC = '/images/face-swap-demo-face.webp';

export function VideoFaceSwapEffectDemo() {
  const beforeRef = useRef<HTMLVideoElement>(null);
  const afterRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const before = beforeRef.current;
    const after = afterRef.current;
    if (!before || !after) return;

    const playBoth = () => {
      void before.play().catch(() => undefined);
      void after.play().catch(() => undefined);
    };

    const syncFromBefore = () => {
      if (Math.abs(after.currentTime - before.currentTime) > 0.15) {
        after.currentTime = before.currentTime;
      }
    };

    const onEnded = () => {
      before.currentTime = 0;
      after.currentTime = 0;
      playBoth();
    };

    before.addEventListener('timeupdate', syncFromBefore);
    before.addEventListener('ended', onEnded);
    after.addEventListener('ended', onEnded);
    playBoth();

    return () => {
      before.removeEventListener('timeupdate', syncFromBefore);
      before.removeEventListener('ended', onEnded);
      after.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)]">
        <div className="grid grid-cols-2 gap-0">
          <div className="relative min-w-0">
            <video
              ref={beforeRef}
              src={DEMO_BEFORE_SRC}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
              className="aspect-video w-full object-cover"
              aria-label={m['site.vfs.demo_before_aria']()}
            />
            <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white/80 backdrop-blur">
              {m['site.vfs.demo_before']()}
            </span>
          </div>
          <div className="relative min-w-0">
            <video
              ref={afterRef}
              src={DEMO_AFTER_SRC}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
              className="aspect-video w-full object-cover"
              aria-label={m['site.vfs.demo_after_aria']()}
            />
            <span className="absolute right-2 bottom-2 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white/80 backdrop-blur">
              {m['site.vfs.demo_after']()}
            </span>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-white/25"
          aria-hidden
        />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="size-14 overflow-hidden rounded-full border-2 border-white/85 bg-black shadow-[0_8px_28px_rgba(0,0,0,0.55)] ring-2 ring-black/50 sm:size-[4.5rem]">
            <img
              src={DEMO_FACE_SRC}
              alt={m['site.vfs.demo_face_alt']()}
              className="size-full object-cover"
              width={96}
              height={96}
              decoding="async"
            />
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-white/40">
        {m['site.vfs.demo_caption']()}
      </p>
    </div>
  );
}

function faqItems() {
  const prices = getVideoFaceSwapSeoPriceAmounts();
  return [
    {
      question: m['site.vfs.faq1_q'](),
      answer: m['site.vfs.faq1_a'](),
    },
    {
      question: m['site.vfs.faq2_q'](),
      answer: m['site.vfs.faq2_a'](),
    },
    {
      question: m['site.vfs.faq3_q'](),
      answer: m['site.vfs.faq3_a'](),
    },
    {
      question: m['site.vfs.faq4_q'](),
      answer: m['site.vfs.faq4_a'](),
    },
    {
      question: m['site.vfs.faq5_q'](),
      answer: m['site.vfs.faq5_a'](),
    },
    {
      question: m['site.vfs.faq6_q'](),
      answer: m['site.vfs.faq6_a'](),
    },
    {
      question: m['site.vfs.faq7_q'](),
      answer: m['site.vfs.faq7_a'](prices),
    },
    {
      question: m['site.vfs.faq8_q'](),
      answer: m['site.vfs.faq8_a'](),
    },
    {
      question: m['site.vfs.faq9_q'](),
      answer: m['site.vfs.faq9_a'](),
    },
    {
      question: m['site.vfs.faq10_q'](),
      answer: m['site.vfs.faq10_a'](),
    },
  ];
}

export function getVideoFaceSwapFaqSchemaItems() {
  return faqItems();
}

export function VideoFaceSwapSeoSections() {
  const faqs = faqItems();
  const prices = getVideoFaceSwapSeoPriceAmounts();
  const specs: Array<[string, string]> = [
    [m['site.vfs.specs_source_label'](), m['site.vfs.specs_source_value']()],
    [m['site.vfs.specs_images_label'](), m['site.vfs.specs_images_value']()],
    [
      m['site.vfs.specs_resolution_label'](),
      m['site.vfs.specs_resolution_value'](),
    ],
    [
      m['site.vfs.specs_multishot_label'](),
      m['site.vfs.specs_multishot_value'](),
    ],
    [m['site.vfs.specs_people_label'](), m['site.vfs.specs_people_value']()],
    [
      m['site.vfs.specs_price_label'](),
      m['site.vfs.specs_price_value'](prices),
    ],
    [m['site.vfs.specs_time_label'](), m['site.vfs.specs_time_value']()],
    [m['site.vfs.specs_lang_label'](), m['site.vfs.specs_lang_value']()],
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-14 px-4 pt-8 pb-20 text-left text-[15px] leading-7 text-white/55 md:pt-12">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90 sm:text-3xl">
          {m['site.vfs.what_title']()}
        </h2>
        <p>{m['site.vfs.what_p1']()}</p>
        <p>{m['site.vfs.what_p2']()}</p>
        <p>{m['site.vfs.what_p3']()}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.how_title']()}
        </h2>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <strong>{m['site.vfs.how_step1_strong']()}</strong>
            {m['site.vfs.how_step1_rest']()}
          </li>
          <li>
            <strong>{m['site.vfs.how_step2_strong']()}</strong>
            {m['site.vfs.how_step2_rest']()}
          </li>
          <li>
            <strong>{m['site.vfs.how_step3_strong']()}</strong>
            {m['site.vfs.how_step3_rest']()}
          </li>
          <li>
            <strong>{m['site.vfs.how_step4_strong']()}</strong>
            {m['site.vfs.how_step4_rest'](prices)}
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.pricing_title']()}
        </h2>
        <p>{m['site.vfs.pricing_rule']()}</p>
        <p>{m['site.vfs.pricing_examples'](prices)}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.why_title']()}
        </h2>
        <p>{m['site.vfs.why_p1']()}</p>
        <p>{m['site.vfs.why_p2']()}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.compare_title']()}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/12 text-left text-white/70">
                <th className="py-2 pr-3 font-medium" />
                <th className="py-2 pr-3 font-medium">
                  {m['site.vfs.compare_col_photo']()}
                </th>
                <th className="py-2 font-medium">
                  {m['site.vfs.compare_col_video']()}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/8">
                <td className="py-2 pr-3 font-medium">
                  {m['site.vfs.compare_row_input']()}
                </td>
                <td className="py-2 pr-3">
                  {m['site.vfs.compare_photo_input']()}
                </td>
                <td className="py-2">{m['site.vfs.compare_video_input']()}</td>
              </tr>
              <tr className="border-b border-white/8">
                <td className="py-2 pr-3 font-medium">
                  {m['site.vfs.compare_row_challenge']()}
                </td>
                <td className="py-2 pr-3">
                  {m['site.vfs.compare_photo_challenge']()}
                </td>
                <td className="py-2">
                  {m['site.vfs.compare_video_challenge']()}
                </td>
              </tr>
              <tr className="border-b border-white/8">
                <td className="py-2 pr-3 font-medium">
                  {m['site.vfs.compare_row_output']()}
                </td>
                <td className="py-2 pr-3">
                  {m['site.vfs.compare_photo_output']()}
                </td>
                <td className="py-2">{m['site.vfs.compare_video_output']()}</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-medium">
                  {m['site.vfs.compare_row_best']()}
                </td>
                <td className="py-2 pr-3">
                  {m['site.vfs.compare_photo_best']()}
                </td>
                <td className="py-2">{m['site.vfs.compare_video_best']()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>{m['site.vfs.compare_note']()}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.stay_title']()}
        </h2>
        <p>
          <strong>{m['site.vfs.stay_changes_label']()}</strong>
          {m['site.vfs.stay_changes']()}
        </p>
        <p>
          <strong>{m['site.vfs.stay_keeps_label']()}</strong>
          {m['site.vfs.stay_keeps']()}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.specs_title']()}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] border-collapse text-sm">
            <tbody>
              {specs.map(([label, value]) => (
                <tr key={label} className="border-b border-white/8">
                  <td className="py-2 pr-4 font-medium text-white/80">
                    {label}
                  </td>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.consent_seo_title']()}
        </h2>
        <p>{m['site.vfs.consent_seo_body']()}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.usecases_title']()}
        </h2>
        <p>{m['site.vfs.usecases_body']()}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.faq_title']()}
        </h2>
        <div className="space-y-5">
          {faqs.map((item) => (
            <div key={item.question}>
              <h3 className="font-medium text-white/88">{item.question}</h3>
              <p className="mt-1">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          {m['site.vfs.related_title']()}
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link href="/" className="underline underline-offset-2">
              {m['site.vfs.related_home']()}
            </Link>
          </li>
          <li>
            <Link
              href="/hotel-lobby-ai"
              className="underline underline-offset-2"
            >
              {m['site.vfs.related_hotel']()}
            </Link>
          </li>
          <li>
            <Link href="/tiny-desk-ai" className="underline underline-offset-2">
              {m['site.vfs.related_tinydesk']()}
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
