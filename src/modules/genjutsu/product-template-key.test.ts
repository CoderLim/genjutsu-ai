import assert from 'node:assert/strict';
import test from 'node:test';

import { getGenjutsuProductTemplateVideoKey } from './storage';
import type { GenjutsuProductId } from './types';
import {
  A2O_LITE_AI_PRODUCT,
  COLDPLAY_KISS_CAM_PRODUCT,
  CRAZY_FROG_PRODUCT,
  ENZO_FERNANDEZ_AI_PRODUCT,
  FLYING_CAR_AI_PRODUCT,
  SMALLTOWN_BOY_DANCE_PRODUCT,
} from './workflow';

const ALL_PRODUCTS: GenjutsuProductId[] = [
  SMALLTOWN_BOY_DANCE_PRODUCT,
  CRAZY_FROG_PRODUCT,
  A2O_LITE_AI_PRODUCT,
  ENZO_FERNANDEZ_AI_PRODUCT,
  FLYING_CAR_AI_PRODUCT,
  COLDPLAY_KISS_CAM_PRODUCT,
];

test('each Genjutsu product maps to a distinct template key', () => {
  const keys = ALL_PRODUCTS.map((product) =>
    getGenjutsuProductTemplateVideoKey(product)
  );
  assert.equal(new Set(keys).size, ALL_PRODUCTS.length);
});

test('no product falls through to the Flying Car template key', () => {
  const flyingKey = getGenjutsuProductTemplateVideoKey(FLYING_CAR_AI_PRODUCT);
  for (const product of ALL_PRODUCTS) {
    if (product === FLYING_CAR_AI_PRODUCT) continue;
    assert.notEqual(
      getGenjutsuProductTemplateVideoKey(product),
      flyingKey,
      `${product} must not share Flying Car template key`
    );
  }
});

test('product id is reflected in its default template key path', () => {
  assert.match(
    getGenjutsuProductTemplateVideoKey(SMALLTOWN_BOY_DANCE_PRODUCT),
    /smalltown-boy-dance/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(CRAZY_FROG_PRODUCT),
    /crazy-frog/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(A2O_LITE_AI_PRODUCT),
    /a2o-lite-ai/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(ENZO_FERNANDEZ_AI_PRODUCT),
    /enzo-fernandez-ai/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(FLYING_CAR_AI_PRODUCT),
    /flying-car-ai/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(COLDPLAY_KISS_CAM_PRODUCT),
    /coldplay-kiss-cam/
  );
});
