import { calculateProviderCredits } from '@/lib/ai-credits';

import {
  assertImageToVideoDuration,
  type ImageToVideoResolution,
} from './constants';

/**
 * WaveSpeed Seedance 2.0 image-to-video (standard, non-turbo) published rates
 * ($ per second). Derived from 5s table: 480p $0.60 / 720p $1.20 / 1080p $3.00.
 */
export const IMAGE_TO_VIDEO_RATE_USD_PER_SECOND: Record<
  ImageToVideoResolution,
  number
> = {
  '480p': 0.12,
  '720p': 0.24,
  '1080p': 0.6,
};

export function estimateImageToVideoProviderCost(input: {
  duration: number;
  resolution: ImageToVideoResolution;
}) {
  assertImageToVideoDuration(input.duration);
  const rate = IMAGE_TO_VIDEO_RATE_USD_PER_SECOND[input.resolution];
  if (!rate) throw new Error('Unsupported resolution');
  return {
    providerCostUsd: input.duration * rate,
    source: 'wavespeed_seedance_2_0_i2v' as const,
    payload: {
      duration: input.duration,
      resolution: input.resolution,
      rateUsdPerSecond: rate,
    },
  };
}

export function estimateImageToVideoCredits(input: {
  duration: number;
  resolution: ImageToVideoResolution;
}) {
  return calculateProviderCredits(
    estimateImageToVideoProviderCost(input).providerCostUsd
  );
}
