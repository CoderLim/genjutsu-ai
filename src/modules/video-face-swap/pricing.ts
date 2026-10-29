import { calculateProviderCredits } from '@/lib/ai-credits';

import {
  assertVideoFaceSwapDurationSeconds,
  VIDEO_FACE_SWAP_MIN_BILLABLE_SECONDS,
  VIDEO_FACE_SWAP_PRICING_VERSION,
  type VideoFaceSwapResolution,
} from './constants';

/** WaveSpeed video-head-swap published rates ($ per second of billed duration). */
export const VIDEO_FACE_SWAP_RATE_USD_PER_SECOND: Record<
  VideoFaceSwapResolution,
  number
> = {
  '480p': 0.04,
  '720p': 0.08,
};

export function billableSecondsForVideoFaceSwap(durationSeconds: number) {
  assertVideoFaceSwapDurationSeconds(durationSeconds);
  return Math.max(
    VIDEO_FACE_SWAP_MIN_BILLABLE_SECONDS,
    Math.ceil(durationSeconds)
  );
}

export function estimateVideoFaceSwapProviderCost(input: {
  durationSeconds: number;
  resolution: VideoFaceSwapResolution;
}) {
  const billableSeconds = billableSecondsForVideoFaceSwap(
    input.durationSeconds
  );
  const rate = VIDEO_FACE_SWAP_RATE_USD_PER_SECOND[input.resolution];
  if (!rate) throw new Error('Unsupported resolution');
  const providerCostUsd = Number((billableSeconds * rate).toFixed(6));
  return {
    providerCostUsd,
    billableSeconds,
    pricingVersion: VIDEO_FACE_SWAP_PRICING_VERSION,
    source: 'wavespeed_video_head_swap' as const,
    payload: {
      durationSeconds: input.durationSeconds,
      billableSeconds,
      resolution: input.resolution,
      rateUsdPerSecond: rate,
    },
  };
}

export function estimateVideoFaceSwapCredits(input: {
  durationSeconds: number;
  resolution: VideoFaceSwapResolution;
}) {
  return calculateProviderCredits(
    estimateVideoFaceSwapProviderCost(input).providerCostUsd
  );
}
