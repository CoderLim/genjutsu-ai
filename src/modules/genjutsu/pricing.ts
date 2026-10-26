import {
  AI_CREDITS_PER_USD,
  AI_PROVIDER_COST_MULTIPLIER,
  calculateProviderCredits,
} from '@/lib/ai-credits';

import { estimateHiggsfieldSeedanceTokenCost } from './seedance-higgsfield';

/** @deprecated Prefer AI_CREDITS_PER_USD from @/lib/ai-credits */
export { AI_CREDITS_PER_USD as GENJUTSU_CREDITS_PER_USD };
/** @deprecated Prefer AI_PROVIDER_COST_MULTIPLIER from @/lib/ai-credits */
export { AI_PROVIDER_COST_MULTIPLIER as GENJUTSU_PROVIDER_COST_MULTIPLIER };

export type GenjutsuBillableResolution = '480p' | '720p' | '1080p';

export type GenjutsuPublicCreditPackId =
  | 'starter'
  | 'creator'
  | 'pro'
  | 'studio';

export type GenjutsuCreditPackId = GenjutsuPublicCreditPackId | 'smoke';

export type GenjutsuCreditPack = {
  id: GenjutsuCreditPackId;
  name: string;
  priceCents: number;
  currency?: 'usd' | 'cny';
  credits: number;
  highlighted?: boolean;
};

/** Internal smoke pack — UI + checkout only for emails containing this needle. */
export const SMOKE_PACK_EMAIL_NEEDLE = 'gengliming';

export const GENJUTSU_SMOKE_CREDIT_PACK: GenjutsuCreditPack = {
  id: 'smoke',
  name: 'Smoke',
  // ¥1.00 CNY internal smoke charge (Waffo Live minimum).
  priceCents: 100,
  currency: 'cny',
  credits: 50,
};

export function canSeeSmokeCreditPack(email?: string | null): boolean {
  return Boolean(
    email && email.toLowerCase().includes(SMOKE_PACK_EMAIL_NEEDLE)
  );
}

export function listVisibleCreditPacks(
  email?: string | null
): readonly GenjutsuCreditPack[] {
  if (canSeeSmokeCreditPack(email)) {
    return [...GENJUTSU_CREDIT_PACKS, GENJUTSU_SMOKE_CREDIT_PACK];
  }
  return GENJUTSU_CREDIT_PACKS;
}

export function getSmallestSufficientCreditPack(params: {
  balance: number;
  requiredCredits: number;
  email?: string | null;
}): GenjutsuCreditPack | null {
  const deficit = Math.max(0, params.requiredCredits - params.balance);
  if (deficit <= 0) return null;

  const packs = [...listVisibleCreditPacks(params.email)].sort(
    (a, b) => a.credits - b.credits || a.priceCents - b.priceCents
  );

  return packs.find((pack) => pack.credits >= deficit) ?? null;
}

/**
 * Customer-wallet conversion and markup.
 *
 * The provider estimate is authoritative for a concrete generation request.
 * We convert its USD estimate into our own credits here; the browser never
 * supplies the price or number of credits to charge.
 */
/**
 * Public Higgsfield Genjutsu list rates as of 2026-09-30.
 *
 * These are useful for UI/fallback estimates and tests only. Production
 * generation charging uses Higgsfield POST /estimate/<model> with the exact
 * generation body.
 */
export const GENJUTSU_LIST_RATE_USD_PER_SECOND: Record<
  GenjutsuBillableResolution,
  number
> = {
  '480p': 0.318,
  '720p': 0.681,
  '1080p': 1.632,
};

/**
 * Seedance 2.5 video-reference list rates. Billing includes both the source
 * video seconds and generated output seconds. Volcengine intentionally uses
 * the same customer-facing quote while the provider-cost migration is active.
 */
export const SEEDANCE_VIDEO_REFERENCE_RATE_USD_PER_BILLED_SECOND: Record<
  GenjutsuBillableResolution,
  number
