import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { GTA_5_GOODBYE_AI_VIDEO_PRODUCT } from '@/modules/genjutsu/workflow';

export const GTA_5_GOODBYE_AI_VIDEO_PRODUCT_ID = GTA_5_GOODBYE_AI_VIDEO_PRODUCT;

export const GTA_5_GOODBYE_AI_VIDEO_MODE: GenjutsuMode = 'objects-swap';

/** R2-backed URL used by seal/generate (and optional diagnostics). */
export const GTA_5_GOODBYE_AI_VIDEO_TEMPLATE_PATH = `/api/genjutsu/template?product=${GTA_5_GOODBYE_AI_VIDEO_PRODUCT_ID}`;
/**
 * Same-origin page demo — do not gate Generate on the R2 redirect player.
 * Seal/generate still use the R2 key via /api/genjutsu/*.
 */
export const GTA_5_GOODBYE_AI_VIDEO_TEMPLATE_DISPLAY_PATH =
  '/videos/gta-5-goodbye-ai-video-tpl.mp4';
export const GTA_5_GOODBYE_AI_VIDEO_TEMPLATE_POSTER_PATH =
  '/videos/gta-5-goodbye-ai-video-tpl-poster.jpg';
/**
 * Pre-trimmed 4s clip for paid Preview uploads.
 * Avoids client ffmpeg.wasm re-encode of the full ~15s template when available.
 */
export const GTA_5_GOODBYE_AI_VIDEO_PREVIEW_CLIP_PATH =
  '/videos/gta-5-goodbye-ai-video-preview-4s.mp4';

/** ffprobe duration of public/videos/gta-5-goodbye-ai-video-tpl.mp4 */
export const GTA_5_GOODBYE_AI_VIDEO_TEMPLATE_DURATION_SECONDS = 14.668005;

/** Source container is 720×1280 (letterboxed cinematic inside). */
export const GTA_5_GOODBYE_AI_VIDEO_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '9:16';

export const GTA_5_GOODBYE_AI_VIDEO_RESOLUTIONS = ['480p', '720p'] as const;
export type Gta5GoodbyeAiVideoResolution =
  (typeof GTA_5_GOODBYE_AI_VIDEO_RESOLUTIONS)[number];
export const GTA_5_GOODBYE_AI_VIDEO_DEFAULT_RESOLUTION: Gta5GoodbyeAiVideoResolution =
  '480p';

export function isGta5GoodbyeAiVideoResolution(
  value: unknown
): value is Gta5GoodbyeAiVideoResolution {
  return value === '480p' || value === '720p';
}

/**
 * Target mapping only. Complete replacement + preservation live in
 * `buildSeedanceWorkflowPrompt` (objects-swap).
 * @Image 1 = the young woman who waves goodbye / parting driver figure.
 * Keep other people, vehicles, road, and camera path unchanged.
 */
export const GTA_5_GOODBYE_AI_VIDEO_DEFAULT_PROMPT = [
  'Replace the young woman in the dusk goodbye drive — the woman who waves and appears as the parting driver / foreground figure — with @Image 1.',
  "Use @Image 1 for that person's complete face, hair, body, and clothing throughout the clip.",
  'Do not change the other people, cars, motorcycle, road, dusk lighting, camera motion, framing, or timing.',
].join('\n\n');

/** No legacy prompt versions are accepted; new attempts use the current prompt. */
export const LEGACY_GTA_5_GOODBYE_AI_VIDEO_PROMPTS = [] as const;
