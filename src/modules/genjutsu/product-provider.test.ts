import assert from 'node:assert/strict';
import test from 'node:test';

import {
  A2O_LITE_AI_PRODUCT,
  COLDPLAY_KISS_CAM_PRODUCT,
  CRAZY_FROG_PRODUCT,
  ENZO_FERNANDEZ_AI_PRODUCT,
  FLYING_CAR_AI_PRODUCT,
  GANGNAM_STYLE_AI_PRODUCT,
  GAS_STATION_DANCE_AI_PRODUCT,
  isGenjutsuProductId,
  resolveGenjutsuProviderTarget,
  resolveProductProviderTarget,
  SMALLTOWN_BOY_DANCE_PRODUCT,
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
  assert.equal(isGenjutsuProductId(COLDPLAY_KISS_CAM_PRODUCT), true);
  assert.equal(isGenjutsuProductId(GANGNAM_STYLE_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId(GAS_STATION_DANCE_AI_PRODUCT), true);
  assert.equal(isGenjutsuProductId('bulin-47'), false);
  assert.equal(isGenjutsuProductId(''), false);
});
