import type { GenjutsuMode } from '@/modules/genjutsu/types';

export const BULIN_47_MODE: GenjutsuMode = 'objects-swap';

export const BULIN_47_TEMPLATE_PATH = '/videos/bulin47-tpl.mp4';
export const BULIN_47_TEMPLATE_POSTER_PATH = '/videos/bulin47-tpl-poster.jpg';

/** Browser-metadata duration of public/videos/bulin47-tpl.mp4 (ffprobe). */
export const BULIN_47_TEMPLATE_DURATION_SECONDS = 15.1;

export const BULIN_47_RESOLUTIONS = ['480p', '720p', '1080p'] as const;
export type Bulin47Resolution = (typeof BULIN_47_RESOLUTIONS)[number];
export const BULIN_47_DEFAULT_RESOLUTION: Bulin47Resolution = '720p';

/**
 * Fixed Objects Swap prompt for the Bulin 47 freestyle preset.
 * Keep the staging; replace only the performer with @Image1.
 */
export const BULIN_47_DEFAULT_PROMPT =
  'Replace the performer in @Video1 with the person in @Image1. Keep the original freestyle moves, camera path, crowd, and timing. Use only this authorized likeness.';

export async function loadBulin47TemplateFile(): Promise<File> {
  const response = await fetch(BULIN_47_TEMPLATE_PATH);
  if (!response.ok) {
    throw new Error('Failed to load the Bulin 47 template video');
  }
  const blob = await response.blob();
  return new File([blob], 'bulin47-tpl.mp4', {
    type: blob.type || 'video/mp4',
  });
}
