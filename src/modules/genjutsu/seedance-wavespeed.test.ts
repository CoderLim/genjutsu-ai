import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWavespeedSeedancePayload,
  estimateWavespeedSeedanceProviderCost,
  normalizeWavespeedSeedanceTask,
  resolveWavespeedSeedanceModel,
} from './seedance-wavespeed';

test('WaveSpeed motion transfer uses motion-control with spaced asset tags', () => {
  const { model, body } = buildWavespeedSeedancePayload({
    mode: 'motion-transfer',
    resolution: '720p',
    prompt: '',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/reference.png'],
    sourceDurationSeconds: 8,
  });

  assert.equal(model, 'bytedance/seedance-2.5/motion-control');
  assert.equal(body.video, 'https://example.com/source.mp4');
  assert.deepEqual(body.reference_images, [
    'https://example.com/reference.png',
  ]);
  assert.equal(body.resolution, '720p');
  assert.match(String(body.prompt), /@Video 1/);
  assert.match(String(body.prompt), /@Image 1/);
  assert.doesNotMatch(String(body.prompt), /@Image1\b/);
});

test('WaveSpeed objects swap uses video-edit endpoint', () => {
  const { model, body } = buildWavespeedSeedancePayload({
    mode: 'objects-swap',
    resolution: '720p',
    prompt: 'Replace the bottle with Reference 1',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/reference.png'],
    sourceDurationSeconds: 8,
  });

  assert.equal(model, 'bytedance/seedance-2.5/video-edit');
  assert.equal(body.video, 'https://example.com/source.mp4');
  assert.deepEqual(body.reference_images, [
    'https://example.com/reference.png',
  ]);
  assert.match(String(body.prompt), /Edit @Video 1/);
  assert.match(String(body.prompt), /Replace the bottle/);
});

test('WaveSpeed dual-role object swap keeps mappings without repeating replacement rules', () => {
  const { model, body } = buildWavespeedSeedancePayload({
    mode: 'objects-swap',
    resolution: '480p',
    prompt:
      'Replace the lead rider with @Image 1. Replace the pursuing rider with @Image 2.',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/ref1.png', 'https://example.com/ref2.png'],
    sourceDurationSeconds: 4,
  });

  const prompt = String(body.prompt);
  assert.equal(model, 'bytedance/seedance-2.5/video-edit');
  assert.equal(body.video, 'https://example.com/source.mp4');
  assert.equal(body.resolution, '480p');
  assert.deepEqual(body.reference_images, [
    'https://example.com/ref1.png',
    'https://example.com/ref2.png',
  ]);
  assert.match(prompt, /@Video 1/);
  assert.match(prompt, /@Image 1/);
  assert.match(prompt, /@Image 2/);
  assert.doesNotMatch(prompt, /@Image1\b/);
  assert.match(prompt, /complete reference appearance/);
  assert.equal(prompt.split('complete reference appearance').length - 1, 1);
  assert.match(prompt, /REFERENCE IDENTITY:/);
  assert.doesNotMatch(prompt, /Apply every @Image N/);
  assert.match(
    prompt,
    /Replace the lead rider with @Image 1\. Replace the pursuing rider with @Image 2\./
  );
});

test('WaveSpeed three-person object swap keeps spaced Image tokens and all mappings', () => {
  const { body } = buildWavespeedSeedancePayload({
    mode: 'objects-swap',
    resolution: '480p',
    prompt: [
      'Replace Character 1 with Reference 1.',
      'Replace Character 2 with Reference 2.',
      'Replace Character 3 with Reference 3.',
    ].join('\n'),
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: [
      'https://example.com/a.png',
      'https://example.com/b.png',
      'https://example.com/c.png',
    ],
    sourceDurationSeconds: 4,
  });

  const prompt = String(body.prompt);
  assert.match(prompt, /@Video 1/);
  assert.match(prompt, /Reference 1 = @Image 1/);
  assert.match(prompt, /Reference 2 = @Image 2/);
  assert.match(prompt, /Reference 3 = @Image 3/);
  assert.match(prompt, /Replace Character 3 with Reference 3/);
  assert.doesNotMatch(prompt, /@Image1\b/);
  assert.doesNotMatch(prompt, /@Image2\b/);
  assert.doesNotMatch(prompt, /@Image3\b/);
  assert.match(prompt, /Never blend unrelated identities/);
});

