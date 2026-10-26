import assert from 'node:assert/strict';
import test from 'node:test';

import { assertTinyDeskAiInputs, TinyDeskAiPreflightError } from './assert';
import {
  buildTinyDeskAiPrompt,
  TINY_DESK_AI_ASPECT_RATIO,
  TINY_DESK_AI_MODE,
  TINY_DESK_AI_PRODUCT_ID,
} from './constants';

function optionsForCount(count: number) {
  return {
    product: TINY_DESK_AI_PRODUCT_ID,
    mode: TINY_DESK_AI_MODE,
    prompt: buildTinyDeskAiPrompt(count),
    useDefaultTemplate: true,
    aspectRatio: TINY_DESK_AI_ASPECT_RATIO,
    resolution: '480p' as const,
    imageKeys: Array.from(
      { length: count },
      (_, i) => `genjutsu/u/g/reference-0${i + 1}.jpg`
    ),
    contentTypes: Array.from({ length: count }, () => 'image/jpeg'),
    contentLengths: Array.from({ length: count }, () => 1000),
  };
}

test('accepts 1–5 contiguous cast sizes with matching prompts', () => {
  for (const count of [1, 2, 3, 4, 5] as const) {
    assert.doesNotThrow(() => assertTinyDeskAiInputs(optionsForCount(count)));
  }
});

test('accepts a 480p preview clip plus up to five images', () => {
  const base = optionsForCount(3);
  assert.doesNotThrow(() =>
    assertTinyDeskAiInputs({
      ...base,
      preview: true,
      useDefaultTemplate: false,
      resolution: '480p',
      videoKey: 'genjutsu/u/g/source.mp4',
      contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg', 'image/jpeg'],
      contentLengths: [400000, 1000, 1000, 1000],
    })
  );
});

test('rejects motion-transfer mode', () => {
  assert.throws(
    () =>
      assertTinyDeskAiInputs({
        ...optionsForCount(1),
        mode: 'motion-transfer',
      }),
    TinyDeskAiPreflightError
  );
});

test('rejects prompt tampering and cast/prompt mismatch', () => {
  assert.throws(
    () =>
      assertTinyDeskAiInputs({
        ...optionsForCount(1),
        prompt: 'custom prompt',
      }),
    TinyDeskAiPreflightError
  );
  assert.throws(
    () =>
      assertTinyDeskAiInputs({
        ...optionsForCount(2),
        prompt: buildTinyDeskAiPrompt(5),
      }),
    TinyDeskAiPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () =>
      assertTinyDeskAiInputs({
        ...optionsForCount(1),
        aspectRatio: '16:9',
      }),
    TinyDeskAiPreflightError
  );
  assert.throws(
    () =>
      assertTinyDeskAiInputs({
        ...optionsForCount(1),
        resolution: '1080p',
      }),
    TinyDeskAiPreflightError
  );
  assert.throws(
    () =>
      assertTinyDeskAiInputs({
        ...optionsForCount(1),
        imageKeys: [],
        contentTypes: [],
        contentLengths: [],
        prompt: buildTinyDeskAiPrompt(1),
      }),
    TinyDeskAiPreflightError
  );
  assert.throws(
    () =>
      assertTinyDeskAiInputs({
        ...optionsForCount(5),
        imageKeys: [
          ...optionsForCount(5).imageKeys,
          'genjutsu/u/g/reference-06.jpg',
        ],
        contentTypes: [...optionsForCount(5).contentTypes, 'image/jpeg'],
        contentLengths: [...optionsForCount(5).contentLengths, 1],
        prompt: buildTinyDeskAiPrompt(5),
      }),
    TinyDeskAiPreflightError
  );
});
