/**
 * Genjutsu V2 catalog amounts must never be silently replaced by stale
 * provider-specific *_test_amount values. That would also flow into Waffo's
 * authenticated priceSnapshot and could grant full credits for cents.
 *
 * The only permitted override is the internal smoke pack on Waffo TEST.
 */
export function resolveGenjutsuCheckoutAmount(input: {
  catalogAmountCents: number;
  productId: string;
  provider: string;
  providerEnvironment?: string;
  testAmountRaw?: string;
}): number {
  if (
    !Number.isSafeInteger(input.catalogAmountCents) ||
    input.catalogAmountCents <= 0
  ) {
    throw new Error('Invalid catalog amount');
  }

  const testAmount = input.testAmountRaw?.trim() ?? '';
  if (!testAmount || testAmount === '0') {
    return input.catalogAmountCents;
  }

  // Fail closed for ALL public SKUs, including unexpected or malformed values.
  if (
    input.productId !== 'smoke' ||
    input.provider !== 'waffo' ||
    input.providerEnvironment !== 'test'
  ) {
    throw new Error(
      'Test payment amount override is not allowed for this checkout. Clear the provider test amount setting.'
    );
  }

  if (!/^[1-9]\d*$/.test(testAmount)) {
    throw new Error('Invalid test payment amount');
  }
  const cents = Number(testAmount);
  if (!Number.isSafeInteger(cents)) {
    throw new Error('Invalid test payment amount');
  }
  return cents;
}
