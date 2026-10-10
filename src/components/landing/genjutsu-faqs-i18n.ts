import { GENJUTSU_FAQS } from '@/components/landing/content';
import { m } from '@/paraglide/messages.js';

const FAQ_COPY = [
  { question: m['site.seo.faq1_q'], answer: m['site.seo.faq1_a'] },
  { question: m['site.seo.faq2_q'], answer: m['site.seo.faq2_a'] },
  { question: m['site.seo.faq3_q'], answer: m['site.seo.faq3_a'] },
  { question: m['site.seo.faq4_q'], answer: m['site.seo.faq4_a'] },
  { question: m['site.seo.faq5_q'], answer: m['site.seo.faq5_a'] },
  { question: m['site.seo.faq6_q'], answer: m['site.seo.faq6_a'] },
  { question: m['site.seo.faq7_q'], answer: m['site.seo.faq7_a'] },
  { question: m['site.seo.faq8_q'], answer: m['site.seo.faq8_a'] },
  { question: m['site.seo.faq9_q'], answer: m['site.seo.faq9_a'] },
];

export function getLocalizedGenjutsuFaqs() {
  return GENJUTSU_FAQS.map((item, index) => ({
    ...item,
    question: FAQ_COPY[index]?.question() ?? item.question,
    answer: FAQ_COPY[index]?.answer() ?? item.answer,
  }));
}
