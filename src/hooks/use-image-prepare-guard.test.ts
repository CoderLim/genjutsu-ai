import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Pure sequence helper mirroring useImagePrepareGuard / useImageMergePrepareGuard
 * race semantics (without React), so we can unit-test invalidate/unmount.
 */
function createSlotGuard() {
  let seq = 0;
  let mounted = true;
  return {
    begin() {
      const current = ++seq;
      return {
        isCurrent: () => mounted && seq === current,
      };
    },
    invalidate() {
      seq += 1;
    },
    unmount() {
      mounted = false;
      seq += 1;
    },
  };
}

test('select then delete invalidates in-flight prepare', () => {
  const guard = createSlotGuard();
  const first = guard.begin();
  assert.equal(first.isCurrent(), true);
  guard.invalidate(); // clearSlot
  assert.equal(first.isCurrent(), false);
});

test('fast A then B: late A must not win', () => {
  const guard = createSlotGuard();
  const a = guard.begin();
  const b = guard.begin();
  assert.equal(a.isCurrent(), false);
  assert.equal(b.isCurrent(), true);
});

test('unmount invalidates in-flight prepare', () => {
  const guard = createSlotGuard();
  const pending = guard.begin();
  guard.unmount();
  assert.equal(pending.isCurrent(), false);
});

test('independent slots do not invalidate each other', () => {
  const left = createSlotGuard();
  const right = createSlotGuard();
  const leftPending = left.begin();
  const rightPending = right.begin();
  left.invalidate();
  assert.equal(leftPending.isCurrent(), false);
  assert.equal(rightPending.isCurrent(), true);
});

test('merge batch: remove during prepare drops the batch', () => {
  const merge = createSlotGuard();
  const batch = merge.begin();
  assert.equal(batch.isCurrent(), true);
  merge.invalidate(); // removeAt
  assert.equal(batch.isCurrent(), false);
});
