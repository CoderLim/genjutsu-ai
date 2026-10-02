import assert from 'node:assert/strict';
import test from 'node:test';

import { planGenjutsuCreditSettlement } from './settlement';

test('settlement refunds credits when actual provider cost is lower than the reservation', () => {
  const plan = planGenjutsuCreditSettlement({
    reservedCredits: 579,
    actualProviderCostUsd: 2.5,
  });

  assert.equal(plan.actualCredits, 425);
  assert.equal(plan.refundCredits, 154);
  assert.equal(plan.additionalCredits, 0);
});

test('settlement charges only the delta when actual provider cost exceeds the reservation', () => {
  const plan = planGenjutsuCreditSettlement({
    reservedCredits: 425,
    actualProviderCostUsd: 3.4056,
  });

  assert.equal(plan.actualCredits, 579);
  assert.equal(plan.refundCredits, 0);
  assert.equal(plan.additionalCredits, 154);
});

test('settlement is a no-op when final credits match the reservation', () => {
  const plan = planGenjutsuCreditSettlement({
    reservedCredits: 579,
    actualProviderCostUsd: 3.4056,
  });

  assert.equal(plan.actualCredits, 579);
  assert.equal(plan.refundCredits, 0);
  assert.equal(plan.additionalCredits, 0);
});
