import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertImageToVideoTaskMatches,
  ImageToVideoGenerationConflictError,
  readCompletingClaimedAt,
} from './billing';
import { IMAGE_TO_VIDEO_COMPLETING_CLAIM_TTL_MS } from './constants';

const base = {
  prompt: 'locked prompt',
  duration: 5,
  resolution: '720p' as const,
  aspectRatio: '16:9' as const,
  generateAudio: true,
  sealedImageKey: 'image-to-video/sealed-inputs/u/g/abc.jpg',
  stagingImageKey: 'image-to-video/inputs/u/g/image.jpg',
  presetId: 'day-of-the-dead' as const,
  presetVersion: 1,
  variant: 'person' as const,
};

test('assertImageToVideoTaskMatches accepts identical binding', () => {
  const task = {
    prompt: base.prompt,
    options: JSON.stringify(base),
  };
  assert.doesNotThrow(() => assertImageToVideoTaskMatches(task, base));
});

test('assertImageToVideoTaskMatches rejects duration or staging changes', () => {
  const task = {
    prompt: base.prompt,
    options: JSON.stringify(base),
  };
  assert.throws(
    () =>
      assertImageToVideoTaskMatches(task, {
        ...base,
        duration: 8,
      }),
    (err: unknown) => err instanceof ImageToVideoGenerationConflictError
  );
  assert.throws(
    () =>
      assertImageToVideoTaskMatches(task, {
        ...base,
        stagingImageKey: 'image-to-video/inputs/u/g/other.jpg',
      }),
    (err: unknown) => err instanceof ImageToVideoGenerationConflictError
  );
});

test('completing claim TTL is positive; readCompletingClaimedAt parses', () => {
  assert.ok(IMAGE_TO_VIDEO_COMPLETING_CLAIM_TTL_MS >= 60_000);
  const iso = '2026-10-26T04:00:00.000Z';
  assert.equal(
    readCompletingClaimedAt(
      JSON.stringify({ completionClaim: 'x', completingClaimedAt: iso })
    ),
    iso
  );
  assert.equal(readCompletingClaimedAt(null), null);
});
