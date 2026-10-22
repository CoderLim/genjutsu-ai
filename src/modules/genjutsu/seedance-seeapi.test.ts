import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSeeapiSeedancePayload,
  estimateSeeapiSeedanceProviderCost,
  normalizeSeeapiSeedanceTask,
} from './seedance-seeapi';

test('SeeAPI motion transfer uses adaptive duration from source length', () => {
  const payload = buildSeeapiSeedancePayload({
    model: 'seedance-2-5',
    mode: 'motion-transfer',
    resolution: '720p',
    prompt: '',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/reference.png'],
    sourceDurationSeconds: 8,
    callbackUrl: 'https://genjutsuai.net/api/genjutsu/webhook',
  });

  assert.equal(payload.model, 'seedance-2-5');
  assert.equal(payload.endpoint, 'reference-to-video');
  assert.equal(payload.provider, 'seeapi');
  assert.equal(payload.input.duration_seconds, 8);
  assert.equal(payload.input.aspect_ratio, 'adaptive');
  assert.equal(payload.input.resolution, '720p');
  assert.deepEqual(payload.input.reference_video, [
    'https://example.com/source.mp4',
  ]);
  assert.deepEqual(payload.input.reference_images, [
    'https://example.com/reference.png',
  ]);
  assert.match(payload.input.prompt, /@Video1/);
  assert.match(payload.input.prompt, /@Image1/);
  assert.equal(
    payload.callback_url,
    'https://genjutsuai.net/api/genjutsu/webhook'
  );
});

test('SeeAPI objects swap uses adaptive/-1 on the shared upstream', () => {
  const payload = buildSeeapiSeedancePayload({
    model: 'seedance-2-5',
    mode: 'objects-swap',
    resolution: '720p',
    prompt: 'Replace the bottle with Reference 1',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/reference.png'],
    sourceDurationSeconds: 8,
    callbackUrl: null,
  });

  assert.equal(payload.provider, 'seeapi');
  assert.equal(payload.input.duration_seconds, -1);
  assert.equal(payload.input.aspect_ratio, 'adaptive');
  assert.equal(payload.input.omni_reference_task_type, undefined);
  assert.equal(payload.input.nsfw_checker, true);
  assert.match(String(payload.input.prompt), /编辑视频/);
  assert.match(String(payload.input.prompt), /Edit @Video1/);
  assert.match(String(payload.input.prompt), /Replace the bottle/);
  assert.equal(payload.callback_url, undefined);
});

test('SeeAPI objects swap can force BytePlus edit task type via upstream override', () => {
  const payload = buildSeeapiSeedancePayload({
    model: 'seedance-2-5',
    mode: 'objects-swap',
    resolution: '720p',
    prompt: 'Replace the bottle with Reference 1',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/reference.png'],
    sourceDurationSeconds: 8,
    callbackUrl: null,
    upstreamProvider: 'byteplus',
  });

  assert.equal(payload.provider, 'byteplus');
  assert.equal(payload.input.duration_seconds, -1);
  assert.equal(payload.input.omni_reference_task_type, 'edit');
  assert.equal(payload.input.nsfw_checker, undefined);
});

test('SeeAPI multi-image objects swap uses role-aware multi-reference editing', () => {
  const payload = buildSeeapiSeedancePayload({
    model: 'seedance-2-5',
    mode: 'objects-swap',
    resolution: '480p',
    prompt: 'Change foreground to @Image1 and chaser to @Image2',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/ref1.png', 'https://example.com/ref2.png'],
    sourceDurationSeconds: 4,
    callbackUrl: null,
  });

  assert.equal(payload.provider, 'seeapi');
  assert.equal(payload.input.duration_seconds, -1);
  assert.deepEqual(payload.input.reference_images, [
    'https://example.com/ref1.png',
    'https://example.com/ref2.png',
  ]);
  const prompt = String(payload.input.prompt);
  assert.match(prompt, /@Image1/);
  assert.match(prompt, /@Image2/);
  assert.match(prompt, /MULTI-REFERENCE EDITING:/);
  assert.match(
    prompt,
    /Apply each explicitly specified reference-to-target mapping according to its assigned role/
  );
  assert.match(
    prompt,
    /Do not treat every reference as a separate person or character/
  );
  assert.doesNotMatch(prompt, /every @ImageN/);
  assert.doesNotMatch(prompt, /face, hair, body, clothing/);
});

test('SeeAPI multi-image mixed roles do not force every reference into a full person swap', () => {
  const payload = buildSeeapiSeedancePayload({
    model: 'seedance-2-5',
    mode: 'objects-swap',
    resolution: '480p',
    prompt: [
      'Reference 1 replaces the main character.',
      "Reference 2 replaces the character's clothing.",
      'Reference 3 replaces the background.',
    ].join('\n'),
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: [
      'https://example.com/person.png',
      'https://example.com/clothes.png',
      'https://example.com/bg.png',
    ],
    sourceDurationSeconds: 4,
    callbackUrl: null,
  });

  const prompt = String(payload.input.prompt);
  assert.match(prompt, /MULTI-REFERENCE EDITING:/);
  assert.match(
    prompt,
    /For clothing, props, objects, backgrounds, or partial edits, modify only the requested elements/
  );
  assert.match(
    prompt,
    /Do not treat every reference as a separate person or character/
  );
  assert.match(prompt, /Reference 1 replaces the main character/);
  assert.match(prompt, /Reference 2 replaces the character's clothing/);
  assert.match(prompt, /Reference 3 replaces the background/);
  assert.doesNotMatch(
    prompt,
    /Replace each mapped person or object with the matching reference identity \(face, hair, body, clothing\)/
  );
});

test('SeeAPI quote tracks gateway credits while preserving Seedance customer price', () => {
  const quote = estimateSeeapiSeedanceProviderCost({
    mode: 'objects-swap',
    resolution: '720p',
    sourceDurationSeconds: 8,
    usdPerCredit: 0.0037,
  });

  assert.equal(quote.payload.estimatedOutputDurationSeconds, 8);
  assert.equal(quote.payload.billedSeconds, 16);
  assert.equal(quote.payload.creditsPerSecond, 45);
  assert.equal(quote.payload.estimatedCredits, 16 * 45);
  assert.equal(quote.providerCostUsd, 16 * 45 * 0.0037);
  assert.equal(quote.customerPriceBasisUsd, 16 * 0.34056);
  assert.equal(quote.source, 'seeapi_seedance_estimate');
});

test('SeeAPI succeeded task exposes video asset URL and credit usage', () => {
  const task = normalizeSeeapiSeedanceTask({
    generation: {
      id: 'task_abc',
      status: 'succeeded',
      consumed_credits: 720,
      result: {
        assets: [
          {
            asset_id: 'asset_1',
            type: 'video',
            url: 'https://example.com/result.mp4',
            mime_type: 'video/mp4',
          },
        ],
      },
    },
  });

  assert.equal(task.status, 'completed');
  assert.equal(task.providerStatus, 'succeeded');
  assert.equal(task.videoUrl, 'https://example.com/result.mp4');
  assert.equal(task.providerUsage?.consumedCredits, 720);
});

test('SeeAPI terminal failures normalize to failed', () => {
  const task = normalizeSeeapiSeedanceTask({
    generation: {
      id: 'task_abc',
      status: 'failed',
      error: {
        code: 'CONTENT_POLICY',
        message: 'blocked by content safety',
      },
    },
  });

  assert.equal(task.status, 'failed');
  assert.equal(task.providerStatus, 'failed');
  assert.match(task.error || '', /content safety/i);
  assert.equal(task.errorCode, 'CONTENT_POLICY');
});