> = {
  '480p': 0.15876,
  '720p': 0.34056,
  '1080p': 0.8377668,
};

/**
 * V1 USD prices with V2-aligned unit economics (higher $/credit).
 * Keep previous paid orders as immutable snapshots.
 */
export const GENJUTSU_CREDIT_PACKS: readonly GenjutsuCreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceCents: 499,
    credits: 400,
  },
  {
    id: 'creator',
    name: 'Creator',
    priceCents: 999,
    credits: 850,
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceCents: 1999,
    credits: 1750,
  },
  {
    id: 'studio',
    name: 'Studio',
    priceCents: 3999,
    credits: 3600,
  },
] as const;

export function calculateGenjutsuCredits(providerCostUsd: number) {
  return calculateProviderCredits(providerCostUsd);
}

export function estimateGenjutsuListCost(input: {
  durationSeconds: number;
  resolution: GenjutsuBillableResolution;
}) {
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) {
    throw new Error('durationSeconds must be a positive finite number');
  }

  // Higgsfield trims Genjutsu source video to 30 seconds and bills whole
  // input seconds rounded upward.
  const billedSeconds = Math.min(30, Math.ceil(input.durationSeconds));
  return billedSeconds * GENJUTSU_LIST_RATE_USD_PER_SECOND[input.resolution];
}

export function estimateGenjutsuCredits(input: {
  durationSeconds: number;
  resolution: GenjutsuBillableResolution;
}) {
  return calculateGenjutsuCredits(estimateGenjutsuListCost(input));
}

export function estimateSeedanceListCost(input: {
  durationSeconds: number;
  resolution: GenjutsuBillableResolution;
}) {
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) {
    throw new Error('durationSeconds must be a positive finite number');
  }

  const outputSeconds = Math.min(30, Math.max(4, input.durationSeconds));
  const billedSeconds = input.durationSeconds + outputSeconds;
  return (
    billedSeconds *
    SEEDANCE_VIDEO_REFERENCE_RATE_USD_PER_BILLED_SECOND[input.resolution]
  );
}

export function estimateSeedanceCredits(input: {
  durationSeconds: number;
  resolution: GenjutsuBillableResolution;
}) {
  return calculateGenjutsuCredits(estimateSeedanceListCost(input));
}

/** Approximate browser price only; reservation always quotes the server provider. */
export function estimateGenjutsuCreditsForProvider(input: {
  provider:
    | 'higgsfield'
    | 'seedance'
    | 'seedance-volcengine'
    | 'seedance-higgsfield'
    | 'seedance-seeapi'
    | 'seedance-wavespeed';
  durationSeconds: number;
  resolution: GenjutsuBillableResolution;
  /** Required for seedance-higgsfield token pricing (output pixel grid). */
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9';
}) {
  if (input.provider === 'higgsfield') {
    return estimateGenjutsuCredits(input);
  }
  if (input.provider === 'seedance-higgsfield') {
    return calculateGenjutsuCredits(
      estimateHiggsfieldSeedanceTokenCost({
        resolution: input.resolution,
        aspectRatio: input.aspectRatio || '3:4',
        sourceDurationSeconds: input.durationSeconds,
      }).providerCostUsd
    );
  }
  // seedance / seedance-volcengine / seedance-seeapi / seedance-wavespeed:
  // customer quote uses list rate
  return estimateSeedanceCredits(input);
}

export function getCreditPack(id: GenjutsuCreditPackId) {
  if (id === GENJUTSU_SMOKE_CREDIT_PACK.id) return GENJUTSU_SMOKE_CREDIT_PACK;
  return GENJUTSU_CREDIT_PACKS.find((pack) => pack.id === id) ?? null;
}

export function getUsdPerCredit(pack: GenjutsuCreditPack) {
  return pack.priceCents / 100 / pack.credits;
}
