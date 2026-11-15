import assert from 'node:assert/strict';
import test from 'node:test';

import { envConfigs } from '@/config';

import { HIGGSFIELD_GENJUTSU_MODELS } from './model-config';
import {
  A2O_LITE_AI_PRODUCT,
  BICEP_HEART_PRODUCT,
  BURNING_BRIDGES_AI_PRODUCT,
  CHIPMUNKS_DANCE_PRODUCT,
  COLDPLAY_KISS_CAM_PRODUCT,
  CRAZY_FROG_PRODUCT,
  DECK_THE_HALLS_DANCE_AI_PRODUCT,
  ENZO_FERNANDEZ_AI_PRODUCT,
  FLYING_CAR_AI_PRODUCT,
  GANGNAM_STYLE_AI_PRODUCT,
  GAS_STATION_DANCE_AI_PRODUCT,
  GLOW_STICK_PRODUCT,
  isGenjutsuProductId,
  resolveGenjutsuProviderTarget,
  resolveGenjutsuPublicPricingConfig,
  resolveProductProviderTarget,
  SAY_IT_RIGHT_AI_PRODUCT,
  SHAN_SHEN_BU_PRODUCT,
  SMALLTOWN_BOY_DANCE_PRODUCT,
  TINY_DESK_AI_PRODUCT,
  WASSUP_IN_A_MINUTE_AI_PRODUCT,
  ZOMBIE_HUG_PRODUCT,
} from './workflow';

test('smalltown-boy-dance follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    SMALLTOWN_BOY_DANCE_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('crazy-frog follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    CRAZY_FROG_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('a2o-lite-ai follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    A2O_LITE_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('enzo-fernandez-ai follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    ENZO_FERNANDEZ_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('flying-car-ai follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    FLYING_CAR_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('shan-shen-bu follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    SHAN_SHEN_BU_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('coldplay-kiss-cam follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    COLDPLAY_KISS_CAM_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('gangnam-style-ai follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    GANGNAM_STYLE_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('gas-station-dance-ai follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    GAS_STATION_DANCE_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('glow-stick is pinned to Genjutsu Light rather than the homepage', () => {
  const target = resolveProductProviderTarget(
    GLOW_STICK_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, {
    provider: 'higgsfield',
    model: HIGGSFIELD_GENJUTSU_MODELS.light['objects-swap'],
  });
});

test('chipmunks-dance is pinned to Genjutsu Light rather than the homepage', () => {
  const target = resolveProductProviderTarget(
    CHIPMUNKS_DANCE_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, {
    provider: 'higgsfield',
    model: HIGGSFIELD_GENJUTSU_MODELS.light['objects-swap'],
  });
});

test('tiny-desk-ai is pinned to Genjutsu Light rather than the homepage', () => {
  const target = resolveProductProviderTarget(
    TINY_DESK_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, {
    provider: 'higgsfield',
    model: HIGGSFIELD_GENJUTSU_MODELS.light['objects-swap'],
  });
});

test('bicep-heart is pinned to Genjutsu Light rather than the homepage', () => {
  const target = resolveProductProviderTarget(
    BICEP_HEART_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, {
    provider: 'higgsfield',
    model: HIGGSFIELD_GENJUTSU_MODELS.light['objects-swap'],
  });
});

test('wassup-in-a-minute-ai is pinned to Genjutsu Standard rather than the homepage', () => {
  const target = resolveProductProviderTarget(
    WASSUP_IN_A_MINUTE_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, {
    provider: 'higgsfield',
    model: HIGGSFIELD_GENJUTSU_MODELS.standard['objects-swap'],
  });
});

test('burning-bridges-ai follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    BURNING_BRIDGES_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('deck-the-halls-dance-ai is pinned to Genjutsu Light', () => {
  const target = resolveProductProviderTarget(
    DECK_THE_HALLS_DANCE_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, {
    provider: 'higgsfield',
    model: 'higgsfield/genjutsu-light/object-swap/v1.0',
  });
});

test('say-it-right-ai follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    SAY_IT_RIGHT_AI_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('zombie-hug follows the mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const target = resolveProductProviderTarget(
    ZOMBIE_HUG_PRODUCT,
    'objects-swap'
  );
  assert.deepEqual(target, fallback);
});

test('unknown product falls back to mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('objects-swap');
  const viaProduct = resolveProductProviderTarget(
    'not-a-product',
    'objects-swap'
  );
  assert.deepEqual(viaProduct, fallback);
});

test('missing product falls back to mode env router', () => {
  const fallback = resolveGenjutsuProviderTarget('motion-transfer');
  assert.deepEqual(
    resolveProductProviderTarget(undefined, 'motion-transfer'),
    fallback
  );
  assert.deepEqual(
    resolveProductProviderTarget(null, 'motion-transfer'),
    fallback
  );
});

