import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { COLDPLAY_KISS_CAM_PRODUCT } from '@/modules/genjutsu/workflow';

export const COLDPLAY_KISS_CAM_PRODUCT_ID = COLDPLAY_KISS_CAM_PRODUCT;

export const COLDPLAY_KISS_CAM_MODE: GenjutsuMode = 'objects-swap';

/** Preview plays the same R2 object seal uses (signed via API). */
export const COLDPLAY_KISS_CAM_TEMPLATE_PATH = `/api/genjutsu/template?product=${COLDPLAY_KISS_CAM_PRODUCT_ID}`;
export const COLDPLAY_KISS_CAM_TEMPLATE_POSTER_PATH =
  '/videos/coldplay-kiss-cam-tpl-poster.jpg';

/** ffprobe duration of public/videos/coldplay-kiss-cam-tpl.mp4 */
export const COLDPLAY_KISS_CAM_TEMPLATE_DURATION_SECONDS = 10.133333;

export const COLDPLAY_KISS_CAM_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '9:16';

export const COLDPLAY_KISS_CAM_RESOLUTIONS = ['480p', '720p'] as const;
export type ColdplayKissCamResolution =
  (typeof COLDPLAY_KISS_CAM_RESOLUTIONS)[number];
export const COLDPLAY_KISS_CAM_DEFAULT_RESOLUTION: ColdplayKissCamResolution =
  '480p';

export function isColdplayKissCamResolution(
  value: unknown
): value is ColdplayKissCamResolution {
  return value === '480p' || value === '720p';
}

/**
 * Logical references only. `buildSeedanceWorkflowPrompt` maps
 * Reference 1/2 onto the active provider's image tokens.
 * Opening cues identify the ORIGINAL couple only, not replacement looks.
 */
export const COLDPLAY_KISS_CAM_DEFAULT_PROMPT = [
  'In the original source video, identify the two people inside the circular kiss-cam overlay by their positions and distinctive visual cues:',
  '',
  'Person A: the woman in front inside the circle, originally with white hair in a bun, glasses, and a pink cardigan. Replace Person A with Reference 1.',
  '',
  'Person B: the man wrapping his arms around Person A from behind, originally bald with a dark beard and arm tattoos. Replace Person B with Reference 2.',
  '',
  'These cues identify the ORIGINAL couple only; they are NOT appearance instructions for the replacements.',
  '',
  "Replace BOTH original people completely with their assigned reference people. Reference 1 controls Person A's visible face, hair, clothing, and accessories; Reference 2 controls Person B's visible face, hair, clothing, and accessories. Where a reference does not show an outfit detail, create a coherent appearance that matches that reference rather than copying the original person's distinctive look.",
  '',
  "Do not retain the original couple's faces, hairstyles, or distinctive accessories when they differ from their assigned references.",
  '',
  'Keep both replacements consistent through close-ups, two-person shots, occlusions, turns, camera cuts, and the circular kiss-cam framing. Once assigned, track each person by identity and continuity. Never swap the two assignments, merge their identities, or apply one reference to both people.',
  '',
  'Preserve the source motion, timing, camera work, stadium environment, circular overlay, crowd, and stage lighting. Both original people must be visibly replaced; do not leave either person unchanged.',
].join('\n');

/** No legacy prompt versions are accepted; new attempts use the current prompt. */
export const LEGACY_COLDPLAY_KISS_CAM_PROMPTS = [] as const;
