import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { BURNING_BRIDGES_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const BURNING_BRIDGES_AI_PRODUCT_ID = BURNING_BRIDGES_AI_PRODUCT;

export const BURNING_BRIDGES_AI_MODE: GenjutsuMode = 'objects-swap';

/** R2-backed URL used by seal/generate (and optional diagnostics). */
export const BURNING_BRIDGES_AI_TEMPLATE_PATH = `/api/genjutsu/template?product=${BURNING_BRIDGES_AI_PRODUCT_ID}`;
/**
 * Same-origin page demo — do not gate Generate on the R2 redirect player.
 * Seal/generate still use the R2 key via /api/genjutsu/*.
 */
export const BURNING_BRIDGES_AI_TEMPLATE_DISPLAY_PATH =
  '/videos/burning-bridges-tpl.mp4';
export const BURNING_BRIDGES_AI_TEMPLATE_POSTER_PATH =
  '/videos/burning-bridges-tpl-poster.jpg';
/** ffprobe duration of public/videos/burning-bridges-tpl.mp4 (IG reel DeGTG5zyU2S). */
export const BURNING_BRIDGES_AI_TEMPLATE_DURATION_SECONDS = 29.046712;

/** Source is ~1276×718. */
export const BURNING_BRIDGES_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '16:9';

export const BURNING_BRIDGES_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type BurningBridgesAiResolution =
  (typeof BURNING_BRIDGES_AI_RESOLUTIONS)[number];
export const BURNING_BRIDGES_AI_DEFAULT_RESOLUTION: BurningBridgesAiResolution =
  '480p';

export function isBurningBridgesAiResolution(
  value: unknown
): value is BurningBridgesAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Target mapping only. Complete replacement + preservation live in
 * `buildSeedanceWorkflowPrompt` (objects-swap).
 * @Image 1 = the central lead in the party scene (hand-over-eyes / wave).
 * Keep background guests, room, and camera path unchanged.
 */
export const BURNING_BRIDGES_AI_DEFAULT_PROMPT = [
  'Replace the central person in the party scene — the lead facing the camera who waves and raises a hand over the eyes — with @Image 1.',
  "Use @Image 1 for that person's complete face, hair, body, and clothing throughout the clip.",
  'Do not change the background people, crystal chandeliers, private dining room, metal cups, warm tungsten light, handheld camera motion, framing, or timing.',
].join('\n\n');

/** No legacy prompt versions are accepted; new attempts use the current prompt. */
export const LEGACY_BURNING_BRIDGES_AI_PROMPTS = [] as const;
