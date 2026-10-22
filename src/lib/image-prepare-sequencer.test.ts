import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ImagePrepareSequencer,
  MultiSlotImagePrepareSequencer,
} from '@/lib/image-prepare-sequencer';

test('begin then invalidate clears preparing and drops old token', () => {
  const seq = new ImagePrepareSequencer();
  const first = seq.begin();
  assert.equal(seq.isPreparing(), true);
  assert.equal(first.isCurrent(), true);
  seq.invalidate();
  assert.equal(first.isCurrent(), false);
  assert.equal(seq.isPreparing(), false);
  first.settle();
  assert.equal(seq.isPreparing(), false);
});

test('A then B: late A settle does not clear B preparing', () => {
  const seq = new ImagePrepareSequencer();
  const a = seq.begin();
  const b = seq.begin();
  assert.equal(a.isCurrent(), false);
  assert.equal(b.isCurrent(), true);
  assert.equal(seq.isPreparing(), true);
  a.settle();
  assert.equal(seq.isPreparing(), true);
  b.settle();
  assert.equal(seq.isPreparing(), false);
});

test('unmount invalidates in-flight prepare', () => {
  const seq = new ImagePrepareSequencer();
  const pending = seq.begin();
  seq.unmount();
  assert.equal(pending.isCurrent(), false);
  assert.equal(seq.isPreparing(), false);
});

test('multi-slot: invalidate one slot leaves the other preparing', () => {
  const multi = new MultiSlotImagePrepareSequencer(['front', 'back'] as const);
  const front = multi.begin('front');
  const back = multi.begin('back');
  assert.equal(multi.isAnyPreparing(), true);
  multi.invalidate('front');
  assert.equal(front.isCurrent(), false);
  assert.equal(back.isCurrent(), true);
  assert.equal(multi.isPreparing('front'), false);
  assert.equal(multi.isPreparing('back'), true);
  assert.equal(multi.isAnyPreparing(), true);
  back.settle();
  assert.equal(multi.isAnyPreparing(), false);
});

test('multi-slot unmount drops all preparing flags', () => {
  const multi = new MultiSlotImagePrepareSequencer([
    'left',
    'center',
    'right',
  ] as const);
  multi.begin('left');
  multi.begin('center');
  multi.unmount();
  assert.equal(multi.isAnyPreparing(), false);
});
