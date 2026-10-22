import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ImagePrepareSequencer,
  MultiSlotImagePrepareSequencer,
} from '@/lib/image-prepare-sequencer';

/**
 * Hooks wrap ImagePrepareSequencer / MultiSlotImagePrepareSequencer.
 * Race semantics are covered on the shared sequencer (not a duplicate mock).
 */
test('hook contract: shared sequencer implements prepare-while-busy semantics', () => {
  const multi = new MultiSlotImagePrepareSequencer(['front', 'back'] as const);
  // Selecting B while A is showing: begin marks preparing so Generate must wait.
  multi.begin('front');
  assert.equal(multi.isAnyPreparing(), true);
  // Replace with C before settle — old token dies, still preparing until C settles.
  const c = multi.begin('front');
  assert.equal(multi.isAnyPreparing(), true);
  c.settle();
  assert.equal(multi.isAnyPreparing(), false);
});

test('hook contract: merge batch preparing clears on settle or invalidate', () => {
  const merge = new ImagePrepareSequencer();
  const batch = merge.begin();
  assert.equal(merge.isPreparing(), true);
  batch.settle();
  assert.equal(merge.isPreparing(), false);

  const again = merge.begin();
  merge.invalidate(); // removeAt during prepare
  assert.equal(again.isCurrent(), false);
  assert.equal(merge.isPreparing(), false);
});
