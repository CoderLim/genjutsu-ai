import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateGenjutsuCredits,
  canSeeSmokeCreditPack,
  estimateGenjutsuCredits,
  estimateGenjutsuCreditsForProvider,
  estimateGenjutsuListCost,
  estimateSeedanceCredits,
  GENJUTSU_CREDIT_PACKS,
  GENJUTSU_SMOKE_CREDIT_PACK,
  getSmallestSufficientCreditPack,
  listVisibleCreditPacks,
} from './pricing';

test('V2 public credit packs match the approved catalog', () => {
  assert.deepEqual(
    GENJUTSU_CREDIT_PACKS.map((pack) => [
      pack.id,
      pack.priceCents,
      pack.credits,
    ]),
    [
      ['starter', 1499, 1100],
      ['creator', 4999, 3900],
      ['studio', 9999, 8400],
    ]
  );
});

test('V2 gross margin targets and monotonically decreasing unit prices', () => {
  const [starter, creator, studio] = GENJUTSU_CREDIT_PACKS;
  const modelCostUsd = (credits: number) => credits / 170;
  for (const pack of GENJUTSU_CREDIT_PACKS) {
    const margin = 1 - modelCostUsd(pack.credits) / (pack.priceCents / 100);
    assert.ok(margin >= 0.5 && margin < 0.6, `unexpected ${pack.id} model-cost margin`);
  }
  assert.ok(starter.priceCents / starter.credits > creator.priceCents / creator.credits);
  assert.ok(creator.priceCents / creator.credits > studio.priceCents / studio.credits);
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
    ['starter', 'creator', 'studio']
  );
  assert.deepEqual(
    listVisibleCreditPacks('gengliming110@gmail.com').map((p) => p.id),
    ['starter', 'creator', 'studio', 'smoke']
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


test('credit gate chooses the smallest pack that covers the deficit', () => {
  assert.equal(
    getSmallestSufficientCreditPack({
      balance: 310,
      requiredCredits: 1900,
      email: 'alice@example.com',
    })?.id,
    'creator'
  );
  assert.equal(
    getSmallestSufficientCreditPack({
      balance: 320,
      requiredCredits: 820,
      email: 'alice@example.com',
    })?.id,
    'starter'
  );
});

test('credit gate supports the internal smoke pack and does not under-sell large deficits', () => {
  assert.equal(
    getSmallestSufficientCreditPack({
      balance: 100,
      requiredCredits: 140,
      email: 'gengliming110@gmail.com',
    })?.id,
    'smoke'
  );
  assert.equal(
    getSmallestSufficientCreditPack({
      balance: 0,
      requiredCredits: 9000,
      email: 'alice@example.com',
    }),
    null
  );
});

test('display estimator tracks selected server provider', () => {
  const input = { durationSeconds: 4.1, resolution: '720p' as const };
  assert.equal(
    estimateGenjutsuCreditsForProvider({ ...input, provider: 'higgsfield' }),
    estimateGenjutsuCredits(input)
  );
  assert.equal(
    estimateGenjutsuCreditsForProvider({ ...input, provider: 'seedance' }),
    estimateSeedanceCredits(input)
  );
  assert.equal(
    estimateGenjutsuCreditsForProvider({
      ...input,
      provider: 'seedance-volcengine',
    }),
    estimateSeedanceCredits(input)
  );
  assert.notEqual(estimateGenjutsuCredits(input), estimateSeedanceCredits(input));
});

test('Seedance early-gate estimate matches the server customer quote without whole-second rounding', () => {
  assert.equal(
    estimateSeedanceCredits({
      durationSeconds: 4.1,
      resolution: '720p',
    }),
    475
  );
  assert.equal(
    estimateSeedanceCredits({
      durationSeconds: 30,
      resolution: '1080p',
    }),
    8546
  );
});
