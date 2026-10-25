import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { SAY_IT_RIGHT_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const SAY_IT_RIGHT_AI_PRODUCT_ID = SAY_IT_RIGHT_AI_PRODUCT;

export const SAY_IT_RIGHT_AI_MODE: GenjutsuMode = 'objects-swap';

/** R2-backed URL used by seal/generate (and optional diagnostics). */
export const SAY_IT_RIGHT_AI_TEMPLATE_PATH = `/api/genjutsu/template?product=${SAY_IT_RIGHT_AI_PRODUCT_ID}`;
/**
 * Same-origin page demo — do not gate Generate on the R2 redirect player.
 * Seal/generate still use the R2 key via /api/genjutsu/*.
 * Asset is the homepage say-it-right-dance template.
 */
export const SAY_IT_RIGHT_AI_TEMPLATE_DISPLAY_PATH =
  '/videos/say-it-right-dance-tpl.mp4';
export const SAY_IT_RIGHT_AI_TEMPLATE_POSTER_PATH =
  '/videos/say-it-right-dance-tpl-poster.jpg';
/** ffprobe duration of public/videos/say-it-right-dance-tpl.mp4 */
export const SAY_IT_RIGHT_AI_TEMPLATE_DURATION_SECONDS = 15.113333;

/** Source is 720×1280. */
export const SAY_IT_RIGHT_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '9:16';

export const SAY_IT_RIGHT_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type SayItRightAiResolution =
  (typeof SAY_IT_RIGHT_AI_RESOLUTIONS)[number];
export const SAY_IT_RIGHT_AI_DEFAULT_RESOLUTION: SayItRightAiResolution =
  '480p';

export function isSayItRightAiResolution(
  value: unknown
): value is SayItRightAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Same prompt as homepage MOTION_TEMPLATES `say-it-right-dance`.
 * Logical references only — buildSeedanceWorkflowPrompt maps Reference N
 * onto the active provider tokens.
 */
export const SAY_IT_RIGHT_AI_DEFAULT_PROMPT = [
  'Replace the entire foreground dancer wearing a bright pink T-shirt and purple backpack in the source video with the person from Reference 1.',
  '',
  'This is a COMPLETE PERSON REPLACEMENT, not a clothing change, partial face swap, or identity blend.',
  '',
  'IDENTITY PRIORITY:',
  "Reference 1 is the sole source of the replacement person's identity and physical appearance.",
  '',
  'Recreate their recognizable facial features, eye shape, nose, mouth, jawline, facial proportions, apparent age, natural hairstyle, hairline, skin tone, body proportions, and clothing according to Reference 1.',
  '',
  "The original dancer's face, hairstyle, apparent age, body appearance, and clothing must not carry over into the replacement.",
  '',
  "Do not blend or average the original dancer's identity with Reference 1.",
  '',
  'VIDEO PRESERVATION:',
  'Use the source video only for dance movements, body poses, camera movement, framing, timing, perspective, lighting, and the surrounding environment.',
  '',
  "Adapt the replacement person's appearance and proportions naturally to the source movements. Prioritize recognizable identity over preserving the original dancer's silhouette.",
  '',
  'Maintain the same replacement identity consistently throughout every frame, including head turns, expressions, and partial occlusions.',
  '',
  'Preserve all other people and the background unchanged.',
  '',
  'Ignore unrelated background objects and handheld props appearing only in Reference 1.',
].join('\n');

/** No legacy prompt versions are accepted; new attempts use the current prompt. */
export const LEGACY_SAY_IT_RIGHT_AI_PROMPTS = [] as const;
