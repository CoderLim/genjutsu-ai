import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertGenjutsuInputKeysOwned,
  assertGenjutsuObjectMetadata,
  assertGenjutsuResultKeyOwned,
  assertGenjutsuSealedInputKeysOwned,
  assertGenjutsuSourceVideoKeyOwned,
  assertGenjutsuStagingKeyOwned,
  assertGenjutsuUploadSize,
  buildGenjutsuR2ObjectKey,
  createGenjutsuProxyUploadDescriptor,
  GENJUTSU_MAX_IMAGE_BYTES,
  GENJUTSU_MAX_VIDEO_BYTES,
  GENJUTSU_PROXY_UPLOAD_MAX_BYTES,
  GenjutsuR2BindingMissingError,
  getGenjutsuInputPrefix,
  getGenjutsuResultKey,
  getGenjutsuSealedInputKey,
  getGenjutsuSealedInputPrefix,
  getR2BucketBinding,
  putGenjutsuStagingObject,
  putGenjutsuStagingObjectViaBinding,
  statusForGenjutsuProxyUploadError,
} from './storage';

test('Genjutsu input keys are scoped to user and generation', () => {
  const prefix = getGenjutsuInputPrefix({
    userId: 'user-123',
    generationId: 'gen-456789',
  });

  assert.equal(prefix, 'genjutsu/inputs/user-123/gen-456789/');

  assert.doesNotThrow(() =>
    assertGenjutsuInputKeysOwned({
      userId: 'user-123',
      generationId: 'gen-456789',
      videoKey: `${prefix}source.mp4`,
      imageKeys: [`${prefix}reference-01.png`, `${prefix}reference-02.webp`],
    })
  );
});

test('Genjutsu sealed input keys are distinct and user scoped', () => {
  const params = {
    userId: 'user-123',
    generationId: 'gen-456789',
  };
  const stagingPrefix = getGenjutsuInputPrefix(params);
  const sealedPrefix = getGenjutsuSealedInputPrefix(params);
  const videoKey = getGenjutsuSealedInputKey({
    ...params,
    stagingKey: `${stagingPrefix}source.mp4`,
  });
  const imageKey = getGenjutsuSealedInputKey({
    ...params,
    stagingKey: `${stagingPrefix}reference-01.png`,
  });

  assert.equal(sealedPrefix, 'genjutsu/sealed-inputs/user-123/gen-456789/');
  assert.equal(videoKey, `${sealedPrefix}source.mp4`);
  assert.equal(imageKey, `${sealedPrefix}reference-01.png`);

  assert.doesNotThrow(() =>
    assertGenjutsuSealedInputKeysOwned({
      ...params,
      videoKey,
      imageKeys: [imageKey],
    })
  );

  assert.throws(
    () =>
      assertGenjutsuSealedInputKeysOwned({
        ...params,
        videoKey: `${stagingPrefix}source.mp4`,
        imageKeys: [imageKey],
      }),
    /sealed Genjutsu source-video storage key/
  );
});

test('Genjutsu source video key accepts staging or sealed paths', () => {
  const params = {
    userId: 'user-123',
    generationId: 'gen-456789',
  };
  const stagingKey = `${getGenjutsuInputPrefix(params)}source.mp4`;
  const sealedKey = `${getGenjutsuSealedInputPrefix(params)}source.webm`;

  assert.doesNotThrow(() =>
    assertGenjutsuSourceVideoKeyOwned({ ...params, videoKey: stagingKey })
  );
  assert.doesNotThrow(() =>
    assertGenjutsuSourceVideoKeyOwned({ ...params, videoKey: sealedKey })
  );
  assert.throws(
    () =>
      assertGenjutsuSourceVideoKeyOwned({
        ...params,
        videoKey: 'genjutsu/results/user-123/gen-456789.mp4',
      }),
    /source-video storage key/
  );
});

test('Genjutsu rejects storage keys from another user or generation', () => {
  assert.throws(
    () =>
      assertGenjutsuInputKeysOwned({
        userId: 'user-a',
        generationId: 'gen-12345678',
        videoKey: 'genjutsu/inputs/user-b/gen-12345678/source.mp4',
        imageKeys: ['genjutsu/inputs/user-a/gen-12345678/reference-01.png'],
      }),
    /source-video storage key/
  );

  assert.throws(
    () =>
      assertGenjutsuInputKeysOwned({
        userId: 'user-a',
        generationId: 'gen-12345678',
        videoKey: 'genjutsu/inputs/user-a/gen-12345678/source.mp4',
        imageKeys: ['genjutsu/inputs/user-a/other-generation/reference-01.png'],
      }),
    /reference-image storage keys/
  );
});

