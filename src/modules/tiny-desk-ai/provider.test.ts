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
  assertTinyDeskAiProviderBinding,
  resolveTinyDeskAiProviderTarget,
  TinyDeskAiProviderBindingError,
} from './provider';

const originalProduct = envConfigs.genjutsu_product_provider;
const originalObjectSwap = envConfigs.genjutsu_object_swap_provider;

function restore() {
  envConfigs.genjutsu_product_provider = originalProduct;
  envConfigs.genjutsu_object_swap_provider = originalObjectSwap;
}

test('Tiny Desk follows the shared objects-swap env router', () => {
  envConfigs.genjutsu_product_provider = '';
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  try {
    const expected = resolveGenjutsuProviderTarget('objects-swap');
    assert.deepEqual(resolveTinyDeskAiProviderTarget(), expected);
    assert.equal(
      resolveTinyDeskAiProviderTarget().provider,
      'seedance-wavespeed'
    );
    assert.equal(
      resolveTinyDeskAiProviderTarget().model,
      'bytedance/seedance-2.5/video-edit'
    );
  } finally {
    restore();
  }
});

test('GENJUTSU_PRODUCT_PROVIDER overrides Tiny Desk like Crazy Frog / Smalltown', () => {
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  envConfigs.genjutsu_product_provider = 'seedance-higgsfield';
  try {
    assert.deepEqual(
      resolveTinyDeskAiProviderTarget(),
      higgsfieldSeedanceObjectsSwapTarget()
    );
    assert.deepEqual(
      resolveTinyDeskAiProviderTarget(),
      resolveProductProviderTarget(CRAZY_FROG_PRODUCT, 'objects-swap')
    );
  } finally {
    restore();
  }
});

test('Tiny Desk tracks Crazy Frog and Smalltown under the same product override', () => {
  envConfigs.genjutsu_product_provider = 'seedance-wavespeed';
  try {
    const tinyDesk = resolveTinyDeskAiProviderTarget();
    const crazy = resolveProductProviderTarget(
      CRAZY_FROG_PRODUCT,
      'objects-swap'
    );
    const smalltown = resolveProductProviderTarget(
      SMALLTOWN_BOY_DANCE_PRODUCT,
      'objects-swap'
    );
    assert.deepEqual(tinyDesk, crazy);
    assert.deepEqual(tinyDesk, smalltown);
    assert.equal(tinyDesk.provider, 'seedance-wavespeed');
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
      assertTinyDeskAiProviderBinding(higgsfield.provider, higgsfield.model)
    );
    assert.doesNotThrow(() =>
      assertTinyDeskAiProviderBinding(
        'seedance-wavespeed',
        'bytedance/seedance-2.5/video-edit'
      )
    );
    assert.throws(
      () =>
        assertTinyDeskAiProviderBinding(
          'seedance-higgsfield',
          'higgsfield/genjutsu/object-swap/v1.0'
        ),
      TinyDeskAiProviderBindingError
    );
    assert.throws(
      () =>
        assertTinyDeskAiProviderBinding(
          'higgsfield',
          'higgsfield/genjutsu/object-swap/v1.0'
        ),
      TinyDeskAiProviderBindingError
    );
  } finally {
    restore();
  }
});
