export const VIDEO_FACE_SWAP_SCENE = 'video-face-swap';
export const VIDEO_FACE_SWAP_PROVIDER = 'wavespeed';

/** Locked engine model — WaveSpeed Video Head Swap (not video-face-swap). */
export const VIDEO_FACE_SWAP_MODEL = 'wavespeed-ai/video-head-swap';

export const VIDEO_FACE_SWAP_MIN_DURATION_SECONDS = 3;
export const VIDEO_FACE_SWAP_MAX_DURATION_SECONDS = 30;
export const VIDEO_FACE_SWAP_MIN_BILLABLE_SECONDS = 3;
/** Paid preview clip length (homepage Genjutsu semantics). */
export const VIDEO_FACE_SWAP_PREVIEW_DURATION_SECONDS = 4;

export const VIDEO_FACE_SWAP_RESOLUTIONS = ['480p', '720p'] as const;
export type VideoFaceSwapResolution =
  (typeof VIDEO_FACE_SWAP_RESOLUTIONS)[number];
/** Product default; official API default is 480p — revisit after P0. */
export const VIDEO_FACE_SWAP_DEFAULT_RESOLUTION: VideoFaceSwapResolution =
  '720p';
export const VIDEO_FACE_SWAP_PREVIEW_RESOLUTION: VideoFaceSwapResolution =
  '480p';

export const VIDEO_FACE_SWAP_PRICING_VERSION = 'vfs-head-swap-v1';
export const VIDEO_FACE_SWAP_CONSENT_VERSION = 'v1';

export const VIDEO_FACE_SWAP_SUBMITTING_CLAIM_TTL_MS = 3 * 60 * 1000;
export const VIDEO_FACE_SWAP_COMPLETING_CLAIM_TTL_MS = 3 * 60 * 1000;
export const VIDEO_FACE_SWAP_RECONCILE_MIN_AGE_MS = 2 * 60 * 1000;
export const VIDEO_FACE_SWAP_RECONCILE_BATCH_LIMIT = 25;

export const VIDEO_FACE_SWAP_MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const VIDEO_FACE_SWAP_MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export const VIDEO_FACE_SWAP_MAX_USER_INSTRUCTIONS_CHARS = 500;

export function isVideoFaceSwapResolution(
  value: unknown
): value is VideoFaceSwapResolution {
  return value === '480p' || value === '720p';
}

export function assertVideoFaceSwapDurationSeconds(duration: number) {
  if (
    !Number.isFinite(duration) ||
    duration < VIDEO_FACE_SWAP_MIN_DURATION_SECONDS ||
    duration > VIDEO_FACE_SWAP_MAX_DURATION_SECONDS
  ) {
    throw new Error(
      `Source video must be between ${VIDEO_FACE_SWAP_MIN_DURATION_SECONDS} and ${VIDEO_FACE_SWAP_MAX_DURATION_SECONDS} seconds`
    );
  }
}
