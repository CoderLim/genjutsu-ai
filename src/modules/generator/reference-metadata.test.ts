import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertReferenceAudioDuration,
  referenceVideoBillableSeconds,
} from './reference-metadata';

test('video input quote: per-clip minimum and final ceil', () => {
  assert.equal(referenceVideoBillableSeconds([]), 0);
  assert.equal(referenceVideoBillableSeconds([1]), 2);
  assert.equal(referenceVideoBillableSeconds([3.2, 1.2, 4.01]), 10);
  assert.equal(referenceVideoBillableSeconds([5, 5, 5]), 15);
});
test('rejects unknown duration and clips exceeding the capped input', () => {
  assert.throws(() => referenceVideoBillableSeconds([NaN]));
  assert.throws(() => referenceVideoBillableSeconds([Infinity]));
  assert.throws(() => referenceVideoBillableSeconds([8,8]), /Combined/);
  assert.throws(() => referenceVideoBillableSeconds([1,1,1,1]), /Maximum/);
});
test('audio clip and total duration limits', () => {
  assert.doesNotThrow(() => assertReferenceAudioDuration([4,3,7]));
  assert.throws(() => assertReferenceAudioDuration([10,8]), /Combined/);
  assert.throws(() => assertReferenceAudioDuration([16]), /between/);
});
