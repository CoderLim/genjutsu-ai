import assert from 'node:assert/strict';
import test from 'node:test';

import { envConfigs } from '@/config';
import {
  CRAZY_FROG_PRODUCT,
  higgsfieldSeedanceObjectsSwapTarget,
  resolveGenjutsuProviderTarget,
  resolveProductProviderTarget,
  SMALLTOWN_BOY_DANCE_PRODUCT,
} from '@/modules/genjutsu/workflow';

import {
  assertGasStationDanceAiProviderBinding,
  GasStationDanceAiProviderBindingError,
  resolveGasStationDanceAiProviderTarget,
} from './provider';

const originalProduct = envConfigs.genjutsu_product_provider;
const originalObjectSwap = envConfigs.genjutsu_object_swap_provider;

function restore() {
  envConfigs.genjutsu_product_provider = originalProduct;
  envConfigs.genjutsu_object_swap_provider = originalObjectSwap;
}

test('Gas Station Dance AI follows the shared objects-swap env router', () => {
  envConfigs.genjutsu_product_provider = '';
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  try {
    const expected = resolveGenjutsuProviderTarget('objects-swap');
    assert.deepEqual(resolveGasStationDanceAiProviderTarget(), expected);
    assert.equal(
      resolveGasStationDanceAiProviderTarget().provider,
      'seedance-wavespeed'
    );
    assert.equal(
      resolveGasStationDanceAiProviderTarget().model,
      'bytedance/seedance-2.5/video-edit'
    );
  } finally {
    restore();
  }
});

test('GENJUTSU_PRODUCT_PROVIDER overrides Gas Station Dance AI like Crazy Frog / Smalltown', () => {
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  envConfigs.genjutsu_product_provider = 'seedance-higgsfield';
  try {
    assert.deepEqual(
      resolveGasStationDanceAiProviderTarget(),
      higgsfieldSeedanceObjectsSwapTarget()
    );
    assert.deepEqual(
      resolveGasStationDanceAiProviderTarget(),
      resolveProductProviderTarget(CRAZY_FROG_PRODUCT, 'objects-swap')
    );
  } finally {
    restore();
  }
});

test('Gas Station Dance AI tracks Crazy Frog and Smalltown under the same product override', () => {
  envConfigs.genjutsu_product_provider = 'seedance-wavespeed';
  try {
    const gasStation = resolveGasStationDanceAiProviderTarget();
    const crazy = resolveProductProviderTarget(
      CRAZY_FROG_PRODUCT,
      'objects-swap'
    );
    const smalltown = resolveProductProviderTarget(
      SMALLTOWN_BOY_DANCE_PRODUCT,
      'objects-swap'
    );
    assert.deepEqual(gasStation, crazy);
    assert.deepEqual(gasStation, smalltown);
    assert.equal(gasStation.provider, 'seedance-wavespeed');
  } finally {
    restore();
  }
});

test('persisted Seedance-family bindings stay valid across env switches', () => {
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  envConfigs.genjutsu_product_provider = '';
  try {
    const higgsfield = higgsfieldSeedanceObjectsSwapTarget();
    assert.doesNotThrow(() =>
      assertGasStationDanceAiProviderBinding(
        higgsfield.provider,
        higgsfield.model
      )
    );
    assert.doesNotThrow(() =>
      assertGasStationDanceAiProviderBinding(
        'seedance-wavespeed',
        'bytedance/seedance-2.5/video-edit'
      )
    );
    assert.throws(
      () =>
        assertGasStationDanceAiProviderBinding(
          'seedance-higgsfield',
          'higgsfield/genjutsu/object-swap/v1.0'
        ),
      GasStationDanceAiProviderBindingError
    );
    assert.throws(
      () =>
        assertGasStationDanceAiProviderBinding(
          'higgsfield',
          'higgsfield/genjutsu/object-swap/v1.0'
        ),
      GasStationDanceAiProviderBindingError
    );
  } finally {
    restore();
  }
});
