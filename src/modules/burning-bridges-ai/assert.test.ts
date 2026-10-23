import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertBurningBridgesAiInputs,
  BurningBridgesAiPreflightError,
} from './assert';
import {
  BURNING_BRIDGES_AI_ASPECT_RATIO,
  BURNING_BRIDGES_AI_DEFAULT_PROMPT,
  BURNING_BRIDGES_AI_MODE,
  BURNING_BRIDGES_AI_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: BURNING_BRIDGES_AI_PRODUCT_ID,
  mode: BURNING_BRIDGES_AI_MODE,
  prompt: BURNING_BRIDGES_AI_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: BURNING_BRIDGES_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg'],
  contentTypes: ['image/jpeg'],
  contentLengths: [1000],
};

test('accepts the fixed Burning Bridges template binding', () => {
  assert.doesNotThrow(() => assertBurningBridgesAiInputs(validOptions));
});

test('rejects paid preview', () => {
  assert.throws(
    () =>
      assertBurningBridgesAiInputs({
        ...validOptions,
        preview: true,
        useDefaultTemplate: false,
      }),
    /Paid preview is no longer supported/
  );
});

test('rejects motion-transfer mode', () => {
  assert.throws(
    () =>
      assertBurningBridgesAiInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    BurningBridgesAiPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertBurningBridgesAiInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    BurningBridgesAiPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () =>
      assertBurningBridgesAiInputs({ ...validOptions, aspectRatio: '9:16' }),
    BurningBridgesAiPreflightError
  );
  assert.throws(
    () =>
      assertBurningBridgesAiInputs({ ...validOptions, resolution: '1080p' }),
    BurningBridgesAiPreflightError
  );
  assert.throws(
    () =>
      assertBurningBridgesAiInputs({
        ...validOptions,
        imageKeys: ['a.jpg', 'b.jpg'],
        contentTypes: ['image/jpeg', 'image/jpeg'],
        contentLengths: [1, 1],
      }),
    BurningBridgesAiPreflightError
  );
});
