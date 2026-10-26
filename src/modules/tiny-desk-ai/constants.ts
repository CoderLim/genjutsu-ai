import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { TINY_DESK_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const TINY_DESK_AI_PRODUCT_ID = TINY_DESK_AI_PRODUCT;

export const TINY_DESK_AI_MODE: GenjutsuMode = 'objects-swap';

/** R2-backed URL used by seal/generate (and optional diagnostics). */
export const TINY_DESK_AI_TEMPLATE_PATH = `/api/genjutsu/template?product=${TINY_DESK_AI_PRODUCT_ID}`;
/**
 * Same-origin page demo — do not gate Generate on the R2 redirect player.
 * Seal/generate still use the R2 key via /api/genjutsu/*.
 */
export const TINY_DESK_AI_TEMPLATE_DISPLAY_PATH =
  '/videos/tiny-desk-ai-tpl.mp4';
export const TINY_DESK_AI_TEMPLATE_POSTER_PATH =
  '/videos/tiny-desk-ai-tpl-poster.jpg';
/**
 * Pre-trimmed 4s clip for paid Preview uploads.
 * Avoids client ffmpeg.wasm re-encode of the full ~19s template when available.
 */
export const TINY_DESK_AI_PREVIEW_CLIP_PATH =
  '/videos/tiny-desk-ai-preview-4s.mp4';

/** ffprobe duration of public/videos/tiny-desk-ai-tpl.mp4 (IG reel De3d3xJR_vL). */
export const TINY_DESK_AI_TEMPLATE_DURATION_SECONDS = 18.828526;

/** Source is 716×1272. */
export const TINY_DESK_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio = '9:16';

export const TINY_DESK_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type TinyDeskAiResolution = (typeof TINY_DESK_AI_RESOLUTIONS)[number];
export const TINY_DESK_AI_DEFAULT_RESOLUTION: TinyDeskAiResolution = '480p';

export function isTinyDeskAiResolution(
  value: unknown
): value is TinyDeskAiResolution {
  return value === '480p' || value === '720p';
}

/** Contiguous uploads from lead → sax. Max five people in the desk scene. */
export const TINY_DESK_AI_MIN_IMAGES = 1 as const;
export const TINY_DESK_AI_MAX_IMAGES = 5 as const;

/**
 * Upload / prompt order (contiguous fill):
 * 1 lead · 2 backing L · 3 backing R · 4 harmony close-up · 5 sax
 */
export const TINY_DESK_AI_SLOT_IDS = [
  'lead',
  'backingLeft',
  'backingRight',
  'harmony',
  'sax',
] as const;
export type TinyDeskAiSlotId = (typeof TINY_DESK_AI_SLOT_IDS)[number];

/**
 * UI layout (stage positions): Back L · Lead · Back R on row 1,
 * then Harmony · Sax — matches the wide band framing.
 */
export const TINY_DESK_AI_SLOT_DISPLAY_IDS = [
  'backingLeft',
  'lead',
  'backingRight',
  'harmony',
  'sax',
] as const satisfies readonly TinyDeskAiSlotId[];

const ROLE_CUES = [
  'Person A (lead singer): brown hair, black suit, thin black necktie, seated center at the red keyboard with a microphone in front — the middle person between the two backing singers in the wide band shots',
  'Person B (backing left): Black man, shaved head, navy suit, blue patterned tie — standing behind and to the left of the lead in the wide band shots',
  'Person C (backing right): Black man, shaved head, grey pinstripe suit, often sunglasses — standing behind and to the right of the lead in the wide band shots',
  'Person D (harmony / featured vocalist): older man with silver-white hair, grey checkered/windowpane suit jacket, pink-black-white striped necktie — mid-clip solo close-up / profile singing shots only (not the center lead)',
  'Person E (saxophone): Black man with glasses and a red-and-black striped scarf — saxophone solo close-up',
] as const;

function buildPromptForImageCount(count: number): string {
  const n = Math.min(
    TINY_DESK_AI_MAX_IMAGES,
    Math.max(TINY_DESK_AI_MIN_IMAGES, Math.floor(count))
  );
  const replaceLines = ROLE_CUES.slice(0, n).map(
    (cue, index) =>
      `${cue}. Replace Person ${'ABCDE'[index]} completely with Reference ${index + 1} wherever they appear — face, hair, body, and clothing.`
  );
  const keepLines =
    n < TINY_DESK_AI_MAX_IMAGES
      ? [
          '',
          'Do NOT replace anyone else:',
          ...ROLE_CUES.slice(n).map((cue) => `- ${cue}.`),
        ]
      : [
          '',
          'Replace ALL FIVE original performers with their assigned references. Keep each assignment consistent across wide shots, close-ups, and cuts. Never swap the center lead with the silver-haired close-up singer.',
        ];

  return [
    'In the original Tiny Desk / Outstanding source video, identify these performers by distinctive visual cues (cues describe the ORIGINAL people only, not the replacements):',
    '',
    ...replaceLines,
    ...keepLines,
    '',
    'Preserve the Tiny Desk office shelves, desk edge, microphones, instruments, lighting, camera cuts, framing, motion, and timing throughout the clip.',
  ].join('\n');
}

/**
 * Fixed prompts for each allowed cast size (1–5 contiguous slots from lead).
 * Client must send the prompt that matches the uploaded image count.
 */
export const TINY_DESK_AI_PROMPTS_BY_COUNT = {
  1: buildPromptForImageCount(1),
  2: buildPromptForImageCount(2),
  3: buildPromptForImageCount(3),
  4: buildPromptForImageCount(4),
  5: buildPromptForImageCount(5),
} as const;

export type TinyDeskAiImageCount = keyof typeof TINY_DESK_AI_PROMPTS_BY_COUNT;

export function isTinyDeskAiImageCount(
  value: unknown
): value is TinyDeskAiImageCount {
  return (
    value === 1 || value === 2 || value === 3 || value === 4 || value === 5
  );
}

export function buildTinyDeskAiPrompt(imageCount: number): string {
  if (!isTinyDeskAiImageCount(imageCount)) {
    throw new Error('Tiny Desk AI requires 1–5 reference images');
  }
  return TINY_DESK_AI_PROMPTS_BY_COUNT[imageCount];
}

/** Full five-person cast — default for docs / UI copy. */
export const TINY_DESK_AI_DEFAULT_PROMPT = TINY_DESK_AI_PROMPTS_BY_COUNT[5];

/**
 * Earlier solo prompts (silver-hair-as-lead, then center-lead variants).
 * Still accepted so in-flight attempts are not rejected.
 */
export const LEGACY_TINY_DESK_AI_PROMPTS = [
  [
    'In the original source video, identify the lead singer: the older man with silver-white hair, a grey checkered or windowpane suit jacket, a white dress shirt, and a pink-black-white striped necktie. He appears in the mid-clip close-up / profile performance shots (singing, fist pump, laughing).',
    '',
    'Replace that lead singer completely with Reference 1 (@Image 1) wherever he appears — face, hair, body, and clothing.',
    '',
    'Do NOT replace anyone else:',
    '- the keyboard player at the red keyboard (brown hair, black suit, thin black tie, mic in front);',
    '- the saxophone player (glasses, red-and-black scarf);',
    '- the backing performers behind the desk.',
    '',
    'Preserve the Tiny Desk office shelves, desk edge, microphones, instruments, lighting, camera cuts, framing, motion, and timing throughout the clip.',
  ].join('\n'),
] as const;
