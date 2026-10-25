import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertSmalltownBoyDanceInputs,
  SmalltownBoyDancePreflightError,
} from './assert';
import {
  LEGACY_SMALLTOWN_PROMPTS,
  SMALLTOWN_ASPECT_RATIO,
  SMALLTOWN_DEFAULT_PROMPT,
  SMALLTOWN_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: SMALLTOWN_PRODUCT_ID,
  prompt: SMALLTOWN_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: SMALLTOWN_ASPECT_RATIO,
  resolution: '720p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg', 'genjutsu/u/g/reference-02.jpg'],
  contentTypes: ['image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1200],
};

test('accepts server-template binding with two images', () => {
  assert.doesNotThrow(() => assertSmalltownBoyDanceInputs(validOptions));
});

test('accepts a 480p trimmed preview clip plus two images', () => {
  assert.doesNotThrow(() =>
    assertSmalltownBoyDanceInputs({
      ...validOptions,
      preview: true,
      useDefaultTemplate: false,
      resolution: '480p',
      videoKey: 'genjutsu/u/g/source.mp4',
      imageKeys: [
        'genjutsu/u/g/reference-01.jpg',
        'genjutsu/u/g/reference-02.jpg',
      ],
      contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg'],
      contentLengths: [400000, 1000, 1200],
    })
  );
});

test('rejects client-uploaded video path (no useDefaultTemplate)', () => {
  assert.throws(
    () =>
      assertSmalltownBoyDanceInputs({
        ...validOptions,
        useDefaultTemplate: false,
        contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg'],
        contentLengths: [3_018_016, 1000, 1200],
      }),
    SmalltownBoyDancePreflightError
  );
});

test('rejects same-size spoof without server template flag', () => {
  assert.throws(
    () =>
      assertSmalltownBoyDanceInputs({
        product: SMALLTOWN_PRODUCT_ID,
        prompt: SMALLTOWN_DEFAULT_PROMPT,
        imageKeys: ['a', 'b'],
        contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg'],
        contentLengths: [3_018_016, 1, 1],
      }),
    SmalltownBoyDancePreflightError
  );
});

test('rejects single image', () => {
  assert.throws(
    () =>
      assertSmalltownBoyDanceInputs({
        ...validOptions,
        imageKeys: ['only-one.jpg'],
        contentTypes: ['image/jpeg'],
        contentLengths: [1000],
      }),
    SmalltownBoyDancePreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertSmalltownBoyDanceInputs({
        ...validOptions,
        prompt: 'hacked prompt',
      }),
    SmalltownBoyDancePreflightError
  );
});

test('accepts legacy no-space WaveSpeed tags for in-flight tasks', () => {
  assert.doesNotThrow(() =>
    assertSmalltownBoyDanceInputs({
      ...validOptions,
      prompt: LEGACY_SMALLTOWN_PROMPTS[0],
    })
  );
});

test('rejects wrong aspect ratio', () => {
  assert.throws(
    () =>
      assertSmalltownBoyDanceInputs({
        ...validOptions,
        aspectRatio: '16:9',
      }),
    SmalltownBoyDancePreflightError
  );
});

test('rejects 1080p', () => {
  assert.throws(
    () =>
      assertSmalltownBoyDanceInputs({
        ...validOptions,
        resolution: '1080p',
      }),
    SmalltownBoyDancePreflightError
  );
});
