import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSeedanceWorkflowPrompt } from '@/modules/genjutsu/workflow';

import { A2oLiteAiPreflightError, assertA2oLiteAiInputs } from './assert';
import {
  A2O_LITE_AI_ASPECT_RATIO,
  A2O_LITE_AI_DEFAULT_PROMPT,
  A2O_LITE_AI_MODE,
  A2O_LITE_AI_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: A2O_LITE_AI_PRODUCT_ID,
  mode: A2O_LITE_AI_MODE,
  prompt: A2O_LITE_AI_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: A2O_LITE_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg', 'genjutsu/u/g/reference-02.jpg'],
  contentTypes: ['image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1200],
};

test('accepts the fixed A2O template binding', () => {
  assert.doesNotThrow(() => assertA2oLiteAiInputs(validOptions));
});

test('accepts a 480p trimmed preview clip plus two images', () => {
  assert.doesNotThrow(() =>
    assertA2oLiteAiInputs({
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

test('rejects motion-transfer mode', () => {
  assert.throws(
    () =>
      assertA2oLiteAiInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    A2oLiteAiPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertA2oLiteAiInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    A2oLiteAiPreflightError
  );
});

test('rejects a prompt that only contains the official text', () => {
  assert.throws(
    () =>
      assertA2oLiteAiInputs({
        ...validOptions,
        prompt: `${A2O_LITE_AI_DEFAULT_PROMPT} extra`,
      }),
    A2oLiteAiPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () => assertA2oLiteAiInputs({ ...validOptions, aspectRatio: '3:4' }),
    A2oLiteAiPreflightError
  );
  assert.throws(
    () => assertA2oLiteAiInputs({ ...validOptions, resolution: '1080p' }),
    A2oLiteAiPreflightError
  );
  assert.throws(
    () =>
      assertA2oLiteAiInputs({
        ...validOptions,
        imageKeys: ['only.jpg'],
        contentTypes: ['image/jpeg'],
        contentLengths: [1000],
      }),
    A2oLiteAiPreflightError
  );
});

test('product prompt uses logical references and maps them per provider tokens', () => {
  assert.match(A2O_LITE_AI_DEFAULT_PROMPT, /Reference 1/);
  assert.match(A2O_LITE_AI_DEFAULT_PROMPT, /Reference 2/);
  assert.doesNotMatch(A2O_LITE_AI_DEFAULT_PROMPT, /@Image/);
  assert.doesNotMatch(A2O_LITE_AI_DEFAULT_PROMPT, /@图像/);

  const higgsfield = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: A2O_LITE_AI_DEFAULT_PROMPT,
    imageCount: 2,
  });
  assert.match(higgsfield, /TASK INSTRUCTION:/);
  assert.match(higgsfield, /Replace Dancer A with Reference 1/);
  assert.match(higgsfield, /Reference 1 = @Image1/);
  assert.match(higgsfield, /Reference 2 = @Image2/);

  const wavespeed = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: A2O_LITE_AI_DEFAULT_PROMPT,
    imageCount: 2,
    references: {
      video: '@Video 1',
      images: ['@Image 1', '@Image 2'],
    },
  });
  assert.match(wavespeed, /Reference 1 = @Image 1/);
  assert.match(wavespeed, /Reference 2 = @Image 2/);
  assert.match(wavespeed, /Replace Dancer A with Reference 1/);

  const volcengine = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: A2O_LITE_AI_DEFAULT_PROMPT,
    imageCount: 2,
    references: {
      video: '@视频1',
      images: ['@图像1', '@图像2'],
    },
  });
  assert.match(volcengine, /Reference 1 = @图像1/);
  assert.match(volcengine, /Reference 2 = @图像2/);
});
