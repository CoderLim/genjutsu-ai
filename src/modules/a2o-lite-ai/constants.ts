import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { A2O_LITE_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const A2O_LITE_AI_PRODUCT_ID = A2O_LITE_AI_PRODUCT;

export const A2O_LITE_AI_MODE: GenjutsuMode = 'objects-swap';

/** Preview plays the same R2 object seal uses (signed via API). */
export const A2O_LITE_AI_TEMPLATE_PATH = `/api/genjutsu/template?product=${A2O_LITE_AI_PRODUCT_ID}`;
export const A2O_LITE_AI_TEMPLATE_POSTER_PATH =
  '/videos/a2o-lite-ai-tpl-poster.jpg';

/** ffprobe duration of public/videos/a2o-lite-ai-tpl.mp4 (twins v2) */
export const A2O_LITE_AI_TEMPLATE_DURATION_SECONDS = 14.959002;

export const A2O_LITE_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio = '16:9';

export const A2O_LITE_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type A2oLiteAiResolution = (typeof A2O_LITE_AI_RESOLUTIONS)[number];
export const A2O_LITE_AI_DEFAULT_RESOLUTION: A2oLiteAiResolution = '480p';

export function isA2oLiteAiResolution(
  value: unknown
): value is A2oLiteAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Logical references only. `buildSeedanceWorkflowPrompt` maps
 * Reference 1/2 onto the active provider's image tokens.
 * Opening position and white sunglasses identify the original dancers, not
 * the replacement appearance.
 */
export const A2O_LITE_AI_DEFAULT_PROMPT = [
  'In the original source video, identify the two dancers by their positions and distinctive visual cues in the opening shot:',
  '',
  'Dancer A: the foreground dancer closest to the camera at the start, originally wearing white oval sunglasses. Replace Dancer A with Reference 1.',
  '',
  'Dancer B: the separate dancer standing behind Dancer A at the start, initially partially hidden by Dancer A. Replace Dancer B with Reference 2.',
  '',
  'These opening-shot details identify the ORIGINAL dancers only; they are NOT appearance instructions for the replacements. Do not use original hair colors as identity cues.',
  '',
  "Replace BOTH original dancers completely with their assigned reference people. Reference 1 controls Dancer A's visible face, hair, clothing, and accessories; Reference 2 controls Dancer B's visible face, hair, clothing, and accessories. Where a reference does not show an outfit detail, create a coherent appearance that matches that reference rather than copying the original dancer's distinctive look.",
  '',
  "The original white oval sunglasses are ONLY an identifying cue for Dancer A. Do not retain or invent those sunglasses unless Reference 1 shows them. Do not retain the original dancers' faces, hairstyles, or distinctive accessories when they differ from their assigned references.",
  '',
  'Keep both replacements consistent through solo close-ups, two-person shots, occlusions, turns, camera cuts, and position changes. Once assigned from the opening shot, track each dancer by identity and continuity, NOT by who is in front later. Never swap the two assignments, merge their identities, or apply one reference to both dancers.',
  '',
  'Preserve the source choreography, movements, timing, camera work, framing, environment, and composition. Both original dancers must be visibly replaced; do not leave either dancer unchanged.',
].join('\n');

/** No legacy prompt versions are accepted; new attempts use the current prompt. */
export const LEGACY_A2O_LITE_AI_PROMPTS = [] as const;
