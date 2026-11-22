/**
 * A provider query/result-fetch error is not proof that generation failed.
 * Stop automatic polling after repeated inconclusive lookups; let an admin
 * review the saved upstream request and account billing.
 */
export const GENERATOR_QUERY_FAILURE_REVIEW_THRESHOLD = 3;

export function nextGeneratorQueryFailure(previous: unknown) {
  const count = typeof previous === 'number' &&
    Number.isSafeInteger(previous) && previous > 0 ? previous : 0;
  const failures = Math.min(GENERATOR_QUERY_FAILURE_REVIEW_THRESHOLD, count + 1);
  return {
    failures,
    needsReview: failures >= GENERATOR_QUERY_FAILURE_REVIEW_THRESHOLD,
  };
}
