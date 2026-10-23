import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSeedanceWorkflowPrompt } from '@/modules/genjutsu/workflow';

import { assertZombieHugInputs, ZombieHugPreflightError } from './assert';
import {
  ZOMBIE_HUG_DEFAULT_PROMPT,
  ZOMBIE_HUG_MODE,
  ZOMBIE_HUG_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: ZOMBIE_HUG_PRODUCT_ID,
  mode: ZOMBIE_HUG_MODE,
  prompt: ZOMBIE_HUG_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: '16:9',
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg', 'genjutsu/u/g/reference-02.jpg'],
  contentTypes: ['image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1200],
};

test('accepts the fixed Zombie Hug template binding', () => {
  assert.doesNotThrow(() => assertZombieHugInputs(validOptions));
});

test('accepts either 16:9 or 9:16 aspect ratio', () => {
  assert.doesNotThrow(() =>
    assertZombieHugInputs({ ...validOptions, aspectRatio: '9:16' })
  );
});

test('accepts a 480p trimmed preview clip plus two images', () => {
  assert.doesNotThrow(() =>
    assertZombieHugInputs({
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
      assertZombieHugInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    ZombieHugPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertZombieHugInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    ZombieHugPreflightError
  );
});

test('rejects a prompt that only contains the official text', () => {
  assert.throws(
    () =>
      assertZombieHugInputs({
        ...validOptions,
        prompt: `${ZOMBIE_HUG_DEFAULT_PROMPT} extra`,
      }),
    ZombieHugPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () => assertZombieHugInputs({ ...validOptions, aspectRatio: '3:4' }),
    ZombieHugPreflightError
  );
  assert.throws(
    () => assertZombieHugInputs({ ...validOptions, resolution: '1080p' }),
    ZombieHugPreflightError
  );
  assert.throws(
    () =>
      assertZombieHugInputs({
        ...validOptions,
        imageKeys: ['only.jpg'],
        contentTypes: ['image/jpeg'],
        contentLengths: [1000],
      }),
    ZombieHugPreflightError
  );
});

test('product prompt uses logical references and maps them per provider tokens', () => {
  assert.match(ZOMBIE_HUG_DEFAULT_PROMPT, /Reference 1/);
  assert.match(ZOMBIE_HUG_DEFAULT_PROMPT, /Reference 2/);
  assert.doesNotMatch(ZOMBIE_HUG_DEFAULT_PROMPT, /@Image/);
  assert.doesNotMatch(ZOMBIE_HUG_DEFAULT_PROMPT, /@图像/);

  const higgsfield = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: ZOMBIE_HUG_DEFAULT_PROMPT,
    imageCount: 2,
  });
  assert.match(higgsfield, /TASK INSTRUCTION:/);
  assert.match(higgsfield, /Character A = Reference 1/);
  assert.match(higgsfield, /Character B = Reference 2/);
  assert.match(higgsfield, /FINAL WARM \/ HUGGING SCENE/);
  assert.match(higgsfield, /Reference 1 = @Image1/);
  assert.match(higgsfield, /Reference 2 = @Image2/);

  const wavespeed = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: ZOMBIE_HUG_DEFAULT_PROMPT,
    imageCount: 2,
    references: {
      video: '@Video 1',
      images: ['@Image 1', '@Image 2'],
    },
  });
  assert.match(wavespeed, /Reference 1 = @Image 1/);
  assert.match(wavespeed, /Reference 2 = @Image 2/);
  assert.match(wavespeed, /Character A = Reference 1/);

  const volcengine = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: ZOMBIE_HUG_DEFAULT_PROMPT,
    imageCount: 2,
    references: {
      video: '@视频1',
      images: ['@图像1', '@图像2'],
    },
  });
  assert.match(volcengine, /Reference 1 = @图像1/);
  assert.match(volcengine, /Reference 2 = @图像2/);
});
