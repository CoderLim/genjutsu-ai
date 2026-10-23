/** Product / billing scene identifier. */
export const KAIRO_BAD_TIMES_PRODUCT_ID = 'kairo-bad-times';

export const KAIRO_BAD_TIMES_SCENE = 'kairo-bad-times';
export const KAIRO_BAD_TIMES_PROVIDER = 'fal';

/** Human: Kling Motion Control — server-only model id. */
export const KAIRO_BAD_TIMES_MODEL =
  'fal-ai/kling-video/v3/standard/motion-control';

/** Pet: DreamActor accepts animal driving videos (Kling rejects them). */
export const KAIRO_BAD_TIMES_PET_MODEL = 'fal-ai/bytedance/dreamactor/v2';

/** Person vs pet motion templates (different masters + durations). */
export type KairoBadTimesSubject = 'human' | 'pet';

export function getKairoBadTimesModel(subject: KairoBadTimesSubject) {
  return subject === 'pet' ? KAIRO_BAD_TIMES_PET_MODEL : KAIRO_BAD_TIMES_MODEL;
}

export const KAIRO_BAD_TIMES_SUBJECTS = ['human', 'pet'] as const;

export function assertKairoBadTimesSubject(
  value: unknown
): KairoBadTimesSubject {
  if (value === 'human' || value === 'pet') return value;
  throw new Error('Subject must be "human" or "pet"');
}

export function parseKairoBadTimesSubject(
  value: unknown,
  fallback: KairoBadTimesSubject = 'human'
): KairoBadTimesSubject {
  if (value === 'human' || value === 'pet') return value;
  return fallback;
}

/** FalProvider requires a non-empty prompt. */
export const KAIRO_BAD_TIMES_FIXED_PROMPT_HUMAN =
  'A character performing the reference motion.';

/** Pet prompt steers morphology away from human hands/lips. */
export const KAIRO_BAD_TIMES_FIXED_PROMPT_PET =
  'A pet animal performing the reference motion with paws. Keep the subject as an animal — no human hands, no human lips.';

/** @deprecated Prefer getKairoBadTimesFixedPrompt(subject). */
export const KAIRO_BAD_TIMES_FIXED_PROMPT = KAIRO_BAD_TIMES_FIXED_PROMPT_HUMAN;

export function getKairoBadTimesFixedPrompt(subject: KairoBadTimesSubject) {
  return subject === 'pet'
    ? KAIRO_BAD_TIMES_FIXED_PROMPT_PET
    : KAIRO_BAD_TIMES_FIXED_PROMPT_HUMAN;
}

export const KAIRO_BAD_TIMES_CHARACTER_ORIENTATION = 'video' as const;
export const KAIRO_BAD_TIMES_KEEP_ORIGINAL_SOUND = true;

/** Local seed source (Node dev only) — human ~29s master. */
export const KAIRO_BAD_TIMES_LOCAL_TEMPLATE_PATH =
  'public/videos/kairo-bad-times-tpl.mp4';

export const KAIRO_BAD_TIMES_LOCAL_PREVIEW_TEMPLATE_PATH =
  'public/videos/kairo-bad-times-tpl-preview.mp4';

/** Page preview — same R2 master seal uses (signed via shared template API). */
export const KAIRO_BAD_TIMES_PREVIEW_PATH =
  '/api/genjutsu/template?product=kairo-bad-times&subject=human';
export const KAIRO_BAD_TIMES_POSTER_PATH =
  '/videos/kairo-bad-times-tpl-poster.jpg';

/** Pet master — ~29s driving clip (bad-times-pet-tpl-v2). */
export const KAIRO_BAD_TIMES_LOCAL_PET_TEMPLATE_PATH =
  'public/videos/kairo-bad-times-tpl-pet.mp4';
export const KAIRO_BAD_TIMES_LOCAL_PET_PREVIEW_TEMPLATE_PATH =
  'public/videos/kairo-bad-times-tpl-pet-preview.mp4';
export const KAIRO_BAD_TIMES_PET_PREVIEW_PATH =
  '/api/genjutsu/template?product=kairo-bad-times&subject=pet';
export const KAIRO_BAD_TIMES_PET_POSTER_PATH =
  '/videos/kairo-bad-times-tpl-pet-poster.jpg';

/** Versioned R2 key — bump when the master clip changes (v2 = ~29s source). */
export const KAIRO_BAD_TIMES_DEFAULT_TEMPLATE_VIDEO_KEY =
  'kairo-bad-times/templates/v2.mp4';
export const KAIRO_BAD_TIMES_DEFAULT_PREVIEW_TEMPLATE_VIDEO_KEY =
  'kairo-bad-times/templates/v2-preview.mp4';

/** Pet R2 keys — bump when the pet master changes (v3 = ~29s). */
export const KAIRO_BAD_TIMES_DEFAULT_PET_TEMPLATE_VIDEO_KEY =
  'kairo-bad-times/templates/pet-v3.mp4';
export const KAIRO_BAD_TIMES_DEFAULT_PET_PREVIEW_TEMPLATE_VIDEO_KEY =
  'kairo-bad-times/templates/pet-v3-preview.mp4';

export function getKairoBadTimesPublicPreviewPaths(
  subject: KairoBadTimesSubject
) {
  if (subject === 'pet') {
    return {
      previewUrl: KAIRO_BAD_TIMES_PET_PREVIEW_PATH,
      posterUrl: KAIRO_BAD_TIMES_PET_POSTER_PATH,
    };
  }
  return {
    previewUrl: KAIRO_BAD_TIMES_PREVIEW_PATH,
    posterUrl: KAIRO_BAD_TIMES_POSTER_PATH,
  };
}
