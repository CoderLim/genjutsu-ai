import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSeedancePayload,
  estimateSeedanceProviderCost,
  falQueueAppPath,
  isSeedanceLikenessRejection,
  normalizeSeedanceUserError,
  SEEDANCE_LIKENESS_REJECTION_MESSAGE,
} from './seedance';

test('Seedance queue status uses the Fal app path, not the submit suffix', () => {
  assert.equal(
    falQueueAppPath('bytedance/seedance-2.5/us/reference-to-video'),
    'bytedance/seedance-2.5'
  );
  assert.equal(falQueueAppPath('fal-ai/flux/dev'), 'fal-ai/flux/dev');
});

test('Seedance likeness rejection tells users images and videos cannot include real people', () => {
  assert.equal(
    normalizeSeedanceUserError(
      {
        detail:
          'The images or videos provided may contain likenesses of real people or other private information that cannot be processed.',
      },
      'fallback'
    ),
    SEEDANCE_LIKENESS_REJECTION_MESSAGE
  );
  assert.equal(
    isSeedanceLikenessRejection(SEEDANCE_LIKENESS_REJECTION_MESSAGE),
    true
  );
});

test('Seedance estimate bills source plus a four-second minimum output', () => {
  const quote = estimateSeedanceProviderCost({
    resolution: '480p',
    sourceDurationSeconds: 2,
  });

  assert.equal(quote.payload.sourceDurationSeconds, 2);
  assert.equal(quote.payload.estimatedOutputDurationSeconds, 4);
  assert.equal(quote.payload.billedSeconds, 6);
  assert.equal(quote.providerCostUsd, 6 * 0.15876);
});

test('short motion transfer uses auto duration with reference task', () => {
  const payload = buildSeedancePayload({
    mode: 'motion-transfer',
    resolution: '720p',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/reference.png'],
    sourceDurationSeconds: 2,
    endUserId: 'user-1',
  });

  assert.equal(payload.task, 'reference');
  assert.equal(payload.duration, 'auto');
  assert.equal(payload.aspect_ratio, 'auto');
});

test('object swap uses editing with explicit auto duration and aspect ratio', () => {
  const payload = buildSeedancePayload({
    mode: 'objects-swap',
    resolution: '720p',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/reference.png'],
    sourceDurationSeconds: 8,
    endUserId: 'user-1',
    prompt: 'Replace the red bottle',
  });

  assert.equal(payload.task, 'editing');
  assert.equal(payload.duration, 'auto');
  assert.equal(payload.aspect_ratio, 'auto');
  assert.match(payload.prompt, /Replace the red bottle/);
});
