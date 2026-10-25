import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSeedanceWorkflowPrompt } from '@/modules/genjutsu/workflow';

import {
  assertGasStationDanceAiInputs,
  GasStationDanceAiPreflightError,
} from './assert';
import {
  GAS_STATION_DANCE_AI_ASPECT_RATIO,
  GAS_STATION_DANCE_AI_DEFAULT_PROMPT,
  GAS_STATION_DANCE_AI_MODE,
  GAS_STATION_DANCE_AI_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: GAS_STATION_DANCE_AI_PRODUCT_ID,
  mode: GAS_STATION_DANCE_AI_MODE,
  prompt: GAS_STATION_DANCE_AI_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: GAS_STATION_DANCE_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: [
    'genjutsu/u/g/reference-01.jpg',
    'genjutsu/u/g/reference-02.jpg',
    'genjutsu/u/g/reference-03.jpg',
  ],
  contentTypes: ['image/jpeg', 'image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1200, 1100],
};

test('accepts the fixed Gas Station Dance AI template binding', () => {
  assert.doesNotThrow(() => assertGasStationDanceAiInputs(validOptions));
});

test('accepts a 480p trimmed preview clip plus three images', () => {
  assert.doesNotThrow(() =>
    assertGasStationDanceAiInputs({
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
      assertGasStationDanceAiInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    GasStationDanceAiPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertGasStationDanceAiInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    GasStationDanceAiPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () =>
      assertGasStationDanceAiInputs({
        ...validOptions,
        aspectRatio: '16:9',
      }),
    GasStationDanceAiPreflightError
  );
  assert.throws(
    () =>
      assertGasStationDanceAiInputs({
        ...validOptions,
        resolution: '1080p',
      }),
    GasStationDanceAiPreflightError
  );
  assert.throws(
    () =>
      assertGasStationDanceAiInputs({
        ...validOptions,
        imageKeys: ['a.jpg', 'b.jpg'],
        contentTypes: ['image/jpeg', 'image/jpeg'],
        contentLengths: [1000, 1200],
      }),
    GasStationDanceAiPreflightError
  );
});

test('rejects preview that still uses the default template', () => {
  assert.throws(
    () =>
      assertGasStationDanceAiInputs({
        ...validOptions,
        preview: true,
        useDefaultTemplate: true,
        videoKey: 'genjutsu/u/g/source.mp4',
        contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg', 'image/jpeg'],
        contentLengths: [400000, 1000, 1200, 1100],
      }),
    GasStationDanceAiPreflightError
  );
});

test('product prompt uses Reference N, not provider image tokens', () => {
  assert.match(GAS_STATION_DANCE_AI_DEFAULT_PROMPT, /Reference 1/);
  assert.match(GAS_STATION_DANCE_AI_DEFAULT_PROMPT, /Reference 2/);
  assert.match(GAS_STATION_DANCE_AI_DEFAULT_PROMPT, /Reference 3/);
  assert.doesNotMatch(GAS_STATION_DANCE_AI_DEFAULT_PROMPT, /@Image/);
  assert.doesNotMatch(GAS_STATION_DANCE_AI_DEFAULT_PROMPT, /@图像/);
});

test('workflow prompt still injects provider tokens around the product prompt', () => {
  const body = buildSeedanceWorkflowPrompt({
    userPrompt: GAS_STATION_DANCE_AI_DEFAULT_PROMPT,
    mode: 'objects-swap',
    imageCount: 3,
  });
  assert.match(body, /Reference 1/);
  assert.match(body, /@Image1|@Image 1|@图像1/);
});
