import assert from 'node:assert/strict';
import test from 'node:test';

import { assertFlyingCarAiInputs, FlyingCarAiPreflightError } from './assert';
import {
  FLYING_CAR_AI_ASPECT_RATIO,
  FLYING_CAR_AI_DEFAULT_PROMPT,
  FLYING_CAR_AI_MODE,
  FLYING_CAR_AI_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: FLYING_CAR_AI_PRODUCT_ID,
  mode: FLYING_CAR_AI_MODE,
  prompt: FLYING_CAR_AI_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: FLYING_CAR_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg'],
  contentTypes: ['image/jpeg'],
  contentLengths: [1000],
};

test('accepts the fixed Flying Car template binding', () => {
  assert.doesNotThrow(() => assertFlyingCarAiInputs(validOptions));
});

test('accepts a 480p trimmed preview clip plus one image', () => {
  assert.doesNotThrow(() =>
    assertFlyingCarAiInputs({
      ...validOptions,
      preview: true,
      useDefaultTemplate: false,
      resolution: '480p',
      videoKey: 'genjutsu/u/g/source.mp4',
      imageKeys: ['genjutsu/u/g/reference-01.jpg'],
      contentTypes: ['video/mp4', 'image/jpeg'],
      contentLengths: [400000, 1000],
    })
  );
});

test('rejects motion-transfer mode', () => {
  assert.throws(
    () =>
      assertFlyingCarAiInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    FlyingCarAiPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertFlyingCarAiInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    FlyingCarAiPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () => assertFlyingCarAiInputs({ ...validOptions, aspectRatio: '16:9' }),
    FlyingCarAiPreflightError
  );
  assert.throws(
    () => assertFlyingCarAiInputs({ ...validOptions, resolution: '1080p' }),
    FlyingCarAiPreflightError
  );
  assert.throws(
    () =>
      assertFlyingCarAiInputs({
        ...validOptions,
        imageKeys: ['a.jpg', 'b.jpg'],
        contentTypes: ['image/jpeg', 'image/jpeg'],
        contentLengths: [1000, 1200],
      }),
    FlyingCarAiPreflightError
  );
});
