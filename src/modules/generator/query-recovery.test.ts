import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GENERATOR_QUERY_FAILURE_REVIEW_THRESHOLD,
  nextGeneratorQueryFailure,
} from './query-recovery';

test('three consecutive inconclusive provider lookups require manual review', () => {
  assert.equal(GENERATOR_QUERY_FAILURE_REVIEW_THRESHOLD, 3);
  const first = nextGeneratorQueryFailure(undefined);
  assert.deepEqual(first, { failures: 1, needsReview: false });
  const second = nextGeneratorQueryFailure(first.failures);
  assert.deepEqual(second, { failures: 2, needsReview: false });
  const third = nextGeneratorQueryFailure(second.failures);
  assert.deepEqual(third, { failures: 3, needsReview: true });
  assert.deepEqual(nextGeneratorQueryFailure(third.failures), third);
});

test('invalid/stale query counters reset safely rather than immediately triggering review', () => {
  for (const previous of [null, NaN, -1, 1.5, '3', Infinity]) {
    assert.deepEqual(nextGeneratorQueryFailure(previous), {
      failures: 1, needsReview: false,
    });
  }
  // The service clears the stored count when Fal reports processing.
  assert.equal(nextGeneratorQueryFailure(undefined).failures, 1);
});
