import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertGta5GoodbyeAiVideoInputs,
  Gta5GoodbyeAiVideoPreflightError,
} from './assert';
import {
  GTA_5_GOODBYE_AI_VIDEO_ASPECT_RATIO,
  GTA_5_GOODBYE_AI_VIDEO_DEFAULT_PROMPT,
  GTA_5_GOODBYE_AI_VIDEO_MODE,
  GTA_5_GOODBYE_AI_VIDEO_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: GTA_5_GOODBYE_AI_VIDEO_PRODUCT_ID,
  mode: GTA_5_GOODBYE_AI_VIDEO_MODE,
  prompt: GTA_5_GOODBYE_AI_VIDEO_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: GTA_5_GOODBYE_AI_VIDEO_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg'],
  contentTypes: ['image/jpeg'],
  contentLengths: [1000],
};

test('accepts the fixed GTA 5 Goodbye template binding', () => {
  assert.doesNotThrow(() => assertGta5GoodbyeAiVideoInputs(validOptions));
});

test('accepts a 480p trimmed preview clip plus one image', () => {
  assert.doesNotThrow(() =>
    assertGta5GoodbyeAiVideoInputs({
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
      assertGta5GoodbyeAiVideoInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    Gta5GoodbyeAiVideoPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertGta5GoodbyeAiVideoInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    Gta5GoodbyeAiVideoPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () =>
      assertGta5GoodbyeAiVideoInputs({ ...validOptions, aspectRatio: '16:9' }),
    Gta5GoodbyeAiVideoPreflightError
  );
  assert.throws(
    () =>
      assertGta5GoodbyeAiVideoInputs({ ...validOptions, resolution: '1080p' }),
    Gta5GoodbyeAiVideoPreflightError
  );
  assert.throws(
    () =>
      assertGta5GoodbyeAiVideoInputs({
        ...validOptions,
        imageKeys: ['a.jpg', 'b.jpg'],
        contentTypes: ['image/jpeg', 'image/jpeg'],
        contentLengths: [1, 1],
      }),
    Gta5GoodbyeAiVideoPreflightError
  );
});
