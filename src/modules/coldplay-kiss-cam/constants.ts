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
export const COLDPLAY_KISS_CAM_TEMPLATE_DURATION_SECONDS = 10;

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
  'In the original source video (10.0s), identify the two people inside the circular kiss-cam overlay by their positions and distinctive visual cues:',
  '',
  'Person A: the woman in front inside the circle, originally with blonde or light brown hair, a black sleeveless top, and gold jewelry. Replace Person A with Reference 1.',
  '',
  'Person B: the man wrapping his arms around Person A from behind, originally with short grey or silver hair and a light blue polo shirt. Replace Person B with Reference 2.',
  '',
  'These cues identify the ORIGINAL couple only; they are NOT appearance instructions for the replacements.',
  '',
  'Shot timeline (match these ranges exactly; do not invent cuts or subjects outside them):',
  '0.0s–2.0s: both Person A and Person B are visible in a face-on / three-quarter hug — Person B stands behind Person A with arms around her.',
  '2.0s–3.5s: Person A turns away so her back and the back of her head dominate; Person B crouches or ducks and starts leaving the frame.',
  '3.5s–10.0s: Person A remains as a back-view (back of head and shoulders) inside the circle; Person B is out of frame after crouching. Do not invent Person B back into these frames. Raised hands or other crowd faces that enter the circle are NOT Person A or Person B — leave them alone.',
  '',
  "Replace Person A with Reference 1 whenever she is visible (including the 3.5s–10.0s back view). Replace Person B with Reference 2 only while he is on screen (0.0s–~3.5s). Reference 1 controls Person A's visible face, hair, clothing, and accessories; Reference 2 controls Person B's visible face, hair, clothing, and accessories. Where a reference does not show an outfit detail, create a coherent appearance that matches that reference rather than copying the original person's distinctive look.",
  '',
  "Do not retain the original couple's faces, hairstyles, or distinctive accessories when they differ from their assigned references.",
  '',
  'Keep replacements consistent through the timed ranges above, including close-ups, two-person hugs, back views, occlusions, and the circular kiss-cam framing. Once assigned, track each person by identity and continuity. Never swap the two assignments, merge their identities, or apply one reference to both people.',
  '',
  'Preserve the source motion, timing, camera work, stadium environment, circular overlay, crowd, and stage lighting. Whenever Person A or Person B is visible in their timed range, they must be replaced; do not leave either unchanged when on screen.',
].join('\n');

/** No legacy prompt versions are accepted; new attempts use the current prompt. */
export const LEGACY_COLDPLAY_KISS_CAM_PROMPTS = [] as const;
