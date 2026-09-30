export type GenjutsuBillableResolution = '480p' | '720p';

export type GenjutsuCreditPack = {
  id: 'starter' | 'creator' | 'pro' | 'studio';
  name: string;
  priceCents: number;
  credits: number;
  highlighted?: boolean;
};

/**
 * Pricing decision (2026-09-30).
 *
 * 100 credits represent roughly $1 of customer wallet value at the Starter
 * pack. Generation credits are derived from provider cost, not hard-coded
 * per action, so provider price changes can be absorbed without changing the
 * pack catalog.
 */
export const GENJUTSU_CREDITS_PER_USD = 100;
export const GENJUTSU_PROVIDER_COST_MULTIPLIER = 1.7;

/**
 * Higgsfield's published Genjutsu list rates as of 2026-09-30, before
 * account/customer discounts. Use these only as a conservative fallback
 * estimate when an authoritative provider quote is not available.
 *
 * Input duration is billed in whole seconds (rounded up).
 */
export const GENJUTSU_LIST_RATE_USD_PER_SECOND: Record<
  GenjutsuBillableResolution,
  number
> = {
  '480p': 0.318,
  '720p': 0.681,
};

export const GENJUTSU_CREDIT_PACKS: readonly GenjutsuCreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceCents: 499,
    credits: 500,
  },
  {
    id: 'creator',
    name: 'Creator',
    priceCents: 999,
    credits: 1100,
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceCents: 1999,
    credits: 2400,
  },
  {
    id: 'studio',
    name: 'Studio',
    priceCents: 3999,
    credits: 5000,
  },
] as const;

export function calculateGenjutsuCredits(providerCostUsd: number) {
  if (!Number.isFinite(providerCostUsd) || providerCostUsd <= 0) {
    throw new Error('providerCostUsd must be a positive finite number');
  }

  return Math.max(
    1,
    Math.ceil(
      providerCostUsd *
        GENJUTSU_CREDITS_PER_USD *
        GENJUTSU_PROVIDER_COST_MULTIPLIER
    )
  );
}

export function estimateGenjutsuListCost(input: {
  durationSeconds: number;
  resolution: GenjutsuBillableResolution;
}) {
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) {
    throw new Error('durationSeconds must be a positive finite number');
  }

  const billedSeconds = Math.ceil(input.durationSeconds);
  return billedSeconds * GENJUTSU_LIST_RATE_USD_PER_SECOND[input.resolution];
}

export function estimateGenjutsuCredits(input: {
  durationSeconds: number;
  resolution: GenjutsuBillableResolution;
}) {
  return calculateGenjutsuCredits(estimateGenjutsuListCost(input));
}

export function getCreditPack(id: GenjutsuCreditPack['id']) {
  return GENJUTSU_CREDIT_PACKS.find((pack) => pack.id === id) ?? null;
}

export function getUsdPerCredit(pack: GenjutsuCreditPack) {
  return pack.priceCents / 100 / pack.credits;
}
