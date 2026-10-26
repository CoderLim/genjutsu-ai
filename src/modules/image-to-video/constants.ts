export const IMAGE_TO_VIDEO_SCENE = 'image-to-video';
export const IMAGE_TO_VIDEO_PROVIDER = 'wavespeed';

/** Locked engine model — not ENV-routed (sd2.5 vs sd2.0). */
export const IMAGE_TO_VIDEO_MODEL =
  'bytedance/seedance-2.0/image-to-video-turbo';

export const IMAGE_TO_VIDEO_MIN_DURATION = 4;
export const IMAGE_TO_VIDEO_MAX_DURATION = 15;
export const IMAGE_TO_VIDEO_DEFAULT_DURATION = 5;

export const IMAGE_TO_VIDEO_RESOLUTIONS = ['720p', '1080p'] as const;
export type ImageToVideoResolution =
  (typeof IMAGE_TO_VIDEO_RESOLUTIONS)[number];
export const IMAGE_TO_VIDEO_DEFAULT_RESOLUTION: ImageToVideoResolution = '720p';

export const IMAGE_TO_VIDEO_ASPECT_RATIOS = [
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '1:1',
  '21:9',
] as const;
export type ImageToVideoAspectRatio =
  (typeof IMAGE_TO_VIDEO_ASPECT_RATIOS)[number];
export const IMAGE_TO_VIDEO_DEFAULT_ASPECT_RATIO: ImageToVideoAspectRatio =
  '9:16';

/** Stale submitting claim → submission_unknown (Worker kill / hang). */
export const IMAGE_TO_VIDEO_SUBMITTING_CLAIM_TTL_MS = 3 * 60 * 1000;

export const IMAGE_TO_VIDEO_MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export function isImageToVideoResolution(
  value: unknown
): value is ImageToVideoResolution {
  return value === '720p' || value === '1080p';
}

export function isImageToVideoAspectRatio(
  value: unknown
): value is ImageToVideoAspectRatio {
  return (
    typeof value === 'string' &&
    (IMAGE_TO_VIDEO_ASPECT_RATIOS as readonly string[]).includes(value)
  );
}

export function assertImageToVideoDuration(duration: number) {
  if (
    !Number.isInteger(duration) ||
    duration < IMAGE_TO_VIDEO_MIN_DURATION ||
    duration > IMAGE_TO_VIDEO_MAX_DURATION
  ) {
    throw new Error(
      `Duration must be an integer between ${IMAGE_TO_VIDEO_MIN_DURATION} and ${IMAGE_TO_VIDEO_MAX_DURATION} seconds`
    );
  }
}
