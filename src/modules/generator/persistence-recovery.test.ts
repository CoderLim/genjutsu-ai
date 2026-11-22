import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GENERATOR_PERSISTENCE_REVIEW_THRESHOLD,
  nextGeneratorPersistenceFailure,
} from './persistence-recovery';

test('persist errors retry twice before requiring operator review', () => {
  assert.equal(GENERATOR_PERSISTENCE_REVIEW_THRESHOLD, 3);
  const once = nextGeneratorPersistenceFailure(undefined);
  assert.deepEqual(once, { failures: 1, needsReview: false });
  const twice = nextGeneratorPersistenceFailure(once.failures);
  assert.deepEqual(twice, { failures: 2, needsReview: false });
  const thrice = nextGeneratorPersistenceFailure(twice.failures);
  assert.deepEqual(thrice, { failures: 3, needsReview: true });
  assert.deepEqual(nextGeneratorPersistenceFailure(thrice.failures), thrice);
});

test('bad or old persisted counters cannot prematurely escalate', () => {
  for (const value of [undefined, null, '3', -1, 2.4, Infinity, NaN]) {
    assert.deepEqual(nextGeneratorPersistenceFailure(value),
      { failures: 1, needsReview: false });
  }
});
