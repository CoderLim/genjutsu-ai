import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveGenjutsuCheckoutAmount } from './checkout-amount';

const starter = {
  productId: 'starter',
  catalogAmountCents: 1499,
  provider: 'waffo',
  providerEnvironment: 'prod',
};

test('public V2 packs always charge their catalog prices', () => {
  for (const [productId, catalogAmountCents] of [
    ['starter', 1499],
    ['creator', 4999],
    ['studio', 9999],
  ] as const) {
    assert.equal(
      resolveGenjutsuCheckoutAmount({
        ...starter,
        productId,
        catalogAmountCents,
      }),
      catalogAmountCents
    );
    assert.equal(
      resolveGenjutsuCheckoutAmount({
        ...starter,
        productId,
        catalogAmountCents,
        testAmountRaw: '0',
      }),
      catalogAmountCents
    );
  }
});

test('public V2 checkouts fail closed on stale or malformed test overrides', () => {
  for (const testAmountRaw of ['1', '1499', '100', '-1', '1.9', 'foo', '000']) {
    assert.throws(
      () =>
        resolveGenjutsuCheckoutAmount({
          ...starter,
          providerEnvironment: 'test',
          testAmountRaw,
        }),
      /Test payment amount override is not allowed/
    );
  }
});

test('internal smoke pack alone can use an explicit Waffo TEST override', () => {
  const smoke = {
    productId: 'smoke',
    catalogAmountCents: 100,
    provider: 'waffo',
    providerEnvironment: 'test',
  };
  assert.equal(resolveGenjutsuCheckoutAmount(smoke), 100);
  assert.equal(
    resolveGenjutsuCheckoutAmount({ ...smoke, testAmountRaw: '1' }),
    1
  );
  assert.throws(
    () => resolveGenjutsuCheckoutAmount({ ...smoke, providerEnvironment: 'prod', testAmountRaw: '1' }),
    /not allowed/
  );
  assert.throws(
    () => resolveGenjutsuCheckoutAmount({ ...smoke, testAmountRaw: '1.5' }),
    /Invalid test payment amount/
  );
  assert.throws(
    () => resolveGenjutsuCheckoutAmount({ ...smoke, provider: 'stripe', testAmountRaw: '1' }),
    /not allowed/
  );
});

test('invalid catalog prices never reach payment checkout', () => {
  assert.throws(
    () => resolveGenjutsuCheckoutAmount({ ...starter, catalogAmountCents: 0 }),
    /Invalid catalog/
  );
});
