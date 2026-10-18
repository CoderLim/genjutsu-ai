import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { ENZO_FERNANDEZ_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const ENZO_FERNANDEZ_AI_PRODUCT_ID = ENZO_FERNANDEZ_AI_PRODUCT;

export const ENZO_FERNANDEZ_AI_MODE: GenjutsuMode = 'objects-swap';

/** Preview plays the same R2 object seal uses (signed via API). */
export const ENZO_FERNANDEZ_AI_TEMPLATE_PATH = `/api/genjutsu/template?product=${ENZO_FERNANDEZ_AI_PRODUCT_ID}`;
export const ENZO_FERNANDEZ_AI_TEMPLATE_POSTER_PATH =
  '/videos/enzo-fernandez-ai-tpl-poster.jpg';

/** ffprobe duration of public/videos/enzo-fernandez-ai-tpl.mp4 */
export const ENZO_FERNANDEZ_AI_TEMPLATE_DURATION_SECONDS = 7.916599;

/** Source is ~876×718; nearest Seedance aspect. */
export const ENZO_FERNANDEZ_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '4:3';

export const ENZO_FERNANDEZ_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type EnzoFernandezAiResolution =
  (typeof ENZO_FERNANDEZ_AI_RESOLUTIONS)[number];
export const ENZO_FERNANDEZ_AI_DEFAULT_RESOLUTION: EnzoFernandezAiResolution =
  '480p';

export function isEnzoFernandezAiResolution(
  value: unknown
): value is EnzoFernandezAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Target mapping only. Complete replacement + preservation live in
 * `buildSeedanceWorkflowPrompt` (objects-swap).
 * @Image 1 = the celebrating woman in the sequined dress (foreground).
 * Keep the Argentina football player in the background unchanged.
 */
export const ENZO_FERNANDEZ_AI_DEFAULT_PROMPT = [
  'Replace the woman in the foreground — blonde hair with bangs, sleeveless multi-colored sequined dress, celebrating on the pitch — with @Image 1.',
  'Do not change the Argentina football player in the background in any shot.',
  'Preserve the stadium crowd, broadcast scoreboard overlay, lighting, camera motion, framing, and her gestures throughout the clip.',
].join('\n\n');

/** No legacy prompt versions are accepted; new attempts use the current prompt. */
export const LEGACY_ENZO_FERNANDEZ_AI_PROMPTS = [] as const;
