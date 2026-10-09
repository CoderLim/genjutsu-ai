import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCheckoutProductAllowed,
  getPricingProduct,
  listPricingProducts,
} from './pricing';

test('V2 server checkout resolves exactly three public USD packs', () => {
  const publicProducts = listPricingProducts('buyer@example.com');
  assert.deepEqual(
    publicProducts.map(({ productId, priceInCents, credits }) => [
      productId,
      priceInCents,
      credits,
    ]),
    [
      ['starter', 1499, 1100],
      ['creator', 4999, 3900],
      ['studio', 9999, 8400],
    ]
  );
  assert.ok(publicProducts.every((p) => p.currency === 'usd'));
  assert.equal(getPricingProduct('pro'), null);
});

test('legacy Pro purchases are unavailable for NEW checkout', () => {
  assert.equal(getPricingProduct('pro'), null);
  assert.equal(getPricingProduct('not-a-product'), null);
});

test('internal smoke checkout remains access-controlled', () => {
  assert.throws(
    () => assertCheckoutProductAllowed('smoke', 'buyer@example.com'),
    /not available/
  );
  assert.doesNotThrow(() =>
    assertCheckoutProductAllowed('smoke', 'gengliming110@example.com')
  );
  assert.equal(getPricingProduct('smoke')?.credits, 50);
});
