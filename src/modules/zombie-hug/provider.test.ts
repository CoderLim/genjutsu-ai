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
  assertZombieHugProviderBinding,
  resolveZombieHugProviderTarget,
  ZombieHugProviderBindingError,
} from './provider';

const originalProduct = envConfigs.genjutsu_product_provider;
const originalObjectSwap = envConfigs.genjutsu_object_swap_provider;

function restore() {
  envConfigs.genjutsu_product_provider = originalProduct;
  envConfigs.genjutsu_object_swap_provider = originalObjectSwap;
}

test('Zombie Hug follows the shared objects-swap env router', () => {
  envConfigs.genjutsu_product_provider = '';
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  try {
    const expected = resolveGenjutsuProviderTarget('objects-swap');
    assert.deepEqual(resolveZombieHugProviderTarget(), expected);
    assert.equal(
      resolveZombieHugProviderTarget().provider,
      'seedance-wavespeed'
    );
    assert.equal(
      resolveZombieHugProviderTarget().model,
      'bytedance/seedance-2.5/video-edit'
    );
  } finally {
    restore();
  }
});

test('GENJUTSU_PRODUCT_PROVIDER overrides Zombie Hug like Crazy Frog / Smalltown', () => {
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  envConfigs.genjutsu_product_provider = 'seedance-higgsfield';
  try {
    assert.deepEqual(
      resolveZombieHugProviderTarget(),
      higgsfieldSeedanceObjectsSwapTarget()
    );
    assert.deepEqual(
      resolveZombieHugProviderTarget(),
      resolveProductProviderTarget(CRAZY_FROG_PRODUCT, 'objects-swap')
    );
  } finally {
    restore();
  }
});

test('Zombie Hug tracks Crazy Frog and Smalltown under the same product override', () => {
  envConfigs.genjutsu_product_provider = 'seedance-wavespeed';
  try {
    const zombie = resolveZombieHugProviderTarget();
    const crazy = resolveProductProviderTarget(
      CRAZY_FROG_PRODUCT,
      'objects-swap'
    );
    const smalltown = resolveProductProviderTarget(
      SMALLTOWN_BOY_DANCE_PRODUCT,
      'objects-swap'
    );
    assert.deepEqual(zombie, crazy);
    assert.deepEqual(zombie, smalltown);
    assert.equal(zombie.provider, 'seedance-wavespeed');
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
      assertZombieHugProviderBinding(higgsfield.provider, higgsfield.model)
    );
    assert.doesNotThrow(() =>
      assertZombieHugProviderBinding(
        'seedance-wavespeed',
        'bytedance/seedance-2.5/video-edit'
      )
    );
    assert.throws(
      () =>
        assertZombieHugProviderBinding(
          'seedance-higgsfield',
          'higgsfield/genjutsu/object-swap/v1.0'
        ),
      ZombieHugProviderBindingError
    );
    assert.throws(
      () =>
        assertZombieHugProviderBinding(
          'higgsfield',
          'higgsfield/genjutsu/object-swap/v1.0'
        ),
      ZombieHugProviderBindingError
    );
  } finally {
    restore();
  }
});
