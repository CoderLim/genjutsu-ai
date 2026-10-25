import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSeedanceWorkflowPrompt } from '@/modules/genjutsu/workflow';

import {
  assertGangnamStyleAiInputs,
  GangnamStyleAiPreflightError,
} from './assert';
import {
  GANGNAM_STYLE_AI_ASPECT_RATIO,
  GANGNAM_STYLE_AI_DEFAULT_PROMPT,
  GANGNAM_STYLE_AI_MODE,
  GANGNAM_STYLE_AI_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: GANGNAM_STYLE_AI_PRODUCT_ID,
  mode: GANGNAM_STYLE_AI_MODE,
  prompt: GANGNAM_STYLE_AI_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: GANGNAM_STYLE_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: [
    'genjutsu/u/g/reference-01.jpg',
    'genjutsu/u/g/reference-02.jpg',
    'genjutsu/u/g/reference-03.jpg',
  ],
  contentTypes: ['image/jpeg', 'image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1200, 1100],
};

test('accepts the fixed Gangnam Style AI template binding', () => {
  assert.doesNotThrow(() => assertGangnamStyleAiInputs(validOptions));
});

test('accepts a 480p trimmed preview clip plus three images', () => {
  assert.doesNotThrow(() =>
    assertGangnamStyleAiInputs({
      ...validOptions,
      preview: true,
      useDefaultTemplate: false,
      resolution: '480p',
      videoKey: 'genjutsu/u/g/source.mp4',
      contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg', 'image/jpeg'],
      contentLengths: [400000, 1000, 1200, 1100],
    })
  );
});

test('rejects motion-transfer mode', () => {
  assert.throws(
    () =>
      assertGangnamStyleAiInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    GangnamStyleAiPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertGangnamStyleAiInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    GangnamStyleAiPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () => assertGangnamStyleAiInputs({ ...validOptions, aspectRatio: '4:3' }),
    GangnamStyleAiPreflightError
  );
  assert.throws(
    () => assertGangnamStyleAiInputs({ ...validOptions, resolution: '1080p' }),
    GangnamStyleAiPreflightError
  );
  assert.throws(
    () =>
      assertGangnamStyleAiInputs({
        ...validOptions,
        imageKeys: ['a.jpg', 'b.jpg'],
        contentTypes: ['image/jpeg', 'image/jpeg'],
        contentLengths: [1000, 1200],
      }),
    GangnamStyleAiPreflightError
  );
});

test('rejects preview that still uses the default template', () => {
  assert.throws(
    () =>
      assertGangnamStyleAiInputs({
        ...validOptions,
        preview: true,
        useDefaultTemplate: true,
        videoKey: 'genjutsu/u/g/source.mp4',
        contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg', 'image/jpeg'],
        contentLengths: [400000, 1000, 1200, 1100],
      }),
    GangnamStyleAiPreflightError
  );
});

test('product prompt uses Reference N, not provider image tokens', () => {
  assert.match(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /Reference 1/);
  assert.match(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /Reference 2/);
  assert.match(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /Reference 3/);
  assert.doesNotMatch(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /@Image/);
  assert.doesNotMatch(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /@图像/);
});

test('workflow prompt still injects provider tokens around the product prompt', () => {
  const body = buildSeedanceWorkflowPrompt({
    userPrompt: GANGNAM_STYLE_AI_DEFAULT_PROMPT,
    mode: 'objects-swap',
    imageCount: 3,
  });
  assert.match(body, /Reference 1/);
  assert.match(body, /@Image1|@Image 1|@图像1/);
});
