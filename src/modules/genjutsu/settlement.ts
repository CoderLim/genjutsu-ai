import { calculateGenjutsuCredits } from './pricing';

export function planGenjutsuCreditSettlement(input: {
  reservedCredits: number;
  actualProviderCostUsd: number;
}) {
  if (
    !Number.isSafeInteger(input.reservedCredits) ||
    input.reservedCredits <= 0
  ) {
    throw new Error('reservedCredits must be a positive integer');
  }

  const actualCredits = calculateGenjutsuCredits(input.actualProviderCostUsd);
  const deltaCredits = actualCredits - input.reservedCredits;

  return {
    actualCredits,
    deltaCredits,
    refundCredits: Math.max(0, -deltaCredits),
    additionalCredits: Math.max(0, deltaCredits),
  };
}