test('Genjutsu rejects traversal, nested paths, invalid suffixes, and duplicate references', () => {
  const prefix = 'genjutsu/inputs/user-a/gen-12345678/';

  for (const videoKey of [
    `${prefix}source.mp4/../../other/source.mp4`,
    `${prefix}source.mp4/extra`,
    `${prefix}source.exe`,
    `${prefix}source.mp4?x=1`,
  ]) {
    assert.throws(
      () =>
        assertGenjutsuInputKeysOwned({
          userId: 'user-a',
          generationId: 'gen-12345678',
          videoKey,
          imageKeys: [`${prefix}reference-01.png`],
        }),
      /storage key|source-video/
    );
  }

  assert.throws(
    () =>
      assertGenjutsuInputKeysOwned({
        userId: 'user-a',
        generationId: 'gen-12345678',
        videoKey: `${prefix}source.mp4`,
        imageKeys: [`${prefix}reference-09.png`],
      }),
    /reference-image storage keys/
  );

  assert.throws(
    () =>
      assertGenjutsuInputKeysOwned({
        userId: 'user-a',
        generationId: 'gen-12345678',
        videoKey: `${prefix}source.mp4`,
        imageKeys: [`${prefix}reference-01.png`, `${prefix}reference-01.png`],
      }),
    /reference-image storage keys/
  );
});

test('Genjutsu staging key ownership is scoped by file index', () => {
  const params = {
    userId: 'user-123',
    generationId: 'gen-456789',
  };
  const prefix = getGenjutsuInputPrefix(params);

  assert.doesNotThrow(() =>
    assertGenjutsuStagingKeyOwned({
      ...params,
      fileIndex: 0,
      key: `${prefix}source.mp4`,
    })
  );
  assert.doesNotThrow(() =>
    assertGenjutsuStagingKeyOwned({
      ...params,
      fileIndex: 1,
      key: `${prefix}reference-01.png`,
    })
  );

  assert.throws(
    () =>
      assertGenjutsuStagingKeyOwned({
        ...params,
        fileIndex: 0,
        key: `${prefix}reference-01.png`,
      }),
    /source-video storage key/
  );
  assert.throws(
    () =>
      assertGenjutsuStagingKeyOwned({
        ...params,
        fileIndex: 1,
        key: `${prefix}reference-02.png`,
      }),
    /reference-image storage key/
  );
});

test('Genjutsu upload sizes enforce the business limits', () => {
  assert.doesNotThrow(() =>
    assertGenjutsuUploadSize(0, GENJUTSU_MAX_VIDEO_BYTES)
  );
  assert.doesNotThrow(() =>
    assertGenjutsuUploadSize(1, GENJUTSU_MAX_IMAGE_BYTES)
  );

  assert.throws(
    () => assertGenjutsuUploadSize(0, GENJUTSU_MAX_VIDEO_BYTES + 1),
    /200 MB/
  );
  assert.throws(
    () => assertGenjutsuUploadSize(1, GENJUTSU_MAX_IMAGE_BYTES + 1),
    /12 MB/
  );
});

test('Genjutsu proxy upload descriptor is same-origin and sized', () => {
  const request = new Request(
    'https://genjutsuai.net/api/genjutsu/upload-url',
    {
      method: 'POST',
    }
  );
  const descriptor = createGenjutsuProxyUploadDescriptor(request, {
    userId: 'user-123',
    generationId: 'gen-456789',
    index: 0,
    contentType: 'video/mp4',
    contentLength: 1024,
  });

  assert.equal(
    descriptor.uploadUrl,
    'https://genjutsuai.net/api/genjutsu/upload/gen-456789/0'
  );
  assert.equal(descriptor.uploadHeaders['Content-Type'], 'video/mp4');
  assert.equal(descriptor.uploadMode, 'proxy');
  assert.match(descriptor.storageKey, /\/source\.mp4$/);

  assert.throws(
    () =>
      createGenjutsuProxyUploadDescriptor(request, {
        userId: 'user-123',
        generationId: 'gen-456789',
        index: 0,
        contentType: 'video/mp4',
        contentLength: GENJUTSU_PROXY_UPLOAD_MAX_BYTES + 1,
      }),
    /Proxy upload supports/
  );
});

test('Genjutsu R2 object keys include the configured upload path', () => {
  assert.equal(
    buildGenjutsuR2ObjectKey('uploads', 'genjutsu/inputs/u/g/source.mp4'),
    'uploads/genjutsu/inputs/u/g/source.mp4'
  );
  assert.equal(
    buildGenjutsuR2ObjectKey('/uploads/', 'genjutsu/inputs/u/g/source.mp4'),
    'uploads/genjutsu/inputs/u/g/source.mp4'
  );
});