test('WaveSpeed motion quote bills reference duration only', () => {
  const quote = estimateWavespeedSeedanceProviderCost({
    mode: 'motion-transfer',
    resolution: '720p',
    sourceDurationSeconds: 8.1,
  });

  assert.equal(quote.payload.billedSourceSeconds, 9);
  assert.equal(quote.payload.billedSeconds, 9);
  assert.equal(quote.payload.rateUsdPerSecond, 0.44);
  assert.equal(quote.providerCostUsd, 9 * 0.44);
  assert.equal(quote.customerPriceBasisUsd, 16.2 * 0.34056);
  assert.equal(quote.source, 'wavespeed_seedance_estimate');
  assert.equal(quote.payload.endpoint, 'motion-control');
});

test('WaveSpeed edit quote bills input plus output duration', () => {
  const quote = estimateWavespeedSeedanceProviderCost({
    mode: 'objects-swap',
    resolution: '720p',
    sourceDurationSeconds: 8,
  });

  assert.equal(quote.payload.billedSourceSeconds, 8);
  assert.equal(quote.payload.estimatedOutputDurationSeconds, 8);
  assert.equal(quote.payload.billedSeconds, 16);
  assert.equal(quote.payload.rateUsdPerSecond, 0.22);
  assert.equal(quote.providerCostUsd, 16 * 0.22);
  assert.equal(quote.customerPriceBasisUsd, 16 * 0.34056);
  assert.equal(quote.payload.endpoint, 'video-edit');
});

test('WaveSpeed completed task exposes output video URL', () => {
  const task = normalizeWavespeedSeedanceTask({
    code: 200,
    data: {
      id: 'pred_abc',
      status: 'completed',
      outputs: ['https://example.com/result.mp4'],
      price: 2.2,
    },
  });

  assert.equal(task.status, 'completed');
  assert.equal(task.providerStatus, 'completed');
  assert.equal(task.videoUrl, 'https://example.com/result.mp4');
  assert.equal(task.providerUsage?.actualProviderCostUsd, 2.2);
});

test('WaveSpeed terminal failures normalize to failed', () => {
  const task = normalizeWavespeedSeedanceTask({
    data: {
      id: 'pred_abc',
      status: 'failed',
      error: 'blocked by content safety',
    },
  });

  assert.equal(task.status, 'failed');
  assert.equal(task.providerStatus, 'failed');
  assert.match(task.error || '', /content safety/i);
});

test('WaveSpeed envelope success ACK does not mask nested prediction failure', () => {
  const task = normalizeWavespeedSeedanceTask({
    code: 200,
    message: 'success',
    data: {
      id: '647d12ed0ec74702aefa366307e0f4cf',
      status: 'failed',
      outputs: [],
      code: 1405,
      error: 'The provider could not complete the request. Please try again.',
    },
  });

  assert.equal(task.status, 'failed');
  assert.equal(task.providerStatus, 'failed');
  assert.equal(task.videoUrl, null);
  assert.match(task.error || '', /could not complete the request/i);
  assert.doesNotMatch(task.error || '', /^success$/i);
  assert.equal(task.errorCode, '1405');
});

test('WaveSpeed model resolver picks mode endpoints', () => {
  assert.equal(
    resolveWavespeedSeedanceModel('motion-transfer'),
    'bytedance/seedance-2.5/motion-control'
  );
  assert.equal(
    resolveWavespeedSeedanceModel('objects-swap'),
    'bytedance/seedance-2.5/video-edit'
  );
  assert.equal(
    resolveWavespeedSeedanceModel(
      'motion-transfer',
      'bytedance/seedance-2.5/video-edit'
    ),
    'bytedance/seedance-2.5/video-edit'
  );
});
