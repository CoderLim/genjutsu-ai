import { m } from '@/paraglide/messages.js';
import { GENJUTSU_FAQS } from '@/components/landing/content';

/** Resolve message fns at call time — module-level capture breaks during Paraglide HMR. */
const FAQ_KEYS = [
  ['site.seo.faq1_q', 'site.seo.faq1_a'],
  ['site.seo.faq2_q', 'site.seo.faq2_a'],
  ['site.seo.faq3_q', 'site.seo.faq3_a'],
  ['site.seo.faq4_q', 'site.seo.faq4_a'],
  ['site.seo.faq5_q', 'site.seo.faq5_a'],
  ['site.seo.faq6_q', 'site.seo.faq6_a'],
  ['site.seo.faq7_q', 'site.seo.faq7_a'],
  ['site.seo.faq8_q', 'site.seo.faq8_a'],
  ['site.seo.faq9_q', 'site.seo.faq9_a'],
] as const;

function msg(key: (typeof FAQ_KEYS)[number][number]): string | undefined {
  const fn = m[key];
  return typeof fn === 'function' ? fn() : undefined;
}

export function getLocalizedGenjutsuFaqs() {
  return GENJUTSU_FAQS.map((item, index) => {
    const keys = FAQ_KEYS[index];
    return {
      ...item,
      question: (keys && msg(keys[0])) ?? item.question,
      answer: (keys && msg(keys[1])) ?? item.answer,
    };
  });
}
