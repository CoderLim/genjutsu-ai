import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { CAN_I_RIDE_DANCE_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const CAN_I_RIDE_DANCE_AI_PRODUCT_ID = CAN_I_RIDE_DANCE_AI_PRODUCT;

export const CAN_I_RIDE_DANCE_AI_MODE: GenjutsuMode = 'objects-swap';

/** Solo = 1 photo / hallway; duo = 2 photos / night parking-lot. */
export const CAN_I_RIDE_DANCE_AI_CAST_MODES = ['solo', 'duo'] as const;
export type CanIRideDanceAiCastMode =
  (typeof CAN_I_RIDE_DANCE_AI_CAST_MODES)[number];
export const CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE: CanIRideDanceAiCastMode =
  'duo';

export function isCanIRideDanceAiCastMode(
  value: unknown
): value is CanIRideDanceAiCastMode {
  return value === 'solo' || value === 'duo';
}

export function getCanIRideDanceAiImageCount(
  castMode: CanIRideDanceAiCastMode
): 1 | 2 {
  return castMode === 'duo' ? 2 : 1;
}

/** R2-backed URL used by seal/generate (and optional diagnostics). */
export function getCanIRideDanceAiTemplateApiPath(
  castMode: CanIRideDanceAiCastMode = CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE
) {
  return `/api/genjutsu/template?product=${CAN_I_RIDE_DANCE_AI_PRODUCT_ID}&cast=${encodeURIComponent(castMode)}`;
}

/** @deprecated Prefer getCanIRideDanceAiTemplateApiPath(castMode). */
export const CAN_I_RIDE_DANCE_AI_TEMPLATE_PATH =
  getCanIRideDanceAiTemplateApiPath('solo');

/**
 * Same-origin page demo — do not gate Generate on the R2 redirect player.
 * Seal/generate still use the R2 key via /api/genjutsu/*.
 */
export const CAN_I_RIDE_DANCE_AI_TEMPLATE_DISPLAY_PATH =
  '/videos/can-i-ride-dance-tpl.mp4';
export const CAN_I_RIDE_DANCE_AI_TEMPLATE_POSTER_PATH =
  '/videos/can-i-ride-dance-tpl-poster.jpg';
export const CAN_I_RIDE_DANCE_AI_PREVIEW_CLIP_PATH =
  '/videos/can-i-ride-dance-ai-preview-4s.mp4';

export const CAN_I_RIDE_DANCE_AI_DUO_TEMPLATE_DISPLAY_PATH =
  '/videos/can-i-ride-dance-duo-tpl.mp4';
export const CAN_I_RIDE_DANCE_AI_DUO_TEMPLATE_POSTER_PATH =
  '/videos/can-i-ride-dance-duo-tpl-poster.jpg';
export const CAN_I_RIDE_DANCE_AI_DUO_PREVIEW_CLIP_PATH =
  '/videos/can-i-ride-dance-ai-duo-preview-4s.mp4';

/** ffprobe duration of public/videos/can-i-ride-dance-tpl.mp4 */
export const CAN_I_RIDE_DANCE_AI_TEMPLATE_DURATION_SECONDS = 9.914921;
/** ffprobe duration of public/videos/can-i-ride-dance-duo-tpl.mp4 */
export const CAN_I_RIDE_DANCE_AI_DUO_TEMPLATE_DURATION_SECONDS = 9.914921;

export function getCanIRideDanceAiTemplateDurationSeconds(
  castMode: CanIRideDanceAiCastMode = CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? CAN_I_RIDE_DANCE_AI_DUO_TEMPLATE_DURATION_SECONDS
    : CAN_I_RIDE_DANCE_AI_TEMPLATE_DURATION_SECONDS;
}

export function getCanIRideDanceAiTemplateDisplayPath(
  castMode: CanIRideDanceAiCastMode = CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? CAN_I_RIDE_DANCE_AI_DUO_TEMPLATE_DISPLAY_PATH
    : CAN_I_RIDE_DANCE_AI_TEMPLATE_DISPLAY_PATH;
}

export function getCanIRideDanceAiTemplatePosterPath(
  castMode: CanIRideDanceAiCastMode = CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? CAN_I_RIDE_DANCE_AI_DUO_TEMPLATE_POSTER_PATH
    : CAN_I_RIDE_DANCE_AI_TEMPLATE_POSTER_PATH;
}

export function getCanIRideDanceAiPreviewClipPath(
  castMode: CanIRideDanceAiCastMode = CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? CAN_I_RIDE_DANCE_AI_DUO_PREVIEW_CLIP_PATH
    : CAN_I_RIDE_DANCE_AI_PREVIEW_CLIP_PATH;
}

/** Both templates are 9:16. */
export const CAN_I_RIDE_DANCE_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '9:16';

export const CAN_I_RIDE_DANCE_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type CanIRideDanceAiResolution =
  (typeof CAN_I_RIDE_DANCE_AI_RESOLUTIONS)[number];
export const CAN_I_RIDE_DANCE_AI_DEFAULT_RESOLUTION: CanIRideDanceAiResolution =
  '480p';

export function isCanIRideDanceAiResolution(
  value: unknown
): value is CanIRideDanceAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Solo: hallway dancer (mint polo, cargo shorts).
 * Logical references only — buildSeedanceWorkflowPrompt maps Reference N.
 */
export const CAN_I_RIDE_DANCE_AI_SOLO_PROMPT = [
  'Replace the entire foreground dancer in the source video — the young man with glasses, light mint/teal short-sleeve polo shirt, khaki cargo shorts, black sneakers with white soles, dancing in a narrow residential hallway with white doors, dark wood flooring, framed pictures, a ceiling light, and a mirror at the far end — with the person from Reference 1.',
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
  'Use the source video only for dance movements, body poses, camera framing, timing, perspective, lighting, and the surrounding hallway environment.',
  '',
  "Adapt the replacement person's appearance and proportions naturally to the source movements. Prioritize recognizable identity over preserving the original dancer's silhouette.",
  '',
  'Maintain the same replacement identity consistently throughout every frame, including head turns, expressions, and motion blur.',
  '',
  'Preserve the background and environment unchanged.',
  '',
  'Ignore unrelated background objects and handheld props appearing only in Reference 1.',
].join('\n');

/**
 * Duo: night parking-lot — LEFT (pink) + RIGHT (blue).
 */
export const CAN_I_RIDE_DANCE_AI_DUO_PROMPT = [
  'Replace both dancers in the source video with the people from the reference images.',
  '',
  'This is a COMPLETE PERSON REPLACEMENT for each dancer, not a clothing change, partial face swap, or identity blend.',
  '',
  'Reference 1 replaces the dancer on the LEFT (bright pink oversized hoodie and matching pink sweatpants, long dark hair with lighter highlights).',
  'Reference 2 replaces the dancer on the RIGHT (royal blue oversized hoodie and matching blue sweatpants, long dark hair).',
  '',
  'Keep each reference identity — face, hair, body, clothing, and proportions — on its assigned dancer throughout every frame.',
  'Always show two different people: never put one reference on both dancers, and never clone or blend identities.',
  '',
  'Preserve the night outdoor parking-lot background, distant buildings, asphalt, lighting, camera framing, choreography, and timing from the source.',
  '',
  'Ignore unrelated background objects and handheld props appearing only in the reference images.',
].join('\n');

/** @deprecated Prefer getCanIRideDanceAiPrompt(castMode). */
export const CAN_I_RIDE_DANCE_AI_DEFAULT_PROMPT =
  CAN_I_RIDE_DANCE_AI_SOLO_PROMPT;

export function getCanIRideDanceAiPrompt(
  castMode: CanIRideDanceAiCastMode = CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? CAN_I_RIDE_DANCE_AI_DUO_PROMPT
    : CAN_I_RIDE_DANCE_AI_SOLO_PROMPT;
}

export function getCanIRideDanceAiCastModeForPrompt(
  prompt: unknown
): CanIRideDanceAiCastMode | null {
  if (prompt === CAN_I_RIDE_DANCE_AI_DUO_PROMPT) return 'duo';
  if (prompt === CAN_I_RIDE_DANCE_AI_SOLO_PROMPT) return 'solo';
  return null;
}

/** No legacy prompt versions are accepted; new attempts use the current prompts. */
export const LEGACY_CAN_I_RIDE_DANCE_AI_PROMPTS = [] as const;
