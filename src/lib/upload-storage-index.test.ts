import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveUploadStorageIndex } from '@/lib/upload-storage-index';

test('resolveUploadStorageIndex prefers server upload.index', () => {
  assert.equal(resolveUploadStorageIndex({ index: 1 }, 0), 1);
  assert.equal(resolveUploadStorageIndex({ index: 2 }, 1), 2);
  assert.equal(resolveUploadStorageIndex({ index: 0 }, 5), 0);
});

test('resolveUploadStorageIndex falls back to array index when missing', () => {
  assert.equal(resolveUploadStorageIndex({}, 0), 0);
  assert.equal(resolveUploadStorageIndex({ index: null }, 3), 3);
  assert.equal(resolveUploadStorageIndex({ index: 1.5 }, 2), 2);
});
