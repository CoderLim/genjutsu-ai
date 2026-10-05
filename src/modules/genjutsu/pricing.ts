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

  return (
    packs.find((pack) => pack.credits >= deficit) ??
    packs[packs.length - 1] ??
    null
  );
}

/**
 * Customer-wallet conversion and markup.
 *
 * The provider estimate is authoritative for a concrete generation request.
 * We convert its USD estimate into our own credits here; the browser never
 * supplies the price or number of credits to charge.
 */
export const GENJUTSU_CREDITS_PER_USD = 100;
export const GENJUTSU_PROVIDER_COST_MULTIPLIER = 1.7;

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

export function getCreditPack(id: GenjutsuCreditPackId) {
  if (id === GENJUTSU_SMOKE_CREDIT_PACK.id) return GENJUTSU_SMOKE_CREDIT_PACK;
  return GENJUTSU_CREDIT_PACKS.find((pack) => pack.id === id) ?? null;
}

export function getUsdPerCredit(pack: GenjutsuCreditPack) {
  return pack.priceCents / 100 / pack.credits;
}
