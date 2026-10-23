import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWavespeedSeedancePayload } from '@/modules/genjutsu/seedance-wavespeed';

import { assertCrazyFrogInputs, CrazyFrogPreflightError } from './assert';
import {
  CRAZY_FROG_ASPECT_RATIO,
  CRAZY_FROG_DEFAULT_PROMPT,
  CRAZY_FROG_MODE,
  CRAZY_FROG_PRODUCT_ID,
  LEGACY_CRAZY_FROG_PROMPTS,
} from './constants';

const validOptions = {
  product: CRAZY_FROG_PRODUCT_ID,
  prompt: CRAZY_FROG_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: CRAZY_FROG_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg', 'genjutsu/u/g/reference-02.jpg'],
  contentTypes: ['image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1200],
};

test('default prompt maps both riders with spaced image tags', () => {
  assert.match(CRAZY_FROG_DEFAULT_PROMPT, /@Image 1/);
  assert.match(CRAZY_FROG_DEFAULT_PROMPT, /@Image 2/);
  assert.doesNotMatch(CRAZY_FROG_DEFAULT_PROMPT, /@Video1\b/);
  assert.doesNotMatch(CRAZY_FROG_DEFAULT_PROMPT, /@Image1\b/);
  assert.doesNotMatch(CRAZY_FROG_DEFAULT_PROMPT, /@Image2\b/);
  assert.match(CRAZY_FROG_DEFAULT_PROMPT, /red-and-black plaid shirt/);
  assert.match(CRAZY_FROG_DEFAULT_PROMPT, /red cap and dark jacket/);
  assert.match(CRAZY_FROG_DEFAULT_PROMPT, /middle close-up/);
  assert.match(CRAZY_FROG_DEFAULT_PROMPT, /same pursuing rider/);
  assert.match(CRAZY_FROG_DEFAULT_PROMPT, /orange motorcycle/);
  assert.doesNotMatch(CRAZY_FROG_DEFAULT_PROMPT, /complete visible appearance/);
  assert.doesNotMatch(CRAZY_FROG_DEFAULT_PROMPT, /face, hair, body/);
});

test('accepts server-template binding with two images', () => {
  assert.doesNotThrow(() => assertCrazyFrogInputs(validOptions));
});

test('rejects paid preview', () => {
  assert.throws(
    () =>
      assertCrazyFrogInputs({
        ...validOptions,
        preview: true,
        useDefaultTemplate: false,
      }),
    /Paid preview is no longer supported/
  );
});

test('rejects client-uploaded video path without server template', () => {
  assert.throws(
    () =>
      assertCrazyFrogInputs({
        ...validOptions,
        useDefaultTemplate: false,
        contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg'],
        contentLengths: [3_620_755, 1000, 1200],
      }),
    CrazyFrogPreflightError
  );
});

test('rejects single image', () => {
  assert.throws(
    () =>
      assertCrazyFrogInputs({
        ...validOptions,
        imageKeys: ['only-one.jpg'],
        contentTypes: ['image/jpeg'],
        contentLengths: [1000],
      }),
    CrazyFrogPreflightError
  );
});

test('accepts historical fixed prompts', () => {
  for (const prompt of LEGACY_CRAZY_FROG_PROMPTS) {
    assert.notEqual(prompt, CRAZY_FROG_DEFAULT_PROMPT);
    assert.doesNotThrow(() =>
      assertCrazyFrogInputs({
        ...validOptions,
        prompt,
      })
    );
  }
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertCrazyFrogInputs({
        ...validOptions,
        prompt: 'hacked prompt',
      }),
    CrazyFrogPreflightError
  );
});

test('rejects wrong aspect ratio', () => {
  assert.throws(
    () =>
      assertCrazyFrogInputs({
        ...validOptions,
        aspectRatio: '16:9',
      }),
    CrazyFrogPreflightError
  );
});

test('provider prompt carries both mappings once inside the shared object-swap rules', () => {
  const { body } = buildWavespeedSeedancePayload({
    mode: CRAZY_FROG_MODE,
    resolution: '480p',
    prompt: CRAZY_FROG_DEFAULT_PROMPT,
    videoUrl: 'https://example.com/crazy-frog.mp4',
    imageUrls: [
      'https://example.com/lead.png',
      'https://example.com/chaser.png',
    ],
    sourceDurationSeconds: 11.4,
  });

  const prompt = String(body.prompt);
  assert.deepEqual(body.reference_images, [
    'https://example.com/lead.png',
    'https://example.com/chaser.png',
  ]);
  assert.match(
    prompt,
    /Replace the lead rider wearing a red-and-black plaid shirt, closest to the camera, with @Image 1/
  );
  assert.match(
    prompt,
    /Replace the pursuing rider wearing a red cap and dark jacket on the orange motorcycle with @Image 2/
  );
  assert.match(prompt, /same pursuing rider assigned to @Image 2/);
  assert.equal(prompt.split('complete reference appearance').length - 1, 1);
  assert.match(prompt, /REFERENCE IDENTITY:/);
  assert.doesNotMatch(prompt, /Apply every @Image N/);
  assert.doesNotMatch(prompt, /face, hair, body, clothing/);
});

test('rejects 1080p', () => {
  assert.throws(
    () =>
      assertCrazyFrogInputs({
        ...validOptions,
        resolution: '1080p',
      }),
    CrazyFrogPreflightError
  );
});
