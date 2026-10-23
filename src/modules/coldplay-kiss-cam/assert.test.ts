import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSeedanceWorkflowPrompt } from '@/modules/genjutsu/workflow';

import {
  assertColdplayKissCamInputs,
  ColdplayKissCamPreflightError,
} from './assert';
import {
  COLDPLAY_KISS_CAM_ASPECT_RATIO,
  COLDPLAY_KISS_CAM_DEFAULT_PROMPT,
  COLDPLAY_KISS_CAM_MODE,
  COLDPLAY_KISS_CAM_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: COLDPLAY_KISS_CAM_PRODUCT_ID,
  mode: COLDPLAY_KISS_CAM_MODE,
  prompt: COLDPLAY_KISS_CAM_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: COLDPLAY_KISS_CAM_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg', 'genjutsu/u/g/reference-02.jpg'],
  contentTypes: ['image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1200],
};

test('accepts the fixed Coldplay Kiss Cam template binding', () => {
  assert.doesNotThrow(() => assertColdplayKissCamInputs(validOptions));
});

test('rejects paid preview', () => {
  assert.throws(
    () =>
      assertColdplayKissCamInputs({
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
      assertColdplayKissCamInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    ColdplayKissCamPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertColdplayKissCamInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    ColdplayKissCamPreflightError
  );
});

test('rejects a prompt that only contains the official text', () => {
  assert.throws(
    () =>
      assertColdplayKissCamInputs({
        ...validOptions,
        prompt: `${COLDPLAY_KISS_CAM_DEFAULT_PROMPT} extra`,
      }),
    ColdplayKissCamPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () => assertColdplayKissCamInputs({ ...validOptions, aspectRatio: '3:4' }),
    ColdplayKissCamPreflightError
  );
  assert.throws(
    () => assertColdplayKissCamInputs({ ...validOptions, resolution: '1080p' }),
    ColdplayKissCamPreflightError
  );
  assert.throws(
    () =>
      assertColdplayKissCamInputs({
        ...validOptions,
        imageKeys: ['only.jpg'],
        contentTypes: ['image/jpeg'],
        contentLengths: [1000],
      }),
    ColdplayKissCamPreflightError
  );
});

test('product prompt uses logical references and maps them per provider tokens', () => {
  assert.match(COLDPLAY_KISS_CAM_DEFAULT_PROMPT, /Reference 1/);
  assert.match(COLDPLAY_KISS_CAM_DEFAULT_PROMPT, /Reference 2/);
  assert.doesNotMatch(COLDPLAY_KISS_CAM_DEFAULT_PROMPT, /@Image/);
  assert.doesNotMatch(COLDPLAY_KISS_CAM_DEFAULT_PROMPT, /@图像/);

  const higgsfield = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: COLDPLAY_KISS_CAM_DEFAULT_PROMPT,
    imageCount: 2,
  });
  assert.match(higgsfield, /TASK INSTRUCTION:/);
  assert.match(higgsfield, /Replace Person A with Reference 1/);
  assert.match(higgsfield, /Reference 1 = @Image1/);
  assert.match(higgsfield, /Reference 2 = @Image2/);

  const wavespeed = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: COLDPLAY_KISS_CAM_DEFAULT_PROMPT,
    imageCount: 2,
    references: {
      video: '@Video 1',
      images: ['@Image 1', '@Image 2'],
    },
  });
  assert.match(wavespeed, /Reference 1 = @Image 1/);
  assert.match(wavespeed, /Reference 2 = @Image 2/);
  assert.match(wavespeed, /Replace Person A with Reference 1/);

  const volcengine = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: COLDPLAY_KISS_CAM_DEFAULT_PROMPT,
    imageCount: 2,
    references: {
      video: '@视频1',
      images: ['@图像1', '@图像2'],
    },
  });
  assert.match(volcengine, /Reference 1 = @图像1/);
  assert.match(volcengine, /Reference 2 = @图像2/);
});
