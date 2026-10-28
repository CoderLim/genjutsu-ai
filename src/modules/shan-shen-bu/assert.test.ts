import assert from 'node:assert/strict';
import test from 'node:test';

import { assertShanShenBuInputs, ShanShenBuPreflightError } from './assert';
import {
  SHAN_SHEN_BU_ASPECT_RATIO,
  SHAN_SHEN_BU_DEFAULT_PROMPT,
  SHAN_SHEN_BU_MODE,
  SHAN_SHEN_BU_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: SHAN_SHEN_BU_PRODUCT_ID,
  mode: SHAN_SHEN_BU_MODE,
  prompt: SHAN_SHEN_BU_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: SHAN_SHEN_BU_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg'],
  contentTypes: ['image/jpeg'],
  contentLengths: [1000],
};

test('accepts the fixed Shan Shen Bu template binding', () => {
  assert.doesNotThrow(() => assertShanShenBuInputs(validOptions));
});

test('accepts a 480p trimmed preview clip plus one image', () => {
  assert.doesNotThrow(() =>
    assertShanShenBuInputs({
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
      assertShanShenBuInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    ShanShenBuPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertShanShenBuInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    ShanShenBuPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () => assertShanShenBuInputs({ ...validOptions, aspectRatio: '16:9' }),
    ShanShenBuPreflightError
  );
  assert.throws(
    () => assertShanShenBuInputs({ ...validOptions, resolution: '1080p' }),
    ShanShenBuPreflightError
  );
  assert.throws(
    () =>
      assertShanShenBuInputs({
        ...validOptions,
        imageKeys: ['a.jpg', 'b.jpg'],
        contentTypes: ['image/jpeg', 'image/jpeg'],
        contentLengths: [1000, 1200],
      }),
    ShanShenBuPreflightError
  );
});
