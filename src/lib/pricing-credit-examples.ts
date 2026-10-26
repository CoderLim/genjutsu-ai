/**
 * Representative credit examples for the public Pricing page.
 *
 * Every credit figure is produced by the same estimate helpers the generator
 * UI uses — never a separately maintained price table.
 */

import {
  A2O_LITE_AI_ASPECT_RATIO,
  A2O_LITE_AI_DEFAULT_RESOLUTION,
  A2O_LITE_AI_TEMPLATE_DURATION_SECONDS,
} from '@/modules/a2o-lite-ai/constants';
import { resolveA2oLiteAiProviderTarget } from '@/modules/a2o-lite-ai/provider';
import {
  estimateGenjutsuCredits,
  estimateGenjutsuCreditsForProvider,
  type GenjutsuBillableResolution,
} from '@/modules/genjutsu/pricing';
import type { GenjutsuProvider } from '@/modules/genjutsu/types';

/** Paid short Preview clip length used across Seedance product panels. */
export const PRICING_EXAMPLE_PREVIEW_DURATION_SECONDS = 4;

/** Representative homepage Genjutsu settings for Pricing examples. */
export const PRICING_EXAMPLE_MOTION_DURATION_SECONDS = 5;
export const PRICING_EXAMPLE_MOTION_RESOLUTION: GenjutsuBillableResolution =
  '720p';

export type PricingCreditExampleId =
  | 'motion-transfer'
  | 'object-swap'
  | 'a2o-lite';

export type PricingCreditExample = {
  id: PricingCreditExampleId;
  href: string;
  /** Whole seconds shown in the UI (ceil of source duration when fractional). */
  durationSeconds: number;
  resolution: GenjutsuBillableResolution;
  credits: number;
  /** Present when the product offers a separately billed Preview. */
  preview?: {
    durationSeconds: number;
    resolution: GenjutsuBillableResolution;
    credits: number;
  };
};

function a2oEstimateProvider(): GenjutsuProvider {
  return resolveA2oLiteAiProviderTarget().provider;
}

/**
 * Builds the three Pricing-page examples from live estimate helpers.
 * Safe to call during SSR — sync, no network, no credit reservation.
 */
export function listPricingCreditExamples(): PricingCreditExample[] {
  const motionCredits = estimateGenjutsuCredits({
    durationSeconds: PRICING_EXAMPLE_MOTION_DURATION_SECONDS,
    resolution: PRICING_EXAMPLE_MOTION_RESOLUTION,
  });

  const a2oProvider = a2oEstimateProvider();
  const a2oCredits = estimateGenjutsuCreditsForProvider({
    provider: a2oProvider,
    durationSeconds: A2O_LITE_AI_TEMPLATE_DURATION_SECONDS,
    resolution: A2O_LITE_AI_DEFAULT_RESOLUTION,
    aspectRatio: A2O_LITE_AI_ASPECT_RATIO,
  });
  const a2oPreviewCredits = estimateGenjutsuCreditsForProvider({
    provider: a2oProvider,
    durationSeconds: PRICING_EXAMPLE_PREVIEW_DURATION_SECONDS,
    resolution: '480p',
    aspectRatio: A2O_LITE_AI_ASPECT_RATIO,
  });

  return [
    {
      id: 'motion-transfer',
      href: '/',
      durationSeconds: PRICING_EXAMPLE_MOTION_DURATION_SECONDS,
      resolution: PRICING_EXAMPLE_MOTION_RESOLUTION,
      credits: motionCredits,
    },
    {
      id: 'object-swap',
      href: '/',
      durationSeconds: PRICING_EXAMPLE_MOTION_DURATION_SECONDS,
      resolution: PRICING_EXAMPLE_MOTION_RESOLUTION,
      credits: motionCredits,
    },
    {
      id: 'a2o-lite',
      href: '/a2o-lite-ai',
      durationSeconds: Math.ceil(A2O_LITE_AI_TEMPLATE_DURATION_SECONDS),
      resolution: A2O_LITE_AI_DEFAULT_RESOLUTION,
      credits: a2oCredits,
      preview: {
        durationSeconds: PRICING_EXAMPLE_PREVIEW_DURATION_SECONDS,
        resolution: '480p',
        credits: a2oPreviewCredits,
      },
    },
  ];
}
