import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCanIRideDanceAiInputs,
  CanIRideDanceAiPreflightError,
} from './assert';
import {
  CAN_I_RIDE_DANCE_AI_ASPECT_RATIO,
  CAN_I_RIDE_DANCE_AI_DUO_PROMPT,
  CAN_I_RIDE_DANCE_AI_MODE,
  CAN_I_RIDE_DANCE_AI_PRODUCT_ID,
  CAN_I_RIDE_DANCE_AI_SOLO_PROMPT,
} from './constants';

const soloOptions = {
  product: CAN_I_RIDE_DANCE_AI_PRODUCT_ID,
  mode: CAN_I_RIDE_DANCE_AI_MODE,
  prompt: CAN_I_RIDE_DANCE_AI_SOLO_PROMPT,
  preset: 'solo' as const,
  useDefaultTemplate: true,
  aspectRatio: CAN_I_RIDE_DANCE_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg'],
  contentTypes: ['image/jpeg'],
  contentLengths: [1000],
};

const duoOptions = {
  product: CAN_I_RIDE_DANCE_AI_PRODUCT_ID,
  mode: CAN_I_RIDE_DANCE_AI_MODE,
  prompt: CAN_I_RIDE_DANCE_AI_DUO_PROMPT,
  preset: 'duo' as const,
  useDefaultTemplate: true,
  aspectRatio: CAN_I_RIDE_DANCE_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg', 'genjutsu/u/g/reference-02.jpg'],
  contentTypes: ['image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1000],
};

test('accepts solo and duo fixed template bindings', () => {
  assert.doesNotThrow(() => assertCanIRideDanceAiInputs(soloOptions));
  assert.doesNotThrow(() => assertCanIRideDanceAiInputs(duoOptions));
});

test('accepts preview clips for each cast mode', () => {
  assert.doesNotThrow(() =>
    assertCanIRideDanceAiInputs({
      ...soloOptions,
      preview: true,
      useDefaultTemplate: false,
      videoKey: 'genjutsu/u/g/source.mp4',
      imageKeys: ['genjutsu/u/g/reference-01.jpg'],
      contentTypes: ['video/mp4', 'image/jpeg'],
      contentLengths: [400000, 1000],
    })
  );
  assert.doesNotThrow(() =>
    assertCanIRideDanceAiInputs({
      ...duoOptions,
      preview: true,
      useDefaultTemplate: false,
      videoKey: 'genjutsu/u/g/source.mp4',
      imageKeys: [
        'genjutsu/u/g/reference-01.jpg',
        'genjutsu/u/g/reference-02.jpg',
      ],
      contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg'],
      contentLengths: [400000, 1000, 1000],
    })
  );
});

test('rejects cast/prompt mismatch and wrong image counts', () => {
  assert.throws(
    () =>
      assertCanIRideDanceAiInputs({
        ...soloOptions,
        prompt: CAN_I_RIDE_DANCE_AI_DUO_PROMPT,
      }),
    CanIRideDanceAiPreflightError
  );
  assert.throws(
    () =>
      assertCanIRideDanceAiInputs({
        ...duoOptions,
        imageKeys: ['a.jpg'],
        contentTypes: ['image/jpeg'],
        contentLengths: [1],
      }),
    CanIRideDanceAiPreflightError
  );
  assert.throws(
    () => assertCanIRideDanceAiInputs({ ...soloOptions, aspectRatio: '16:9' }),
    CanIRideDanceAiPreflightError
  );
});
