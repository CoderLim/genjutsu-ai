/** Shared provider-cost → customer credits markup (same formula as Genjutsu). */
export const AI_CREDITS_PER_USD = 100;
export const AI_PROVIDER_COST_MULTIPLIER = 1.7;

export function calculateProviderCredits(providerCostUsd: number) {
  if (!Number.isFinite(providerCostUsd) || providerCostUsd <= 0) {
    throw new Error('providerCostUsd must be a positive finite number');
  }

  return Math.max(
    1,
    Math.ceil(
      providerCostUsd * AI_CREDITS_PER_USD * AI_PROVIDER_COST_MULTIPLIER
    )
  );
}
