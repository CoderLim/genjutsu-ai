import { calculateProviderCredits } from '@/lib/ai-credits';

import {
  assertImageToVideoDuration,
  type ImageToVideoResolution,
} from './constants';

/** WaveSpeed Seedance 2.0 image-to-video-turbo published rates ($ per second). */
export const IMAGE_TO_VIDEO_RATE_USD_PER_SECOND: Record<
  ImageToVideoResolution,
  number
> = {
  '720p': 0.14,
  '1080p': 0.16,
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
    source: 'wavespeed_seedance_2_0_i2v_turbo' as const,
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
