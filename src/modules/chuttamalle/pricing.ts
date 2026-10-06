import { calculateGenjutsuCredits } from '@/modules/genjutsu/pricing';

export const CHUTTAMALLE_MODEL = 'minimax/h3/reference-to-video';

export const CHUTTAMALLE_RESOLUTIONS = ['480P', '768P', '2K', '4K'] as const;
export type ChuttamalleResolution = (typeof CHUTTAMALLE_RESOLUTIONS)[number];

export const CHUTTAMALLE_ASPECT_RATIOS = [
  'adaptive',
  '21:9',
  '16:9',
  '4:3',
  '1:1',
  '3:4',
  '9:16',
] as const;
export type ChuttamalleAspectRatio = (typeof CHUTTAMALLE_ASPECT_RATIOS)[number];

export const CHUTTAMALLE_MIN_DURATION_SECONDS = 5;
export const CHUTTAMALLE_MAX_DURATION_SECONDS = 15;
export const CHUTTAMALLE_MAX_REFERENCE_IMAGES = 2;

/**
 * Fal published rates for `minimax/h3/reference-to-video`
 * (https://fal.ai/models/minimax/h3/reference-to-video):
 * output $0.05/0.06/0.13/0.16 per second at 480P/768P/2K/4K;
 * first 5 reference images free, then $0.08 each.
 * Fal does not publish a separate reference-video surcharge on this endpoint.
 */
export const CHUTTAMALLE_OUTPUT_RATE_USD_PER_SECOND: Record<
  ChuttamalleResolution,
  number
> = {
  '480P': 0.05,
  '768P': 0.06,
  '2K': 0.13,
  '4K': 0.16,
};

export const CHUTTAMALLE_FREE_REFERENCE_IMAGES = 5;
export const CHUTTAMALLE_EXTRA_REFERENCE_IMAGE_USD = 0.08;

export function assertChuttamalleDuration(duration: number) {
  if (
    !Number.isInteger(duration) ||
    duration < CHUTTAMALLE_MIN_DURATION_SECONDS ||
    duration > CHUTTAMALLE_MAX_DURATION_SECONDS
  ) {
    throw new Error(
      `Duration must be an integer between ${CHUTTAMALLE_MIN_DURATION_SECONDS} and ${CHUTTAMALLE_MAX_DURATION_SECONDS} seconds`
    );
  }
}

export function estimateChuttamalleProviderCost(input: {
  duration: number;
  resolution: ChuttamalleResolution;
  imageCount: number;
}) {
  assertChuttamalleDuration(input.duration);
  if (!CHUTTAMALLE_RESOLUTIONS.includes(input.resolution)) {
    throw new Error('Unsupported MiniMax H3 resolution');
  }
  if (
    !Number.isInteger(input.imageCount) ||
    input.imageCount < 1 ||
    input.imageCount > CHUTTAMALLE_MAX_REFERENCE_IMAGES
  ) {
    throw new Error('Provide one or two reference images');
  }

  const outputCost =
    input.duration * CHUTTAMALLE_OUTPUT_RATE_USD_PER_SECOND[input.resolution];
  const referenceImageCost =
    Math.max(0, input.imageCount - CHUTTAMALLE_FREE_REFERENCE_IMAGES) *
    CHUTTAMALLE_EXTRA_REFERENCE_IMAGE_USD;

  return outputCost + referenceImageCost;
}

export function estimateChuttamalleCredits(input: {
  duration: number;
  resolution: ChuttamalleResolution;
  imageCount: number;
}) {
  return calculateGenjutsuCredits(estimateChuttamalleProviderCost(input));
}
