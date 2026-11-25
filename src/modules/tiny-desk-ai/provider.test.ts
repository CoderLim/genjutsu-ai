import assert from 'node:assert/strict';
import test from 'node:test';

import { envConfigs } from '@/config';
import { HIGGSFIELD_GENJUTSU_MODELS } from '@/modules/genjutsu/model-config';

import { TINY_DESK_AI_MODE } from './constants';
import {
  assertTinyDeskAiProviderBinding,
  resolveTinyDeskAiProviderTarget,
  TinyDeskAiProviderBindingError,
} from './provider';

test('tiny-desk-ai pins Genjutsu Standard independently of the homepage', () => {
  assert.deepEqual(resolveTinyDeskAiProviderTarget(), {
    provider: 'higgsfield',
    model: HIGGSFIELD_GENJUTSU_MODELS.standard[TINY_DESK_AI_MODE],
  });
});

test('tiny-desk-ai accepts current Standard and historical Light tasks', () => {
  assert.doesNotThrow(() =>
    assertTinyDeskAiProviderBinding(
      'higgsfield',
      HIGGSFIELD_GENJUTSU_MODELS.light[TINY_DESK_AI_MODE]
    )
  );
  assert.doesNotThrow(() =>
    assertTinyDeskAiProviderBinding(
      'higgsfield',
      HIGGSFIELD_GENJUTSU_MODELS.standard[TINY_DESK_AI_MODE]
    )
  );
});

test('tiny-desk-ai rejects unrelated providers and unknown models', () => {
  assert.throws(
    () =>
      assertTinyDeskAiProviderBinding(
        'seedance-wavespeed',
        'bytedance/seedance-2.5/video-edit'
      ),
    TinyDeskAiProviderBindingError
  );
  assert.throws(
    () => assertTinyDeskAiProviderBinding('higgsfield', 'not-an-allowed-model'),
    TinyDeskAiProviderBindingError
  );
});

test('Tiny Desk ignores global and product provider env overrides', () => {
  const previousMode = envConfigs.genjutsu_object_swap_provider;
  const previousProduct = envConfigs.genjutsu_product_provider;
  try {
    envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
    envConfigs.genjutsu_product_provider = 'seedance-higgsfield';
    assert.equal(
      resolveTinyDeskAiProviderTarget().model,
      HIGGSFIELD_GENJUTSU_MODELS.standard['objects-swap']
    );
  } finally {
    envConfigs.genjutsu_object_swap_provider = previousMode;
    envConfigs.genjutsu_product_provider = previousProduct;
  }
});
