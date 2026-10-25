import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSayItRightAiInputs, SayItRightAiPreflightError } from './assert';
import {
  SAY_IT_RIGHT_AI_ASPECT_RATIO,
  SAY_IT_RIGHT_AI_DEFAULT_PROMPT,
  SAY_IT_RIGHT_AI_MODE,
  SAY_IT_RIGHT_AI_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: SAY_IT_RIGHT_AI_PRODUCT_ID,
  mode: SAY_IT_RIGHT_AI_MODE,
  prompt: SAY_IT_RIGHT_AI_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: SAY_IT_RIGHT_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg'],
  contentTypes: ['image/jpeg'],
  contentLengths: [1000],
};

test('accepts the fixed Say It Right template binding', () => {
  assert.doesNotThrow(() => assertSayItRightAiInputs(validOptions));
});

test('accepts a 480p trimmed preview clip plus one image', () => {
  assert.doesNotThrow(() =>
    assertSayItRightAiInputs({
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
      assertSayItRightAiInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    SayItRightAiPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertSayItRightAiInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    SayItRightAiPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () => assertSayItRightAiInputs({ ...validOptions, aspectRatio: '16:9' }),
    SayItRightAiPreflightError
  );
  assert.throws(
    () => assertSayItRightAiInputs({ ...validOptions, resolution: '1080p' }),
    SayItRightAiPreflightError
  );
  assert.throws(
    () =>
      assertSayItRightAiInputs({
        ...validOptions,
        imageKeys: ['a.jpg', 'b.jpg'],
        contentTypes: ['image/jpeg', 'image/jpeg'],
        contentLengths: [1, 1],
      }),
    SayItRightAiPreflightError
  );
});
