import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { GANGNAM_STYLE_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const GANGNAM_STYLE_AI_PRODUCT_ID = GANGNAM_STYLE_AI_PRODUCT;

export const GANGNAM_STYLE_AI_MODE: GenjutsuMode = 'objects-swap';

export const GANGNAM_STYLE_AI_TEMPLATE_PATH = `/api/genjutsu/template?product=${GANGNAM_STYLE_AI_PRODUCT_ID}`;
export const GANGNAM_STYLE_AI_TEMPLATE_POSTER_PATH =
  '/videos/gangnam-style-ai-tpl-poster.jpg';

/** ffprobe duration of public/videos/gangnam-style-ai-tpl.mp4 */
export const GANGNAM_STYLE_AI_TEMPLATE_DURATION_SECONDS = 19.176825;

export const GANGNAM_STYLE_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '16:9';

export const GANGNAM_STYLE_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type GangnamStyleAiResolution =
  (typeof GANGNAM_STYLE_AI_RESOLUTIONS)[number];
export const GANGNAM_STYLE_AI_DEFAULT_RESOLUTION: GangnamStyleAiResolution =
  '480p';

export function isGangnamStyleAiResolution(
  value: unknown
): value is GangnamStyleAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Logical references only. buildSeedanceWorkflowPrompt maps Reference N
 * onto the active provider tokens. Cues identify ORIGINAL cast only.
 * Slot order: left → center → right (Reference 1/2/3).
 */
export const GANGNAM_STYLE_AI_DEFAULT_PROMPT = [
  'In the original source video, identify the three dancers by position and distinctive visual cues:',
  '',
  'Person A (left): originally wearing a white ribbed tank top and a gold necklace. Replace Person A with Reference 1.',
  '',
  'Person B (center / lead): originally wearing a plaid or check short-sleeve shirt, closest to the camera and most prominent. Replace Person B with Reference 2.',
  '',
  'Person C (right): originally wearing a dark short-sleeve shirt with grey or white hair. Replace Person C with Reference 3.',
  '',
  'These cues identify the ORIGINAL dancers only; they are NOT appearance instructions for the replacements.',
  '',
  'Replace ALL THREE original people completely with their assigned references throughout the entire video. Mid-clip solo or close-up shots of the left dancer are still Person A (Reference 1). Mid-clip solo or close-up shots of the right dancer are still Person C (Reference 3). Do not treat those close-ups as new people.',
  '',
  'Keep the three replacements visually distinct and consistent through wide shots, close-ups, occlusions, turns, and camera cuts. Never swap, merge, or confuse the three assignments.',
  '',
  'Preserve the source motion, timing, camera work, plaza/night environment, and lighting. All three original people must be visibly replaced.',
].join('\n');

export const LEGACY_GANGNAM_STYLE_AI_PROMPTS = [] as const;
