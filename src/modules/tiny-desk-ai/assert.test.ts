import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSeedanceWorkflowPrompt } from '@/modules/genjutsu/workflow';

import {
  assertTinyDeskAiInputs,
  isAllowedTinyDeskAiPrompt,
  TinyDeskAiPreflightError,
} from './assert';
import {
  buildTinyDeskAiPrompt,
  LEGACY_TINY_DESK_AI_PROMPTS,
  TINY_DESK_AI_ASPECT_RATIO,
  TINY_DESK_AI_MODE,
  TINY_DESK_AI_PRODUCT_ID,
  TINY_DESK_AI_PROMPTS_BY_COUNT,
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

const PERSON_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

test('accepts 1–5 contiguous cast sizes with matching prompts', () => {
  for (const count of [1, 2, 3, 4, 5] as const) {
    assert.doesNotThrow(() => assertTinyDeskAiInputs(optionsForCount(count)));
  }
});

test('maps @Image1–@Image5 to Person A–E in order for each cast size', () => {
  for (const count of [1, 2, 3, 4, 5] as const) {
    const prompt = buildTinyDeskAiPrompt(count);
    for (let i = 0; i < count; i += 1) {
      const letter = PERSON_LETTERS[i]!;
      const image = `@Image${i + 1}`;
      assert.match(
        prompt,
        new RegExp(`Replace Person ${letter} with ${image}\\.`)
      );
      assert.match(
        prompt,
        new RegExp(
          `Use ${image} as the exclusive identity and appearance reference for Person ${letter}\\.`
        )
      );
    }
    // Unassigned images must not appear.
    for (let i = count; i < 5; i += 1) {
      assert.doesNotMatch(prompt, new RegExp(`@Image${i + 1}\\b`));
      assert.doesNotMatch(
        prompt,
        new RegExp(`Replace Person ${PERSON_LETTERS[i]} with`)
      );
    }
  }
});

test('protects unassigned performers without conflicting replace rules', () => {
  const solo = buildTinyDeskAiPrompt(1);
  assert.match(solo, /Do NOT replace anyone else:/);
  assert.match(solo, /Person B \(backing left\)/);
  assert.match(solo, /Person E \(saxophone\)/);
  assert.match(
    solo,
    /Keep all performers without assigned reference images unchanged\./
  );
  // Person A is replaced — must not also appear under the keep list.
  const keepSection = solo.slice(solo.indexOf('Do NOT replace anyone else:'));
  assert.doesNotMatch(keepSection, /Person A \(lead singer\)/);
  assert.doesNotMatch(keepSection, /Replace Person A with/);

  const full = buildTinyDeskAiPrompt(5);
  assert.doesNotMatch(full, /Do NOT replace anyone else:/);
  assert.doesNotMatch(
    full,
    /Keep all performers without assigned reference images unchanged\./
  );
  for (const letter of PERSON_LETTERS) {
    assert.match(full, new RegExp(`Replace Person ${letter} with @Image`));
  }
});

test('new prompts pass server allowlist and cast-size check', () => {
  for (const count of [1, 2, 3, 4, 5] as const) {
    const prompt = TINY_DESK_AI_PROMPTS_BY_COUNT[count];
    assert.equal(isAllowedTinyDeskAiPrompt(prompt), true);
    assert.doesNotThrow(() => assertTinyDeskAiInputs(optionsForCount(count)));
  }
});

test('existing silver-hair legacy solo prompt still validates for 1 image', () => {
  const legacy = LEGACY_TINY_DESK_AI_PROMPTS[0]!;
  assert.equal(isAllowedTinyDeskAiPrompt(legacy), true);
  assert.doesNotThrow(() =>
    assertTinyDeskAiInputs({
      ...optionsForCount(1),
      prompt: legacy,
    })
  );
});

test('rejects wrong image count and mismatched prompts', () => {
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

test('rejects motion-transfer mode, wrong aspect, and wrong resolution', () => {
  assert.throws(
    () =>
      assertTinyDeskAiInputs({
        ...optionsForCount(1),
        mode: 'motion-transfer',
      }),
    TinyDeskAiPreflightError
  );
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
});

test('five-person task instruction nests cleanly under Seedance workflow prompt', () => {
  const task = buildTinyDeskAiPrompt(5);
  const full = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: task,
    imageCount: 5,
  });
  assert.match(full, /TASK INSTRUCTION:/);
  assert.match(full, /OBJECT SWAP:/);
  assert.match(full, /REFERENCE IDENTITY:/);
  assert.match(full, /Reference 1 = @Image1/);
  assert.match(full, /Reference 5 = @Image5/);
  assert.match(full, /Replace Person A with @Image1\./);
  assert.match(full, /Replace Person E with @Image5\./);
  assert.match(
    full,
    /Person A \(center keyboard lead\) and Person D \(silver-haired close-up vocalist\)/
  );
});
