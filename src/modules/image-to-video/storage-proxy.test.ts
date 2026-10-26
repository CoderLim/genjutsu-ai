import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createImageToVideoProxyUploadDescriptor } from './storage';

test('proxy upload descriptor is same-origin under /api/image-to-video/upload', () => {
  const request = new Request(
    'https://example.com/api/image-to-video/upload-url',
    {
      method: 'POST',
    }
  );
  const descriptor = createImageToVideoProxyUploadDescriptor(request, {
    userId: 'user_1',
    generationId: 'gen12345678',
    contentType: 'image/jpeg',
    contentLength: 1024,
  });

  assert.equal(
    descriptor.uploadUrl,
    'https://example.com/api/image-to-video/upload/gen12345678'
  );
  assert.equal(descriptor.uploadMode, 'proxy');
  assert.equal(descriptor.uploadHeaders['Content-Type'], 'image/jpeg');
  assert.match(descriptor.storageKey, /^image-to-video\/inputs\//);
  assert.match(descriptor.storageKey, /\/image\.jpg$/);
});
