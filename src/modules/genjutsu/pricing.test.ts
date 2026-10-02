import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateGenjutsuCredits,
  canSeeSmokeCreditPack,
  estimateGenjutsuCredits,
  estimateGenjutsuListCost,
  GENJUTSU_CREDIT_PACKS,
  GENJUTSU_SMOKE_CREDIT_PACK,
  listVisibleCreditPacks,
} from './pricing';

test('launch credit packs match the approved catalog', () => {
  assert.deepEqual(
    GENJUTSU_CREDIT_PACKS.map((pack) => [
      pack.id,
      pack.priceCents,
      pack.credits,
    ]),
    [
      ['starter', 499, 500],
      ['creator', 999, 1100],
      ['pro', 1999, 2400],
      ['studio', 3999, 5000],
    ]
  );
});

test('smoke pack is only visible to gengliming emails', () => {
  assert.equal(GENJUTSU_SMOKE_CREDIT_PACK.priceCents, 100);
  assert.equal(GENJUTSU_SMOKE_CREDIT_PACK.currency, 'cny');
  assert.equal(GENJUTSU_SMOKE_CREDIT_PACK.credits, 50);
  assert.equal(canSeeSmokeCreditPack('alice@example.com'), false);
  assert.equal(canSeeSmokeCreditPack('gengliming110@gmail.com'), true);
  assert.equal(canSeeSmokeCreditPack('dev+GENGLIMING@x.com'), true);
  assert.deepEqual(
    listVisibleCreditPacks('alice@example.com').map((p) => p.id),
    ['starter', 'creator', 'pro', 'studio']
  );
  assert.deepEqual(
    listVisibleCreditPacks('gengliming110@gmail.com').map((p) => p.id),
    ['starter', 'creator', 'pro', 'studio', 'smoke']
  );
});

test('provider USD cost is converted with the 1.7x credit multiplier', () => {
  assert.equal(calculateGenjutsuCredits(3.405), 579);
});

test('fallback estimates round input duration up to a whole second', () => {
  assert.equal(
    estimateGenjutsuListCost({
      durationSeconds: 3.1,
      resolution: '480p',
    }),
    4 * 0.318
  );
  assert.equal(
    estimateGenjutsuCredits({
      durationSeconds: 3.1,
      resolution: '480p',
    }),
    217
  );
});

test('fallback estimate caps source billing at 30 seconds and supports 1080p', () => {
  assert.equal(
    estimateGenjutsuListCost({
      durationSeconds: 45,
      resolution: '1080p',
    }),
    30 * 1.632
  );
});

test('list-rate fallback for 720p max clip reserves known credits', () => {
  // Used when /estimate returns pricing_description or fails.
  assert.equal(
    calculateGenjutsuCredits(
      estimateGenjutsuListCost({
        durationSeconds: 30,
        resolution: '720p',
      })
    ),
    3474
  );
});
