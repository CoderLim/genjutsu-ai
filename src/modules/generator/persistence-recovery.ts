/**
 * Provider completion has already been verified. Failure to persist its
 * output is NOT an upstream generation failure and must never auto-refund
 * or resubmit. Allow a few lease-based retries before manual review.
 */
export const GENERATOR_PERSISTENCE_REVIEW_THRESHOLD = 3;

export function nextGeneratorPersistenceFailure(previous: unknown) {
  const count = typeof previous === 'number' &&
    Number.isSafeInteger(previous) && previous > 0 ? previous : 0;
  const failures = Math.min(GENERATOR_PERSISTENCE_REVIEW_THRESHOLD, count + 1);
  return {
    failures,
    needsReview: failures >= GENERATOR_PERSISTENCE_REVIEW_THRESHOLD,
  };
}
