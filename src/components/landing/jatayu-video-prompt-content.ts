/** Exact prompts + generator fragments for /jatayu-video-prompt (English editorial). */

import { JATAYU_EXPANDED_PROMPT } from '@/modules/image-to-video/prompts';

export { JATAYU_EXPANDED_PROMPT };

export const JATAYU_PAGE_PATH = '/jatayu-video-prompt';
export const JATAYU_DEMO_VIDEO = '/videos/demos/jatayu-case-01.mp4';
export const JATAYU_DEMO_POSTER = '/videos/demos/jatayu-case-01-poster.jpg';
export const JATAYU_DEMO_DURATION = 'PT7S';
export const JATAYU_DEMO_UPLOAD_DATE = '2026-11-17';

export const JATAYU_PAGE_TITLE =
  'Jatayu AI Video Prompt — Copy the Google Flow Prompt';
/** ~158 chars — keep under typical SERP truncation (~160). */
export const JATAYU_PAGE_DESCRIPTION =
  'Copy the free Jatayu AI video prompt for Google Flow, Edits and CapCut. Turn a selfie into a cinematic Ramayana eagle scene in 3 steps — no login, no paywall.';

/** Word-for-word from public Google Flow creator post, 14 Nov 2026. */
export const JATAYU_ORIGINAL_PUBLIC_PROMPT =
  'Giant majestic golden-brown eagle Jatayu standing behind the man, wings fully spread like merging with him, huge detailed feathers, cinematic epic lighting, flock of birds flying around, dramatic cloudy sky with subtle lightning, photorealistic, Ramayana movie style.';

export const JATAYU_NEGATIVE_PROMPT =
  'distorted face, changing facial features, extra fingers, morphing limbs, text, watermark, logo, caption, cartoon, anime, low resolution, flickering frames, duplicated bird, over-saturated colour';

export const JATAYU_FAQ_ITEMS = [
  {
    question: 'Is the Jatayu video prompt free?',
    answer:
      'Yes. Both versions on this page are free to copy — no login, no follow, no comment, no DM.',
  },
  {
    question: 'Which AI tool is this Jatayu AI video prompt for?',
    answer:
      'Google Flow is where the trend started, using its Video + Ingredients mode with a short clip and an eagle reference image. The text also works in the AI video features of Edits and CapCut; if a tool rejects it, keep the first two sentences and drop the rest.',
  },
  {
    question: 'Can I use my own photo or video?',
    answer:
      'Yes — that is the point. Use footage where your face is clearly visible, front-facing, and where you are the only person in frame. The background gets replaced, so where you film matters less than how clearly you are lit.',
  },
  {
    question: 'Why does my face look distorted or like someone else?',
    answer:
      'Three fixes, in this order: use a shorter, sharper source clip; generate two or three times and keep the take where the face holds; make sure only one person is in the source. Adding words to the prompt does not fix faces — cleaner source footage does.',
  },
  {
    question: 'Is Jatayu a god or a film character?',
    answer:
      'Jatayu is the eagle from the Ramayana who tries to stop Ravana. The character is not owned by any studio, but specific film and series designs are. That is why our expanded prompt asks for an original eagle with no recognisable character design, and why we flag the phrase "Ramayana movie style" in the public version.',
  },
  {
    question: 'Can I write the prompt in Hindi or Telugu?',
    answer:
      'You can, but English gives better results in these tools today. Keep the prompt in English and put Hindi or Telugu in your caption, title and on-screen words instead — that is what your audience actually reads.',
  },
  {
    question: 'How long is the video, and how long does it take?',
    answer:
      'One generation gives a few seconds, which is what the trend needs; Flow can extend it. Generation itself takes a couple of minutes once your source clip and reference image are ready.',
  },
  {
    question: 'Can I post it and monetise it?',
    answer:
      'The prompt text is free to use. The clip you generate with your own footage is yours to post. Do not use film soundtracks or film clips, and keep the eagle design generic — that keeps your reels clear of copyright claims.',
  },
] as const;

export type JatayuFormatId = '9:16' | '1:1';

export const JATAYU_GENERATOR_DEFAULTS = {
  format: '9:16' as JatayuFormatId,
  distantBirds: true,
  lightning: true,
};

const FORMAT_PHRASE: Record<JatayuFormatId, string> = {
  '9:16': 'vertical 9:16',
  '1:1': 'square 1:1',
};

const BIRDS_SENTENCE = 'A small flock of distant birds crosses the horizon.';

/**
 * Keep the expanded prompt intact; only swap format, birds sentence, and lightning.
 */
export function buildJatayuGeneratorPrompt(opts: {
  format: JatayuFormatId;
  distantBirds: boolean;
  lightning: boolean;
}): string {
  let prompt = JATAYU_EXPANDED_PROMPT.replace(
    'vertical 9:16',
    FORMAT_PHRASE[opts.format]
  );

  if (!opts.distantBirds) {
    prompt = prompt.replace(` ${BIRDS_SENTENCE}`, '');
  }

  if (opts.lightning) {
    prompt = prompt.replace(
      'gentle atmospheric haze, shallow depth of field.',
      'gentle atmospheric haze, subtle lightning in the sky, shallow depth of field.'
    );
  }

  return prompt;
}
