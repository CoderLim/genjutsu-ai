import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDeckTheHallsDanceAiInputs,
  DeckTheHallsDanceAiPreflightError,
} from './assert';
import {
  DECK_THE_HALLS_DANCE_AI_ASPECT_RATIO,
  DECK_THE_HALLS_DANCE_AI_DUO_PROMPT,
  DECK_THE_HALLS_DANCE_AI_MODE,
  DECK_THE_HALLS_DANCE_AI_PRODUCT_ID,
  DECK_THE_HALLS_DANCE_AI_SOLO_PROMPT,
} from './constants';

const soloOptions = {
  product: DECK_THE_HALLS_DANCE_AI_PRODUCT_ID,
  mode: DECK_THE_HALLS_DANCE_AI_MODE,
  prompt: DECK_THE_HALLS_DANCE_AI_SOLO_PROMPT,
  preset: 'solo' as const,
  useDefaultTemplate: true,
  aspectRatio: DECK_THE_HALLS_DANCE_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg'],
  contentTypes: ['image/jpeg'],
  contentLengths: [1000],
};

const duoOptions = {
  product: DECK_THE_HALLS_DANCE_AI_PRODUCT_ID,
  mode: DECK_THE_HALLS_DANCE_AI_MODE,
  prompt: DECK_THE_HALLS_DANCE_AI_DUO_PROMPT,
  preset: 'duo' as const,
  useDefaultTemplate: true,
  aspectRatio: DECK_THE_HALLS_DANCE_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg', 'genjutsu/u/g/reference-02.jpg'],
  contentTypes: ['image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1000],
};

test('accepts solo and duo fixed template bindings', () => {
  assert.doesNotThrow(() => assertDeckTheHallsDanceAiInputs(soloOptions));
  assert.doesNotThrow(() => assertDeckTheHallsDanceAiInputs(duoOptions));
});

test('accepts preview clips for each cast mode', () => {
  assert.doesNotThrow(() =>
    assertDeckTheHallsDanceAiInputs({
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
    assertDeckTheHallsDanceAiInputs({
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
      assertDeckTheHallsDanceAiInputs({
        ...soloOptions,
        prompt: DECK_THE_HALLS_DANCE_AI_DUO_PROMPT,
      }),
    DeckTheHallsDanceAiPreflightError
  );
  assert.throws(
    () =>
      assertDeckTheHallsDanceAiInputs({
        ...duoOptions,
        imageKeys: ['a.jpg'],
        contentTypes: ['image/jpeg'],
        contentLengths: [1],
      }),
    DeckTheHallsDanceAiPreflightError
  );
  assert.throws(
    () =>
      assertDeckTheHallsDanceAiInputs({ ...soloOptions, aspectRatio: '16:9' }),
    DeckTheHallsDanceAiPreflightError
  );
});
