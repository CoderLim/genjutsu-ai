import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHUTTAMALLE_OUTPUT_RATE_USD_PER_SECOND,
  estimateChuttamalleCredits,
  estimateChuttamalleProviderCost,
} from './pricing';

test('MiniMax H3 Chuttamalle estimate follows published per-second rates', () => {
  assert.equal(
    estimateChuttamalleProviderCost({
      duration: 5,
      resolution: '480P',
      imageCount: 2,
    }),
    0.25
  );
  assert.equal(
    estimateChuttamalleCredits({
      duration: 5,
      resolution: '480P',
      imageCount: 2,
    }),
    43
  );
});

test('15s 480P matches Fal H3 output rate plus Genjutsu credit markup', () => {
  assert.equal(CHUTTAMALLE_OUTPUT_RATE_USD_PER_SECOND['480P'], 0.05);
  assert.equal(
    estimateChuttamalleProviderCost({
      duration: 15,
      resolution: '480P',
      imageCount: 1,
    }),
    0.75
  );
  // ceil(0.75 * 100 * 1.7) = 128
  assert.equal(
    estimateChuttamalleCredits({
      duration: 15,
      resolution: '480P',
      imageCount: 1,
    }),
    128
  );
});

test('Chuttamalle preset accepts one or two subject references only', () => {
  assert.equal(
    estimateChuttamalleProviderCost({
      duration: 10,
      resolution: '768P',
      imageCount: 1,
    }),
    0.6
  );
  assert.throws(() =>
    estimateChuttamalleProviderCost({
      duration: 10,
      resolution: '768P',
      imageCount: 3,
    })
  );
});

test('Chuttamalle duration is constrained to the H3 5–15 second output range', () => {
  assert.throws(() =>
    estimateChuttamalleProviderCost({
      duration: 4,
      resolution: '480P',
      imageCount: 1,
    })
  );
  assert.throws(() =>
    estimateChuttamalleProviderCost({
      duration: 16,
      resolution: '480P',
      imageCount: 1,
    })
  );
});
