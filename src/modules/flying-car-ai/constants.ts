import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { FLYING_CAR_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const FLYING_CAR_AI_PRODUCT_ID = FLYING_CAR_AI_PRODUCT;

export const FLYING_CAR_AI_MODE: GenjutsuMode = 'objects-swap';

/** Preview plays the same R2 object seal uses (signed via API). */
export const FLYING_CAR_AI_TEMPLATE_PATH = `/api/genjutsu/template?product=${FLYING_CAR_AI_PRODUCT_ID}`;
export const FLYING_CAR_AI_TEMPLATE_POSTER_PATH =
  '/videos/flying-car-ai-tpl-poster.jpg';

/** ffprobe duration of public/videos/flying-car-ai-tpl.mp4 */
export const FLYING_CAR_AI_TEMPLATE_DURATION_SECONDS = 14.38599;

/** Source is 672×848; nearest Seedance aspect. */
export const FLYING_CAR_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio = '3:4';

export const FLYING_CAR_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type FlyingCarAiResolution = (typeof FLYING_CAR_AI_RESOLUTIONS)[number];
export const FLYING_CAR_AI_DEFAULT_RESOLUTION: FlyingCarAiResolution = '480p';

export function isFlyingCarAiResolution(
  value: unknown
): value is FlyingCarAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Target mapping only. Complete replacement + preservation live in
 * `buildSeedanceWorkflowPrompt` (objects-swap).
 * @Image 1 = whatever clear foreground subject is in the upload (person,
 * rider, pet, etc.) — replaces the sports car on the red-neon loop ramp.
 */
export const FLYING_CAR_AI_DEFAULT_PROMPT = [
  'Replace the silver-and-black sports car — thin red rear LED light bar, white RDSTR license plate — with the main subject from @Image 1.',
  "The subject in @Image 1 may be a person, a person on a bicycle or motorcycle, a cat, a dog, or another clear foreground subject. Use that subject's complete appearance throughout the clip.",
  'Inherit the car’s full trajectory: start at the foot of the red-neon loop ramp, climb the vertical curve, launch into the air, and fly through the dark stage with smoke and energy trails. Match scale, orientation, and motion to the original car in every shot.',
  'Do not keep the original car body, wheels, or plate. Preserve the ramp, red neon edges, stage lights, smoke, energy trails, camera motion, framing, and timing.',
].join('\n\n');

/** No legacy prompt versions are accepted; new attempts use the current prompt. */
export const LEGACY_FLYING_CAR_AI_PROMPTS = [] as const;
