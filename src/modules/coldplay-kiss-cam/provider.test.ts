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
  assertColdplayKissCamProviderBinding,
  ColdplayKissCamProviderBindingError,
  resolveColdplayKissCamProviderTarget,
} from './provider';

const originalProduct = envConfigs.genjutsu_product_provider;
const originalObjectSwap = envConfigs.genjutsu_object_swap_provider;

function restore() {
  envConfigs.genjutsu_product_provider = originalProduct;
  envConfigs.genjutsu_object_swap_provider = originalObjectSwap;
}

test('Coldplay Kiss Cam follows the shared objects-swap env router', () => {
  envConfigs.genjutsu_product_provider = '';
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  try {
    const expected = resolveGenjutsuProviderTarget('objects-swap');
    assert.deepEqual(resolveColdplayKissCamProviderTarget(), expected);
    assert.equal(
      resolveColdplayKissCamProviderTarget().provider,
      'seedance-wavespeed'
    );
    assert.equal(
      resolveColdplayKissCamProviderTarget().model,
      'bytedance/seedance-2.5/video-edit'
    );
  } finally {
    restore();
  }
});

test('GENJUTSU_PRODUCT_PROVIDER overrides Coldplay Kiss Cam like Crazy Frog / Smalltown', () => {
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  envConfigs.genjutsu_product_provider = 'seedance-higgsfield';
  try {
    assert.deepEqual(
      resolveColdplayKissCamProviderTarget(),
      higgsfieldSeedanceObjectsSwapTarget()
    );
    assert.deepEqual(
      resolveColdplayKissCamProviderTarget(),
      resolveProductProviderTarget(CRAZY_FROG_PRODUCT, 'objects-swap')
    );
  } finally {
    restore();
  }
});

test('Coldplay Kiss Cam tracks Crazy Frog and Smalltown under the same product override', () => {
  envConfigs.genjutsu_product_provider = 'seedance-wavespeed';
  try {
    const kisscam = resolveColdplayKissCamProviderTarget();
    const crazy = resolveProductProviderTarget(
      CRAZY_FROG_PRODUCT,
      'objects-swap'
    );
    const smalltown = resolveProductProviderTarget(
      SMALLTOWN_BOY_DANCE_PRODUCT,
      'objects-swap'
    );
    assert.deepEqual(kisscam, crazy);
    assert.deepEqual(kisscam, smalltown);
    assert.equal(kisscam.provider, 'seedance-wavespeed');
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
      assertColdplayKissCamProviderBinding(
        higgsfield.provider,
        higgsfield.model
      )
    );
    assert.doesNotThrow(() =>
      assertColdplayKissCamProviderBinding(
        'seedance-wavespeed',
        'bytedance/seedance-2.5/video-edit'
      )
    );
    assert.throws(
      () =>
        assertColdplayKissCamProviderBinding(
          'seedance-higgsfield',
          'higgsfield/genjutsu/object-swap/v1.0'
        ),
      ColdplayKissCamProviderBindingError
    );
    assert.throws(
      () =>
        assertColdplayKissCamProviderBinding(
          'higgsfield',
          'higgsfield/genjutsu/object-swap/v1.0'
        ),
      ColdplayKissCamProviderBindingError
    );
  } finally {
    restore();
  }
});
