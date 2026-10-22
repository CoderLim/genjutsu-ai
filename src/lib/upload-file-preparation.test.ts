import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fileSizeBucket,
  getFilePreparation,
  isAndroidChrome,
  materializeImageFile,
  prepareReferenceImageFile,
  shouldMaterializeReferenceImages,
  UploadFileReadError,
} from '@/lib/upload-file-preparation';

const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ANDROID_WEBVIEW_UA =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP3A.240905.015; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36';

test('isAndroidChrome detects Android Chrome and excludes desktop/WebView', () => {
  assert.equal(isAndroidChrome(ANDROID_CHROME_UA), true);
  assert.equal(isAndroidChrome(DESKTOP_CHROME_UA), false);
  assert.equal(isAndroidChrome(ANDROID_WEBVIEW_UA), false);
});

test('shouldMaterializeReferenceImages is gated to Android Chrome', () => {
  assert.equal(shouldMaterializeReferenceImages(ANDROID_CHROME_UA), true);
  assert.equal(shouldMaterializeReferenceImages(DESKTOP_CHROME_UA), false);
});

test('fileSizeBucket buckets by size', () => {
  assert.equal(fileSizeBucket(100), '0-256KB');
  assert.equal(fileSizeBucket(512 * 1024), '256KB-1MB');
  assert.equal(fileSizeBucket(2 * 1024 * 1024), '1-3MB');
  assert.equal(fileSizeBucket(13 * 1024 * 1024), '12MB+');
});

test('materializeImageFile copies bytes into a new File preserving name/type', async () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);
  const original = new File([bytes], 'shot.jpg', { type: 'image/jpeg' });
  const next = await materializeImageFile(original);

  assert.notEqual(next, original);
  assert.equal(next.name, 'shot.jpg');
  assert.equal(next.type, 'image/jpeg');
  assert.equal(next.size, original.size);
  assert.deepEqual(
    new Uint8Array(await next.arrayBuffer()),
    new Uint8Array(await original.arrayBuffer())
  );
});

test('prepareReferenceImageFile skips materialize on non-Android', async () => {
  const file = new File([new Uint8Array([9, 9])], 'a.png', {
    type: 'image/png',
  });
  const result = await prepareReferenceImageFile({
    file,
    userAgent: DESKTOP_CHROME_UA,
  });
  assert.equal(result.file, file);
  assert.equal(result.meta.mode, 'original');
  assert.equal(result.meta.result, 'skipped');
  assert.equal(getFilePreparation(file)?.result, 'skipped');
});

test('prepareReferenceImageFile materializes on Android Chrome', async () => {
  const file = new File([new Uint8Array([7, 7, 7])], 'b.jpg', {
    type: 'image/jpeg',
  });
  const result = await prepareReferenceImageFile({
    file,
    userAgent: ANDROID_CHROME_UA,
  });
  assert.notEqual(result.file, file);
  assert.equal(result.meta.mode, 'materialized');
  assert.equal(result.meta.result, 'success');
  assert.equal(getFilePreparation(result.file)?.mode, 'materialized');
});

test('prepareReferenceImageFile rejects oversized images', async () => {
  const big = new File([new Uint8Array(13 * 1024 * 1024)], 'big.jpg', {
    type: 'image/jpeg',
  });
  await assert.rejects(
    () =>
      prepareReferenceImageFile({
        file: big,
        maxBytes: 12 * 1024 * 1024,
        userAgent: DESKTOP_CHROME_UA,
      }),
    (err: unknown) => err instanceof UploadFileReadError
  );
});

test('materializeImageFile surfaces read failures as UploadFileReadError', async () => {
  const file = new File([new Uint8Array([1])], 'bad.jpg', {
    type: 'image/jpeg',
  });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => {
      throw new Error('boom');
    },
  });
  await assert.rejects(
    () => materializeImageFile(file),
    (err: unknown) =>
      err instanceof UploadFileReadError &&
      /Could not read the selected image/.test(err.message)
  );
});