test('Genjutsu proxy upload maps binding miss and R2 put errors to 5xx', () => {
  assert.equal(
    statusForGenjutsuProxyUploadError(new GenjutsuR2BindingMissingError()),
    503
  );
  assert.equal(
    statusForGenjutsuProxyUploadError(
      new Error('Failed to upload to R2: HTTP 500')
    ),
    502
  );
  assert.equal(
    statusForGenjutsuProxyUploadError(new Error('Content-Type mismatch')),
    400
  );
});

test('Genjutsu proxy put via binding streams to the expected object key', async () => {
  const puts: Array<{ key: string; contentType?: string }> = [];
  const bucket = {
    async put(
      key: string,
      _body: unknown,
      options?: { httpMetadata?: { contentType?: string } }
    ) {
      puts.push({
        key,
        contentType: options?.httpMetadata?.contentType,
      });
    },
  };

  const result = await putGenjutsuStagingObjectViaBinding({
    bucket,
    uploadPath: 'uploads',
    key: 'genjutsu/inputs/user-123/gen-456789/source.mp4',
    body: new Uint8Array([1, 2, 3]),
    contentType: 'video/mp4',
  });

  assert.equal(result.via, 'binding');
  assert.equal(
    result.objectKey,
    'uploads/genjutsu/inputs/user-123/gen-456789/source.mp4'
  );
  assert.deepEqual(puts, [
    {
      key: 'uploads/genjutsu/inputs/user-123/gen-456789/source.mp4',
      contentType: 'video/mp4',
    },
  ]);
});

test('Genjutsu proxy put fails hard on Workers when R2_BUCKET is missing', async () => {
  const previousCf = (globalThis as any).__CF_ENV__;
  const previousEnv = (globalThis as any).__env__;
  (globalThis as any).__CF_ENV__ = { DB: {} };
  delete (globalThis as any).__env__;

  try {
    assert.equal(getR2BucketBinding(), null);
    await assert.rejects(
      () =>
        putGenjutsuStagingObject({
          key: 'genjutsu/inputs/user-123/gen-456789/source.mp4',
          body: new Uint8Array([1, 2, 3]),
          contentType: 'video/mp4',
          contentLength: 3,
        }),
      (error: unknown) => {
        assert.ok(error instanceof GenjutsuR2BindingMissingError);
        assert.equal(statusForGenjutsuProxyUploadError(error), 503);
        return true;
      }
    );
  } finally {
    (globalThis as any).__CF_ENV__ = previousCf;
    (globalThis as any).__env__ = previousEnv;
  }
});

test('Genjutsu proxy put via binding surfaces R2 failures as retryable 502', async () => {
  const bucket = {
    async put() {
      throw new Error('R2 put failed: internal error');
    },
  };

  try {
    await putGenjutsuStagingObjectViaBinding({
      bucket,
      uploadPath: 'uploads',
      key: 'genjutsu/inputs/user-123/gen-456789/source.mp4',
      body: new Uint8Array([1, 2, 3]),
      contentType: 'video/mp4',
    });
    assert.fail('expected put to throw');
  } catch (error) {
    assert.match(String((error as Error).message), /R2 put failed/);
    assert.equal(statusForGenjutsuProxyUploadError(error), 502);
  }
});

test('Genjutsu post-upload metadata rejects oversized or wrong-type objects', () => {
  assert.throws(
    () =>
      assertGenjutsuObjectMetadata({
        key: 'genjutsu/inputs/user/gen/source.mp4',
        index: 0,
        metadata: {
          contentLength: GENJUTSU_MAX_VIDEO_BYTES + 1,
          contentType: 'video/mp4',
        },
      }),
    /200 MB/
  );

  assert.throws(
    () =>
      assertGenjutsuObjectMetadata({
        key: 'genjutsu/inputs/user/gen/reference-01.png',
        index: 1,
        metadata: {
          contentLength: 1024,
          contentType: 'video/mp4',
        },
      }),
    /not an image/
  );
});

test('Genjutsu result keys are deterministic and user scoped', () => {
  const videoKey = getGenjutsuResultKey({
    userId: 'user-123',
    generationId: 'gen-456789',
  });
  assert.equal(videoKey, 'genjutsu/results/user-123/gen-456789.mp4');

  assert.doesNotThrow(() =>
    assertGenjutsuResultKeyOwned({
      userId: 'user-123',
      generationId: 'gen-456789',
      videoKey,
    })
  );

  assert.throws(
    () =>
      assertGenjutsuResultKeyOwned({
        userId: 'user-123',
        generationId: 'gen-456789',
        videoKey: 'genjutsu/results/user-999/gen-456789.mp4',
      }),
    /result-video storage key/
  );
});
