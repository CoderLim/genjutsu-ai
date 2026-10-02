import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSeedancePayload,
  estimateSeedanceProviderCost,
} from './seedance';

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

test('object swap always uses editing with auto duration', () => {
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
  assert.match(payload.prompt, /Replace the red bottle/);
});