test('isGenjutsuProductId allowlist', () => {
  assert.equal(isGenjutsuProductId(SMALLTOWN_BOY_DANCE_PRODUCT), true);
  assert.equal(isGenjutsuProductId(CRAZY_FROG_PRODUCT), true);
  assert.equal(isGenjutsuProductId(A2O_LITE_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(ENZO_FERNANDEZ_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(FLYING_CAR_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(SHAN_SHEN_BU_PRODUCT), true);
  assert.equal(isGenjutsuProductId(COLDPLAY_KISS_CAM_PRODUCT), true);
  assert.equal(isGenjutsuProductId(GANGNAM_STYLE_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(GAS_STATION_DANCE_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(GLOW_STICK_PRODUCT), true);
  assert.equal(isGenjutsuProductId(CHIPMUNKS_DANCE_PRODUCT), true);
  assert.equal(isGenjutsuProductId(BICEP_HEART_PRODUCT), true);
  assert.equal(isGenjutsuProductId(BURNING_BRIDGES_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(SAY_IT_RIGHT_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(DECK_THE_HALLS_DANCE_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(ZOMBIE_HUG_PRODUCT), true);
  assert.equal(isGenjutsuProductId(TINY_DESK_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(WASSUP_IN_A_MINUTE_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId('bulin-47'), false);
  assert.equal(isGenjutsuProductId(''), false);
});

test('Standard and Light can coexist with one Higgsfield provider', () => {
  const previousProvider = envConfigs.genjutsu_object_swap_provider;
  const previousProductProvider = envConfigs.genjutsu_product_provider;
  const previousModel = envConfigs.higgsfield_genjutsu_object_swap_model;
  try {
    envConfigs.genjutsu_product_provider = '';
    envConfigs.genjutsu_object_swap_provider = 'higgsfield';
    envConfigs.higgsfield_genjutsu_object_swap_model =
      HIGGSFIELD_GENJUTSU_MODELS.standard['objects-swap'];

    const pinned = resolveProductProviderTarget(
      CHIPMUNKS_DANCE_PRODUCT,
      'objects-swap'
    );
    const unpinned = resolveProductProviderTarget(
      SMALLTOWN_BOY_DANCE_PRODUCT,
      'objects-swap'
    );
    assert.equal(pinned.provider, 'higgsfield');
    assert.equal(unpinned.provider, 'higgsfield');
    assert.equal(
      pinned.model,
      HIGGSFIELD_GENJUTSU_MODELS.light['objects-swap']
    );
    assert.equal(
      unpinned.model,
      HIGGSFIELD_GENJUTSU_MODELS.standard['objects-swap']
    );
  } finally {
    envConfigs.genjutsu_object_swap_provider = previousProvider;
    envConfigs.genjutsu_product_provider = previousProductProvider;
    envConfigs.higgsfield_genjutsu_object_swap_model = previousModel;
  }
});

test('unknown inherited property names never activate product model overrides', () => {
  assert.deepEqual(
    resolveProductProviderTarget('constructor', 'objects-swap'),
    resolveGenjutsuProviderTarget('objects-swap')
  );
});

test('public homepage config reports exact model for each mode even with one Higgsfield provider', () => {
  const original = {
    motionProvider: envConfigs.genjutsu_motion_provider,
    motionModel: envConfigs.higgsfield_genjutsu_motion_model,
    swapProvider: envConfigs.genjutsu_object_swap_provider,
    swapModel: envConfigs.higgsfield_genjutsu_object_swap_model,
  };
  try {
    envConfigs.genjutsu_motion_provider = 'higgsfield';
    envConfigs.genjutsu_object_swap_provider = 'higgsfield';
    envConfigs.higgsfield_genjutsu_motion_model =
      HIGGSFIELD_GENJUTSU_MODELS.standard['motion-transfer'];
    envConfigs.higgsfield_genjutsu_object_swap_model =
      HIGGSFIELD_GENJUTSU_MODELS.light['objects-swap'];

    assert.deepEqual(resolveGenjutsuPublicPricingConfig(), {
      genjutsu_motion_provider: 'higgsfield',
      genjutsu_motion_model:
        HIGGSFIELD_GENJUTSU_MODELS.standard['motion-transfer'],
      genjutsu_object_swap_provider: 'higgsfield',
      genjutsu_object_swap_model:
        HIGGSFIELD_GENJUTSU_MODELS.light['objects-swap'],
    });
  } finally {
    envConfigs.genjutsu_motion_provider = original.motionProvider;
    envConfigs.higgsfield_genjutsu_motion_model = original.motionModel;
    envConfigs.genjutsu_object_swap_provider = original.swapProvider;
    envConfigs.higgsfield_genjutsu_object_swap_model = original.swapModel;
  }
});

test('public homepage config tracks non-Higgsfield model routing independently', () => {
  const original = {
    motionProvider: envConfigs.genjutsu_motion_provider,
    swapProvider: envConfigs.genjutsu_object_swap_provider,
  };
  try {
    envConfigs.genjutsu_motion_provider = 'seedance-wavespeed';
    envConfigs.genjutsu_object_swap_provider = 'higgsfield';
    const fields = resolveGenjutsuPublicPricingConfig();
    const motion = resolveGenjutsuProviderTarget('motion-transfer');
    const swap = resolveGenjutsuProviderTarget('objects-swap');
    assert.equal(fields.genjutsu_motion_provider, motion.provider);
    assert.equal(fields.genjutsu_motion_model, motion.model);
    assert.equal(fields.genjutsu_object_swap_provider, swap.provider);
    assert.equal(fields.genjutsu_object_swap_model, swap.model);
  } finally {
    envConfigs.genjutsu_motion_provider = original.motionProvider;
    envConfigs.genjutsu_object_swap_provider = original.swapProvider;
  }
});
