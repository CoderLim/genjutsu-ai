import { GENJUTSU_PROMPT_IDEAS } from '@/components/landing/content';
import { m } from '@/paraglide/messages.js';

const PROMPT_COPY = [
  { title: m['site.seo.idea1_title'], prompt: m['site.seo.idea1_prompt'] },
  { title: m['site.seo.idea2_title'], prompt: m['site.seo.idea2_prompt'] },
  { title: m['site.seo.idea3_title'], prompt: m['site.seo.idea3_prompt'] },
  { title: m['site.seo.idea4_title'], prompt: m['site.seo.idea4_prompt'] },
  { title: m['site.seo.idea5_title'], prompt: m['site.seo.idea5_prompt'] },
  { title: m['site.seo.idea6_title'], prompt: m['site.seo.idea6_prompt'] },
  { title: m['site.seo.idea7_title'], prompt: m['site.seo.idea7_prompt'] },
  { title: m['site.seo.idea8_title'], prompt: m['site.seo.idea8_prompt'] },
  { title: m['site.seo.idea9_title'], prompt: m['site.seo.idea9_prompt'] },
  { title: m['site.seo.idea10_title'], prompt: m['site.seo.idea10_prompt'] },
  { title: m['site.seo.idea11_title'], prompt: m['site.seo.idea11_prompt'] },
  { title: m['site.seo.idea12_title'], prompt: m['site.seo.idea12_prompt'] },
  { title: m['site.seo.idea13_title'], prompt: m['site.seo.idea13_prompt'] },
  { title: m['site.seo.idea14_title'], prompt: m['site.seo.idea14_prompt'] },
  { title: m['site.seo.idea15_title'], prompt: m['site.seo.idea15_prompt'] },
];

export function getLocalizedGenjutsuPromptIdeas() {
  return GENJUTSU_PROMPT_IDEAS.map((item, index) => ({
    ...item,
    title: PROMPT_COPY[index]?.title() ?? item.title,
    prompt: PROMPT_COPY[index]?.prompt() ?? item.prompt,
  }));
}
