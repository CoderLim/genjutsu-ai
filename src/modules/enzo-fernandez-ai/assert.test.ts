import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertEnzoFernandezAiInputs,
  EnzoFernandezAiPreflightError,
} from './assert';
import {
  ENZO_FERNANDEZ_AI_ASPECT_RATIO,
  ENZO_FERNANDEZ_AI_DEFAULT_PROMPT,
  ENZO_FERNANDEZ_AI_MODE,
  ENZO_FERNANDEZ_AI_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: ENZO_FERNANDEZ_AI_PRODUCT_ID,
  mode: ENZO_FERNANDEZ_AI_MODE,
  prompt: ENZO_FERNANDEZ_AI_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: ENZO_FERNANDEZ_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: ['genjutsu/u/g/reference-01.jpg'],
  contentTypes: ['image/jpeg'],
  contentLengths: [1000],
};

test('accepts the fixed Enzo template binding', () => {
  assert.doesNotThrow(() => assertEnzoFernandezAiInputs(validOptions));
});

test('rejects paid preview', () => {
  assert.throws(
    () =>
      assertEnzoFernandezAiInputs({
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
      assertEnzoFernandezAiInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    EnzoFernandezAiPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertEnzoFernandezAiInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    EnzoFernandezAiPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () => assertEnzoFernandezAiInputs({ ...validOptions, aspectRatio: '16:9' }),
    EnzoFernandezAiPreflightError
  );
  assert.throws(
    () => assertEnzoFernandezAiInputs({ ...validOptions, resolution: '1080p' }),
    EnzoFernandezAiPreflightError
  );
  assert.throws(
    () =>
      assertEnzoFernandezAiInputs({
        ...validOptions,
        imageKeys: ['a.jpg', 'b.jpg'],
        contentTypes: ['image/jpeg', 'image/jpeg'],
        contentLengths: [1000, 1200],
      }),
    EnzoFernandezAiPreflightError
  );
});
