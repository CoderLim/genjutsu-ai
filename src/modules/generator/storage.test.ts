import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertGenerationId,
  assertResultOwnership,
  assertStagingOwnership,
  assertUploadSize,
  createGeneratorStagingKey,
  getGeneratorResultKey,
  normalizeUploadType,
  safeGeneratorProviderUrl,
} from './storage';

test('staging paths bind user, generation and semantic slot', () => {
  const generationId = crypto.randomUUID();
  const key = createGeneratorStagingKey({
    userId: 'user-a', generationId, slot: 'startFrame',
    contentType: 'image/png',
  });
  assert.ok(key.startsWith('generator/staging/user-a/' + generationId + '/startFrame/'));
  assert.doesNotThrow(() => assertStagingOwnership(key, 'user-a', generationId, 'startFrame'));
  assert.throws(
    () => assertStagingOwnership(key, 'user-b', generationId, 'startFrame'),
    /does not belong/
  );
  assert.throws(
    () => assertStagingOwnership(key, 'user-a', generationId, 'endFrame'),
    /does not belong/
  );
  assert.throws(
    () => assertStagingOwnership(key, 'user-a', crypto.randomUUID(), 'startFrame'),
    /does not belong/
  );
});

test('prevent path traversal, fake UUIDs, oversized and forbidden uploads', () => {
  assert.throws(() => assertGenerationId('../other'), /Invalid generation ID/);
  assert.throws(() => normalizeUploadType('application/x-msdownload'), /Unsupported media type/);
  assert.equal(normalizeUploadType('image/png; charset=binary'), 'image/png');
  assert.throws(
    () => assertUploadSize('image/png', 20 * 1024 * 1024), /between 1 and/
  );
  assert.throws(() => assertUploadSize('image/png', 0), /between 1 and/);
});

test('result keys isolate user and generation in My Creations', () => {
  const generationId = crypto.randomUUID();
  const key = getGeneratorResultKey('owner', generationId, 0, 'video/mp4');
  assert.doesNotThrow(() => assertResultOwnership(key, 'owner', generationId));
  assert.throws(() => assertResultOwnership(key, 'other', generationId), /Invalid result/);
  assert.throws(() => assertResultOwnership(key, 'owner', crypto.randomUUID()), /Invalid result/);
});

test('only provider storage hosts may supply outputs to R2', () => {
  assert.equal(
    safeGeneratorProviderUrl('https://cdn.wavespeed.ai/outputs/clip.mp4'),
    'https://cdn.wavespeed.ai/outputs/clip.mp4'
  );
  assert.equal(
    safeGeneratorProviderUrl('https://v3b.fal.media/files/output.png'),
    'https://v3b.fal.media/files/output.png'
  );
  assert.throws(
    () => safeGeneratorProviderUrl('https://cdn.wavespeed.ai.evil.example/video.mp4'),
    /Untrusted/
  );
  assert.throws(
    () => safeGeneratorProviderUrl('http://cdn.wavespeed.ai/video.mp4'),
    /Untrusted/
  );
  assert.throws(
    () => safeGeneratorProviderUrl('https://169.254.169.254/metadata'),
    /Untrusted/
  );
});
