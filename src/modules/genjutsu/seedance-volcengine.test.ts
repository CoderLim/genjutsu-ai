import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVolcengineSeedancePayload,
  estimateVolcengineSeedanceProviderCost,
  normalizeVolcengineSeedanceTask,
} from './seedance-volcengine';

test('Volcengine motion transfer maps to Seedance 2.5 reference task', () => {
  const payload = buildVolcengineSeedancePayload({
    model: 'doubao-seedance-2-5-260628',
    mode: 'motion-transfer',
    resolution: '720p',
    prompt: '',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/reference.png'],
    sourceDurationSeconds: 8,
    safetyIdentifier: 'user-hash',
    callbackUrl: 'https://genjutsuai.net/api/genjutsu/webhook',
  });

  assert.equal(payload.omni_reference_task_type, 'reference');
  assert.equal(payload.duration, 8);
  assert.equal(payload.ratio, 'adaptive');
  assert.equal(payload.resolution, '720p');
  assert.equal(payload.content[1].role, 'reference_video');
  assert.equal(payload.content[2].role, 'reference_image');
  assert.match(String(payload.content[0].text), /@视频1/);
  assert.match(String(payload.content[0].text), /@图像1/);
});

test('Volcengine objects swap maps to edit with locked adaptive/-1 fields', () => {
  const payload = buildVolcengineSeedancePayload({
    model: 'doubao-seedance-2-5-260628',
    mode: 'objects-swap',
    resolution: '720p',
    prompt: 'Replace the bottle with Reference 1',
    videoUrl: 'https://example.com/source.mp4',
    imageUrls: ['https://example.com/reference.png'],
    sourceDurationSeconds: 8,
    safetyIdentifier: 'user-hash',
    callbackUrl: null,
  });

  assert.equal(payload.omni_reference_task_type, 'edit');
  assert.equal(payload.duration, -1);
  assert.equal(payload.ratio, 'adaptive');
  assert.match(String(payload.content[0].text), /编辑视频/);
  assert.match(String(payload.content[0].text), /Replace the bottle/);
});

test('Volcengine quote records Ark cost while preserving the existing Seedance customer price basis', () => {
  const quote = estimateVolcengineSeedanceProviderCost({
    mode: 'objects-swap',
    resolution: '720p',
    sourceDurationSeconds: 8,
    cnyPerUsd: 7,
    rateCnyPerMillionTokens: 42,
  });

  assert.equal(quote.payload.estimatedOutputDurationSeconds, 8);
  assert.equal(quote.payload.estimatedTokens, 16 * 21_600);
  assert.equal(
    quote.payload.estimatedProviderCostCny,
    (16 * 21_600 * 42) / 1_000_000
  );
  assert.equal(quote.customerPriceBasisUsd, 16 * 0.34056);
  assert.equal(
    quote.providerCostUsd,
    quote.payload.estimatedProviderCostCny / 7
  );
});

test('Volcengine succeeded task exposes durable-copy URL and actual token usage', () => {
  const task = normalizeVolcengineSeedanceTask(
    {
      id: 'cgt-123456',
      status: 'succeeded',
      content: {
        video_url: 'https://example.com/result.mp4',
      },
      usage: {
        completion_tokens: 345600,
        total_tokens: 345600,
      },
    },
    { rateCnyPerMillionTokens: 42 }
  );

  assert.equal(task.status, 'completed');
  assert.equal(task.providerStatus, 'succeeded');
  assert.equal(task.videoUrl, 'https://example.com/result.mp4');
  assert.deepEqual(task.providerUsage, {
    completionTokens: 345600,
    totalTokens: 345600,
    rateCnyPerMillionTokens: 42,
    actualProviderCostCny: (345600 * 42) / 1_000_000,
  });
});

test('Volcengine terminal failures normalize to failed', () => {
  const task = normalizeVolcengineSeedanceTask(
    {
      id: 'cgt-123456',
      status: 'failed',
      error: {
        code: 'InvalidParameter.TaskTypeConstraint',
        message: 'duration must be -1 for edit',
      },
    },
    { rateCnyPerMillionTokens: 42 }
  );

  assert.equal(task.status, 'failed');
  assert.equal(task.providerStatus, 'failed');
  assert.match(task.error || '', /duration must be -1/);
});
