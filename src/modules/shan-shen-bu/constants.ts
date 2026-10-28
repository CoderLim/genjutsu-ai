import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { SHAN_SHEN_BU_PRODUCT } from '@/modules/genjutsu/workflow';

export const SHAN_SHEN_BU_PRODUCT_ID = SHAN_SHEN_BU_PRODUCT;

export const SHAN_SHEN_BU_MODE: GenjutsuMode = 'objects-swap';

/** Preview plays the same R2 object seal uses (signed via API). */
export const SHAN_SHEN_BU_TEMPLATE_PATH = `/api/genjutsu/template?product=${SHAN_SHEN_BU_PRODUCT_ID}`;
export const SHAN_SHEN_BU_TEMPLATE_POSTER_PATH =
  '/videos/shan-shen-bu-tpl-poster.jpg';

/** ffprobe duration of public/videos/shan-shen-bu-tpl.mp4 */
export const SHAN_SHEN_BU_TEMPLATE_DURATION_SECONDS = 14.2;

/** Source is 720×1280 H.264; Seedance 9:16. (Was HEVC 720×1290 — BytePlus/SeeAPI INVALID_INPUT.) */
export const SHAN_SHEN_BU_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio = '9:16';

export const SHAN_SHEN_BU_RESOLUTIONS = ['480p', '720p'] as const;
export type ShanShenBuResolution = (typeof SHAN_SHEN_BU_RESOLUTIONS)[number];
export const SHAN_SHEN_BU_DEFAULT_RESOLUTION: ShanShenBuResolution = '480p';

export function isShanShenBuResolution(
  value: unknown
): value is ShanShenBuResolution {
  return value === '480p' || value === '720p';
}

/**
 * Target mapping only. Complete replacement + preservation live in
 * `buildSeedanceWorkflowPrompt` (objects-swap).
 * @Image 1 = person, animal, or clear foreground subject — replaces the
 * elderly man performing the flash-step (闪身步).
 */
export const SHAN_SHEN_BU_DEFAULT_PROMPT = [
  'Replace the elderly man in the source video — short gray/white hair, dark short-sleeve shirt, dark rolled trousers, gray slide sandals, performing a quick martial-arts flash-step jump in a paved courtyard alley — with the main subject from @Image 1.',
  "The subject in @Image 1 may be a person, an animal, or another clear foreground subject. Use that subject's complete appearance throughout the clip.",
  "Inherit the original man's full trajectory and flash-step choreography: jumps, spins, dodges, footwork, and camera timing. Match scale, orientation, and motion to the original performer in every shot.",
  "Do not keep the original man's face, hair, body, or clothing. Preserve the courtyard, paved ground, concrete walls, metal door, clothesline, camera motion, framing, and timing.",
].join('\n\n');

/** No legacy prompt versions are accepted; new attempts use the current prompt. */
export const LEGACY_SHAN_SHEN_BU_PROMPTS = [] as const;
