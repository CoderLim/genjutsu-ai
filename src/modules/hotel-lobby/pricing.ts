import { calculateGenjutsuCredits } from '@/modules/genjutsu/pricing';

export const HOTEL_LOBBY_MODEL = 'minimax/h3/reference-to-video';

export const HOTEL_LOBBY_RESOLUTIONS = ['480P', '768P', '2K', '4K'] as const;
export type HotelLobbyResolution = (typeof HOTEL_LOBBY_RESOLUTIONS)[number];

export const HOTEL_LOBBY_ASPECT_RATIOS = [
  'adaptive',
  '21:9',
  '16:9',
  '4:3',
  '1:1',
  '3:4',
  '9:16',
] as const;
export type HotelLobbyAspectRatio =
  (typeof HOTEL_LOBBY_ASPECT_RATIOS)[number];

export const HOTEL_LOBBY_MIN_DURATION_SECONDS = 5;
export const HOTEL_LOBBY_MAX_DURATION_SECONDS = 15;
export const HOTEL_LOBBY_MAX_REFERENCE_IMAGES = 9;

const OUTPUT_RATE_USD_PER_SECOND: Record<HotelLobbyResolution, number> = {
  '480P': 0.05,
  '768P': 0.06,
  '2K': 0.13,
  '4K': 0.16,
};

const FREE_REFERENCE_IMAGES = 5;
const EXTRA_REFERENCE_IMAGE_USD = 0.08;

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

export function estimateHotelLobbyProviderCost(input: {
  duration: number;
  resolution: HotelLobbyResolution;
  imageCount: number;
}) {
  assertHotelLobbyDuration(input.duration);
  if (!HOTEL_LOBBY_RESOLUTIONS.includes(input.resolution)) {
    throw new Error('Unsupported MiniMax H3 resolution');
  }
  if (
    !Number.isInteger(input.imageCount) ||
    input.imageCount < 1 ||
    input.imageCount > HOTEL_LOBBY_MAX_REFERENCE_IMAGES
  ) {
    throw new Error('Provide between 1 and 9 reference images');
  }

  const outputCost =
    input.duration * OUTPUT_RATE_USD_PER_SECOND[input.resolution];
  const referenceImageCost =
    Math.max(0, input.imageCount - FREE_REFERENCE_IMAGES) *
    EXTRA_REFERENCE_IMAGE_USD;

  return outputCost + referenceImageCost;
}

export function estimateHotelLobbyCredits(input: {
  duration: number;
  resolution: HotelLobbyResolution;
  imageCount: number;
}) {
  return calculateGenjutsuCredits(estimateHotelLobbyProviderCost(input));
}
