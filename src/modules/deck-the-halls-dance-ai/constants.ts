import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { DECK_THE_HALLS_DANCE_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const DECK_THE_HALLS_DANCE_AI_PRODUCT_ID =
  DECK_THE_HALLS_DANCE_AI_PRODUCT;

export const DECK_THE_HALLS_DANCE_AI_MODE: GenjutsuMode = 'objects-swap';

/** Solo = 1 photo / night parking-lot; duo = 2 photos / kitchen dance. */
export const DECK_THE_HALLS_DANCE_AI_CAST_MODES = ['solo', 'duo'] as const;
export type DeckTheHallsDanceAiCastMode =
  (typeof DECK_THE_HALLS_DANCE_AI_CAST_MODES)[number];
export const DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE: DeckTheHallsDanceAiCastMode =
  'duo';

export function isDeckTheHallsDanceAiCastMode(
  value: unknown
): value is DeckTheHallsDanceAiCastMode {
  return value === 'solo' || value === 'duo';
}

export function getDeckTheHallsDanceAiImageCount(
  castMode: DeckTheHallsDanceAiCastMode
): 1 | 2 {
  return castMode === 'duo' ? 2 : 1;
}

/** R2-backed URL used by seal/generate (and optional diagnostics). */
export function getDeckTheHallsDanceAiTemplateApiPath(
  castMode: DeckTheHallsDanceAiCastMode = DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE
) {
  return `/api/genjutsu/template?product=${DECK_THE_HALLS_DANCE_AI_PRODUCT_ID}&cast=${encodeURIComponent(castMode)}`;
}

/** @deprecated Prefer getDeckTheHallsDanceAiTemplateApiPath(castMode). */
export const DECK_THE_HALLS_DANCE_AI_TEMPLATE_PATH =
  getDeckTheHallsDanceAiTemplateApiPath('solo');

/**
 * Same-origin page demo — do not gate Generate on the R2 redirect player.
 * Seal/generate still use the R2 key via /api/genjutsu/*.
 */
export const DECK_THE_HALLS_DANCE_AI_TEMPLATE_DISPLAY_PATH =
  '/videos/deck-the-halls-dance-tpl.mp4';
export const DECK_THE_HALLS_DANCE_AI_TEMPLATE_POSTER_PATH =
  '/videos/deck-the-halls-dance-tpl-poster.jpg';
export const DECK_THE_HALLS_DANCE_AI_PREVIEW_CLIP_PATH =
  '/videos/deck-the-halls-dance-ai-preview-4s.mp4';

export const DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_DISPLAY_PATH =
  '/videos/deck-the-halls-dance-duo-tpl.mp4';
export const DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_POSTER_PATH =
  '/videos/deck-the-halls-dance-duo-tpl-poster.jpg';
export const DECK_THE_HALLS_DANCE_AI_DUO_PREVIEW_CLIP_PATH =
  '/videos/deck-the-halls-dance-ai-duo-preview-4s.mp4';

/** ffprobe duration of public/videos/deck-the-halls-dance-tpl.mp4 */
export const DECK_THE_HALLS_DANCE_AI_TEMPLATE_DURATION_SECONDS = 11;
/** ffprobe duration of public/videos/deck-the-halls-dance-duo-tpl.mp4 */
export const DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_DURATION_SECONDS = 10.17;

export function getDeckTheHallsDanceAiTemplateDurationSeconds(
  castMode: DeckTheHallsDanceAiCastMode = DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_DURATION_SECONDS
    : DECK_THE_HALLS_DANCE_AI_TEMPLATE_DURATION_SECONDS;
}

export function getDeckTheHallsDanceAiTemplateDisplayPath(
  castMode: DeckTheHallsDanceAiCastMode = DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_DISPLAY_PATH
    : DECK_THE_HALLS_DANCE_AI_TEMPLATE_DISPLAY_PATH;
}

export function getDeckTheHallsDanceAiTemplatePosterPath(
  castMode: DeckTheHallsDanceAiCastMode = DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_POSTER_PATH
    : DECK_THE_HALLS_DANCE_AI_TEMPLATE_POSTER_PATH;
}

export function getDeckTheHallsDanceAiPreviewClipPath(
  castMode: DeckTheHallsDanceAiCastMode = DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? DECK_THE_HALLS_DANCE_AI_DUO_PREVIEW_CLIP_PATH
    : DECK_THE_HALLS_DANCE_AI_PREVIEW_CLIP_PATH;
}

/** Both templates are 9:16. */
export const DECK_THE_HALLS_DANCE_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '9:16';

export const DECK_THE_HALLS_DANCE_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type DeckTheHallsDanceAiResolution =
  (typeof DECK_THE_HALLS_DANCE_AI_RESOLUTIONS)[number];
export const DECK_THE_HALLS_DANCE_AI_DEFAULT_RESOLUTION: DeckTheHallsDanceAiResolution =
  '480p';

export function isDeckTheHallsDanceAiResolution(
  value: unknown
): value is DeckTheHallsDanceAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Solo: night parking-lot dancer (hi-vis vest).
 * Logical references only — buildSeedanceWorkflowPrompt maps Reference N.
 */
export const DECK_THE_HALLS_DANCE_AI_SOLO_PROMPT = [
  'Replace the entire foreground dancer in the source video — the man with glasses, blue polo shirt, high-visibility yellow and orange safety vest, name badge, dark trousers and black shoes, dancing at night in a parking lot in front of a brick building and white ICE machines — with the person from Reference 1.',
  '',
  'This is a COMPLETE PERSON REPLACEMENT, not a clothing change, partial face swap, or identity blend.',
  '',
  'IDENTITY PRIORITY:',
  "Reference 1 is the sole source of the replacement person's identity and physical appearance.",
  '',
  'Recreate their recognizable facial features, eye shape, nose, mouth, jawline, facial proportions, apparent age, natural hairstyle, hairline, skin tone, body proportions, and clothing according to Reference 1.',
  '',
  "The original dancer's face, hairstyle, apparent age, body appearance, and clothing (including the safety vest) must not carry over into the replacement.",
  '',
  "Do not blend or average the original dancer's identity with Reference 1.",
  '',
  'VIDEO PRESERVATION:',
  'Use the source video only for dance movements, body poses, camera framing, timing, perspective, lighting, and the surrounding environment (parking lot, brick building, ICE machines, yellow parking lines, night lighting).',
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
 * Duo: kitchen open-plan dance — foreground (pink hoodie) + background (blonde).
 */
export const DECK_THE_HALLS_DANCE_AI_DUO_PROMPT = [
  'Replace both dancers in the source video with the people from the reference images.',
  '',
  'This is a COMPLETE PERSON REPLACEMENT for each dancer, not a clothing change, partial face swap, or identity blend.',
  '',
  'Reference 1 replaces the foreground dancer closer to the camera (dark hair with bangs, white crop top, open pink zip-up hoodie, camouflage cargo pants, pink belt).',
  'Reference 2 replaces the dancer farther back toward the kitchen (blonde hair, white tank/crop top, light-blue wide-leg jeans).',
  '',
  'Keep each reference identity — face, hair, body, clothing, and proportions — on its assigned dancer throughout every frame, including when they move toward or away from the camera.',
  'Always show two different people: never put one reference on both dancers, and never clone or blend identities.',
  '',
  'Preserve the bright open-plan kitchen and loft interior, bar stools, island, flooring, window light, camera framing, choreography, timing, and any on-screen text overlays from the source.',
  '',
  'Ignore unrelated background objects and handheld props appearing only in the reference images.',
].join('\n');

/** @deprecated Prefer getDeckTheHallsDanceAiPrompt(castMode). */
export const DECK_THE_HALLS_DANCE_AI_DEFAULT_PROMPT =
  DECK_THE_HALLS_DANCE_AI_SOLO_PROMPT;

export function getDeckTheHallsDanceAiPrompt(
  castMode: DeckTheHallsDanceAiCastMode = DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE
) {
  return castMode === 'duo'
    ? DECK_THE_HALLS_DANCE_AI_DUO_PROMPT
    : DECK_THE_HALLS_DANCE_AI_SOLO_PROMPT;
}

export function getDeckTheHallsDanceAiCastModeForPrompt(
  prompt: unknown
): DeckTheHallsDanceAiCastMode | null {
  if (prompt === DECK_THE_HALLS_DANCE_AI_DUO_PROMPT) return 'duo';
  if (prompt === DECK_THE_HALLS_DANCE_AI_SOLO_PROMPT) return 'solo';
  return null;
}

/** No legacy prompt versions are accepted; new attempts use the current prompts. */
export const LEGACY_DECK_THE_HALLS_DANCE_AI_PROMPTS = [] as const;
