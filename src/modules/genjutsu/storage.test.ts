import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertGenjutsuInputKeysOwned,
  assertGenjutsuObjectMetadata,
  assertGenjutsuResultKeyOwned,
  assertGenjutsuUploadSize,
  GENJUTSU_MAX_IMAGE_BYTES,
  GENJUTSU_MAX_VIDEO_BYTES,
  getGenjutsuInputPrefix,
  getGenjutsuResultKey,
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
      imageKeys: [
        `${prefix}reference-01.png`,
        `${prefix}reference-02.webp`,
      ],
    })
  );
});

test('Genjutsu rejects storage keys from another user or generation', () => {
  assert.throws(
    () =>
      assertGenjutsuInputKeysOwned({
        userId: 'user-a',
        generationId: 'gen-12345678',
        videoKey: 'genjutsu/inputs/user-b/gen-12345678/source.mp4',
        imageKeys: [
          'genjutsu/inputs/user-a/gen-12345678/reference-01.png',
        ],
      }),
    /source-video storage key/
  );

  assert.throws(
    () =>
      assertGenjutsuInputKeysOwned({
        userId: 'user-a',
        generationId: 'gen-12345678',
        videoKey: 'genjutsu/inputs/user-a/gen-12345678/source.mp4',
        imageKeys: [
          'genjutsu/inputs/user-a/other-generation/reference-01.png',
        ],
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
        imageKeys: [
          `${prefix}reference-01.png`,
          `${prefix}reference-01.png`,
        ],
      }),
    /reference-image storage keys/
  );
});

test('Genjutsu upload sizes enforce the business limits', () => {
  assert.doesNotThrow(() => assertGenjutsuUploadSize(0, GENJUTSU_MAX_VIDEO_BYTES));
  assert.doesNotThrow(() => assertGenjutsuUploadSize(1, GENJUTSU_MAX_IMAGE_BYTES));

  assert.throws(
    () => assertGenjutsuUploadSize(0, GENJUTSU_MAX_VIDEO_BYTES + 1),
    /200 MB/
  );
  assert.throws(
    () => assertGenjutsuUploadSize(1, GENJUTSU_MAX_IMAGE_BYTES + 1),
    /12 MB/
  );
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
