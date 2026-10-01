import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertGenjutsuInputKeysOwned,
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

test('Genjutsu result keys are deterministic and user scoped', () => {
  assert.equal(
    getGenjutsuResultKey({
      userId: 'user-123',
      generationId: 'gen-456789',
    }),
    'genjutsu/results/user-123/gen-456789.mp4'
  );
});
