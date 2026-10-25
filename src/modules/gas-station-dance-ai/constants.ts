import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { GAS_STATION_DANCE_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const GAS_STATION_DANCE_AI_PRODUCT_ID = GAS_STATION_DANCE_AI_PRODUCT;

export const GAS_STATION_DANCE_AI_MODE: GenjutsuMode = 'objects-swap';

/** R2-backed URL used by seal/generate (and optional diagnostics). */
export const GAS_STATION_DANCE_AI_TEMPLATE_PATH = `/api/genjutsu/template?product=${GAS_STATION_DANCE_AI_PRODUCT_ID}`;
/**
 * Same-origin page demo — do not gate Generate on the R2 redirect player.
 * Seal/generate still use the R2 key via /api/genjutsu/*.
 * Asset is the homepage long-trival (Gas Station Dance) template.
 */
export const GAS_STATION_DANCE_AI_TEMPLATE_DISPLAY_PATH =
  '/videos/long-trival-tpl.mp4';
export const GAS_STATION_DANCE_AI_TEMPLATE_POSTER_PATH =
  '/videos/long-trival-tpl-poster.jpg';
/**
 * Pre-trimmed 4s clip for paid Preview uploads.
 * Avoids client ffmpeg.wasm re-encode of the full ~18s template when available.
 */
export const GAS_STATION_DANCE_AI_PREVIEW_CLIP_PATH =
  '/videos/gas-station-dance-ai-preview-4s.mp4';
/** ffprobe duration of public/videos/long-trival-tpl.mp4 */
export const GAS_STATION_DANCE_AI_TEMPLATE_DURATION_SECONDS = 17.6;

export const GAS_STATION_DANCE_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '9:16';

export const GAS_STATION_DANCE_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type GasStationDanceAiResolution =
  (typeof GAS_STATION_DANCE_AI_RESOLUTIONS)[number];
export const GAS_STATION_DANCE_AI_DEFAULT_RESOLUTION: GasStationDanceAiResolution =
  '480p';

export function isGasStationDanceAiResolution(
  value: unknown
): value is GasStationDanceAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Logical references only. buildSeedanceWorkflowPrompt maps Reference N
 * onto the active provider tokens. Slot order matches first appearance:
 * dance → selfie → car exit (Reference 1/2/3).
 * Seeded from homepage motion-templates long-trival prompt.
 */
export const GAS_STATION_DANCE_AI_DEFAULT_PROMPT = [
  'Replace the three main characters in the source video with the people from the reference images, in their order of first appearance.',
  '',
  'Reference 1 replaces the opening dancer.',
  'Reference 2 replaces the selfie character.',
  'Reference 3 replaces the character stepping out of the car.',
  '',
  'Preserve their identities, faces, hairstyles, outfits, and body proportions throughout the video.',
  '',
  'Keep the original dance movements, camera angles, scene transitions, vehicles, lighting, and timing unchanged.',
].join('\n');

export const LEGACY_GAS_STATION_DANCE_AI_PROMPTS = [] as const;
