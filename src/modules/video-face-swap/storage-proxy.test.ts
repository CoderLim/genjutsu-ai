import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createVideoFaceSwapProxyUploadDescriptor } from './storage';

test('proxy upload descriptors are same-origin under /api/video-face-swap/upload', () => {
  const request = new Request(
    'https://example.com/api/video-face-swap/upload-url',
    { method: 'POST' }
  );

  const video = createVideoFaceSwapProxyUploadDescriptor(request, {
    userId: 'user_1',
    generationId: 'gen12345678',
    role: 'video',
    contentType: 'video/mp4',
    contentLength: 1024,
  });
  const image = createVideoFaceSwapProxyUploadDescriptor(request, {
    userId: 'user_1',
    generationId: 'gen12345678',
    role: 'image',
    contentType: 'image/jpeg',
    contentLength: 2048,
  });

  assert.match(
    video.uploadUrl,
    /^https:\/\/example\.com\/api\/video-face-swap\/upload\/gen12345678\?role=video$/
  );
  assert.match(video.storageKey, /^video-face-swap\/inputs\//);
  assert.match(video.storageKey, /\/video\.mp4$/);
  assert.equal(video.role, 'video');

  assert.match(image.uploadUrl, /\?role=image$/);
  assert.match(image.storageKey, /\/head\.jpg$/);
  assert.equal(image.role, 'image');
});
