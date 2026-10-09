import { calculateGenjutsuCredits } from '@/modules/genjutsu/pricing';

/** Hotel Lobby product: Kling O3 standard video-to-video edit. */
export const HOTEL_LOBBY_MODEL =
  'fal-ai/kling-video/o3/standard/video-to-video/edit';

/** Internal H3 lab still uses MiniMax H3 reference-to-video. */
export const H3_LAB_MODEL = 'minimax/h3/reference-to-video';

/**
 * Fal published rate for Kling O3 standard V2V edit
 * (https://fal.ai/models/fal-ai/kling-video/o3/standard/video-to-video/edit):
 * $0.126 per second of generated video.
 */
export const HOTEL_LOBBY_OUTPUT_RATE_USD_PER_SECOND = 0.126;

/** Kling O3 accepts 3–15s reference video (OpenAPI max_duration 15.05). */
export const HOTEL_LOBBY_MIN_DURATION_SECONDS = 3;
export const HOTEL_LOBBY_MAX_DURATION_SECONDS = 15;

/**
 * Fal OpenAPI `maxLength` for Kling O3 V2V edit prompt
 * (https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/kling-video/o3/standard/video-to-video/edit).
 */
export const HOTEL_LOBBY_MAX_PROMPT_LENGTH = 2500;

/** Hotel Lobby product preset: one or two subject photos → Elements. */
export const HOTEL_LOBBY_MAX_REFERENCE_IMAGES = 2;

/**
 * Billing / options placeholder — Kling O3 does not take a resolution
 * parameter. Kept so reserved-task matching and admin tooling stay stable.
 */
export const HOTEL_LOBBY_BILLING_RESOLUTION = '480P' as const;

// --- MiniMax H3 (internal lab only) -----------------------------------------

export const H3_RESOLUTIONS = ['480P', '768P', '2K', '4K'] as const;
export type H3Resolution = (typeof H3_RESOLUTIONS)[number];

/** @deprecated Prefer H3_RESOLUTIONS — alias kept for lab + admin imports. */
export const HOTEL_LOBBY_RESOLUTIONS = H3_RESOLUTIONS;
export type HotelLobbyResolution = H3Resolution;

export const HOTEL_LOBBY_ASPECT_RATIOS = [
  'adaptive',
  '21:9',
  '16:9',
  '4:3',
  '1:1',
  '3:4',
  '9:16',
] as const;
export type HotelLobbyAspectRatio = (typeof HOTEL_LOBBY_ASPECT_RATIOS)[number];

/** MiniMax H3 model limit for `reference_image_urls`. */
export const H3_MAX_REFERENCE_IMAGES = 9;
/**
 * Fal OpenAPI `maxLength` for `minimax/h3/reference-to-video` prompt
 * (https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=minimax/h3/reference-to-video).
 */
export const H3_MAX_PROMPT_LENGTH = 50_000;

export const H3_MIN_DURATION_SECONDS = 5;
export const H3_MAX_DURATION_SECONDS = 15;

/**
 * Fal published rates for `minimax/h3/reference-to-video`
 * (https://fal.ai/models/minimax/h3/reference-to-video):
 * output $0.05/0.06/0.13/0.16 per second at 480P/768P/2K/4K;
 * first 5 reference images free, then $0.08 each.
 */
export const H3_OUTPUT_RATE_USD_PER_SECOND: Record<H3Resolution, number> = {
  '480P': 0.05,
  '768P': 0.06,
  '2K': 0.13,
  '4K': 0.16,
};

/** @deprecated Prefer H3_OUTPUT_RATE_USD_PER_SECOND. */
export const HOTEL_LOBBY_OUTPUT_RATE_USD_PER_SECOND_BY_RESOLUTION =
  H3_OUTPUT_RATE_USD_PER_SECOND;

export const H3_FREE_REFERENCE_IMAGES = 5;
export const H3_EXTRA_REFERENCE_IMAGE_USD = 0.08;

export function assertHotelLobbyDuration(duration: number) {
  if (
    !Number.isInteger(duration) ||
    duration < HOTEL_LOBBY_MIN_DURATION_SECONDS ||
    duration > HOTEL_LOBBY_MAX_DURATION_SECONDS
  ) {
    throw new Error(
      `Duration must be an integer between ${HOTEL_LOBBY_MIN_DURATION_SECONDS} and ${HOTEL_LOBBY_MAX_DURATION_SECONDS} seconds`
    );
  }
}

export function assertH3LabDuration(duration: number) {
  if (
    !Number.isInteger(duration) ||
    duration < H3_MIN_DURATION_SECONDS ||
    duration > H3_MAX_DURATION_SECONDS
  ) {
    throw new Error(
      `Duration must be an integer between ${H3_MIN_DURATION_SECONDS} and ${H3_MAX_DURATION_SECONDS} seconds`
    );
  }
}

export function estimateHotelLobbyProviderCost(input: {
  duration: number;
  imageCount: number;
  maxImages?: number;
}) {
  assertHotelLobbyDuration(input.duration);
  const maxImages = input.maxImages ?? HOTEL_LOBBY_MAX_REFERENCE_IMAGES;
  if (
    !Number.isInteger(maxImages) ||
    maxImages < 1 ||
    maxImages > HOTEL_LOBBY_MAX_REFERENCE_IMAGES
  ) {
    throw new Error('Invalid max reference-image count');
  }
  if (
    !Number.isInteger(input.imageCount) ||
    input.imageCount < 1 ||
    input.imageCount > maxImages
  ) {
    throw new Error(
      maxImages === 1
        ? 'Provide one reference image'
        : `Provide between 1 and ${maxImages} reference images`
    );
  }

  // Avoid binary float noise (e.g. 15 * 0.126 → 1.8900000000000001).
  return Number(
    (input.duration * HOTEL_LOBBY_OUTPUT_RATE_USD_PER_SECOND).toFixed(6)
  );
}

export function estimateHotelLobbyCredits(input: {
  duration: number;
  imageCount: number;
  maxImages?: number;
  /** Ignored — Kling O3 has no resolution tiers. Accepted for call-site compat. */
  resolution?: HotelLobbyResolution;
}) {
  return calculateGenjutsuCredits(
    estimateHotelLobbyProviderCost({
      duration: input.duration,
      imageCount: input.imageCount,
      maxImages: input.maxImages,
    })
  );
}

export function estimateH3LabProviderCost(input: {
  duration: number;
  resolution: HotelLobbyResolution;
  imageCount: number;
}) {
  assertH3LabDuration(input.duration);
  if (!H3_RESOLUTIONS.includes(input.resolution)) {
    throw new Error('Unsupported MiniMax H3 resolution');
  }
  if (
    !Number.isInteger(input.imageCount) ||
    input.imageCount < 1 ||
    input.imageCount > H3_MAX_REFERENCE_IMAGES
  ) {
    throw new Error(
      `Provide between 1 and ${H3_MAX_REFERENCE_IMAGES} reference images`
    );
  }

  const outputCost =
    input.duration * H3_OUTPUT_RATE_USD_PER_SECOND[input.resolution];
  const referenceImageCost =
    Math.max(0, input.imageCount - H3_FREE_REFERENCE_IMAGES) *
    H3_EXTRA_REFERENCE_IMAGE_USD;

  return outputCost + referenceImageCost;
}

export function estimateH3LabCredits(input: {
  duration: number;
  resolution: HotelLobbyResolution;
  imageCount: number;
}) {
  return calculateGenjutsuCredits(estimateH3LabProviderCost(input));
}
