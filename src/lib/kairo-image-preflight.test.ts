import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fitKairoImageDimensions,
  friendlyKairoGenerationError,
} from './kairo-image-preflight';

test('Kairo photo sizes down to 2048 while preserving aspect ratio', () => {
  assert.deepEqual(fitKairoImageDimensions(6000, 4000), {
    width: 2048,
    height: 1365,
  });
  assert.deepEqual(fitKairoImageDimensions(3000, 6000), {
    width: 1024,
    height: 2048,
  });
  assert.deepEqual(fitKairoImageDimensions(1200, 800), {
    width: 1200,
    height: 800,
  });
  assert.throws(() => fitKairoImageDimensions(0, 4000));
});

test('Kairo friendly errors do not expose provider URLs or JSON', () => {
  assert.match(
    friendlyKairoGenerationError('{"type":"image_too_large","details":"Image dimensions are too large"}'),
    /reference photo is too large/i
  );
  assert.doesNotMatch(
    friendlyKairoGenerationError('https://example.com/?X-Amz-Signature=secret'),
    /Signature/
  );
  assert.equal(friendlyKairoGenerationError('Insufficient credits'), 'Insufficient credits');
});
