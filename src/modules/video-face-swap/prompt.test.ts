import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildVideoFaceSwapEffectivePrompt,
  normalizeVideoFaceSwapUserInstructions,
  VIDEO_FACE_SWAP_DEFAULT_PROMPT,
  VideoFaceSwapPromptError,
} from './prompt';

test('default prompt when no user instructions', () => {
  assert.equal(
    buildVideoFaceSwapEffectivePrompt(null),
    VIDEO_FACE_SWAP_DEFAULT_PROMPT
  );
});

test('merges short user instructions', () => {
  const effective = buildVideoFaceSwapEffectivePrompt('Keep a soft smile.');
  assert.match(effective, /Keep a soft smile/);
  assert.match(effective, /reference portrait/);
});

test('blocks clothing / scene instruction attempts', () => {
  assert.throws(
    () => normalizeVideoFaceSwapUserInstructions('Please change the clothes'),
    (err: unknown) => err instanceof VideoFaceSwapPromptError
  );
  assert.throws(
    () =>
      normalizeVideoFaceSwapUserInstructions('Swap the background to a beach'),
    (err: unknown) => err instanceof VideoFaceSwapPromptError
  );
});

test('rejects oversized instructions', () => {
  assert.throws(
    () => normalizeVideoFaceSwapUserInstructions('x'.repeat(501)),
    (err: unknown) => err instanceof VideoFaceSwapPromptError
  );
});
