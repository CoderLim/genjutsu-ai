import assert from 'node:assert/strict';
import test from 'node:test';

import { getGenjutsuProductTemplateVideoKey } from './storage';
import type { GenjutsuProductId } from './types';
import {
  A2O_LITE_AI_PRODUCT,
  BURNING_BRIDGES_AI_PRODUCT,
  COLDPLAY_KISS_CAM_PRODUCT,
  CRAZY_FROG_PRODUCT,
  ENZO_FERNANDEZ_AI_PRODUCT,
  FLYING_CAR_AI_PRODUCT,
  GANGNAM_STYLE_AI_PRODUCT,
  GAS_STATION_DANCE_AI_PRODUCT,
  SAY_IT_RIGHT_AI_PRODUCT,
  SHAN_SHEN_BU_PRODUCT,
  SMALLTOWN_BOY_DANCE_PRODUCT,
  TINY_DESK_AI_PRODUCT,
  ZOMBIE_HUG_PRODUCT,
} from './workflow';

const ALL_PRODUCTS: GenjutsuProductId[] = [
  SMALLTOWN_BOY_DANCE_PRODUCT,
  CRAZY_FROG_PRODUCT,
  A2O_LITE_AI_PRODUCT,
  ENZO_FERNANDEZ_AI_PRODUCT,
  FLYING_CAR_AI_PRODUCT,
  SHAN_SHEN_BU_PRODUCT,
  COLDPLAY_KISS_CAM_PRODUCT,
  GANGNAM_STYLE_AI_PRODUCT,
  GAS_STATION_DANCE_AI_PRODUCT,
  BURNING_BRIDGES_AI_PRODUCT,
  SAY_IT_RIGHT_AI_PRODUCT,
  ZOMBIE_HUG_PRODUCT,
  TINY_DESK_AI_PRODUCT,
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
    getGenjutsuProductTemplateVideoKey(SHAN_SHEN_BU_PRODUCT),
    /shan-shen-bu/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(COLDPLAY_KISS_CAM_PRODUCT),
    /coldplay-kiss-cam/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(GANGNAM_STYLE_AI_PRODUCT),
    /gangnam-style-ai/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(GAS_STATION_DANCE_AI_PRODUCT),
    /gas-station-dance-ai/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(BURNING_BRIDGES_AI_PRODUCT),
    /burning-bridges-ai/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(SAY_IT_RIGHT_AI_PRODUCT),
    /say-it-right-ai/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(ZOMBIE_HUG_PRODUCT),
    /zombie-hug/
  );
  assert.match(
    getGenjutsuProductTemplateVideoKey(TINY_DESK_AI_PRODUCT),
    /tiny-desk-ai/
  );
});
