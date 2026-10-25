import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSafeR2ObjectKey, resolveR2ObjectKey, trimR2PathSlashes } from './r2-object-key';

test('R2 logical keys resolve to one physical key without duplicate prefix', () => {
  for (const [key, expected] of [
    ['genjutsu/templates/a.mp4', 'uploads/genjutsu/templates/a.mp4'],
    ['uploads/genjutsu/templates/a.mp4', 'uploads/genjutsu/templates/a.mp4'],
    ['hotel-lobby/templates/default.mp4', 'uploads/hotel-lobby/templates/default.mp4'],
    ['kairo-bad-times/templates/v2.mp4', 'uploads/kairo-bad-times/templates/v2.mp4'],
    ['abc123.png', 'uploads/abc123.png'],
  ]) {
    assert.equal(resolveR2ObjectKey('uploads', key), expected);
    assert.equal(resolveR2ObjectKey('uploads', expected), expected);
  }
});

test('R2 multi-segment upload path, edge slashes and empty prefix', () => {
  assert.equal(trimR2PathSlashes('//assets/uploads//'), 'assets/uploads');
  assert.equal(resolveR2ObjectKey('/assets/uploads/', 'genjutsu/x.mp4'), 'assets/uploads/genjutsu/x.mp4');
  assert.equal(resolveR2ObjectKey('assets/uploads', 'assets/uploads/genjutsu/x.mp4'), 'assets/uploads/genjutsu/x.mp4');
  assert.equal(resolveR2ObjectKey('', 'abc123.png'), 'abc123.png');
  assert.equal(resolveR2ObjectKey('uploads', 'uploads-folder/x.mp4'), 'uploads/uploads-folder/x.mp4');
});

test('R2 rejects traversal, ambiguous paths, and malformed object keys', () => {
  for (const key of ['', '../a.mp4', 'a/../b', 'a/./b', '/abs', 'a/', 'a//b', 'a\\\\b', 'a?x', 'a#x', 'a%2Fb', 'a\n.mp4']) {
    assert.throws(() => resolveR2ObjectKey('uploads', key), /Invalid R2 object key/);
  }
  assert.throws(() => resolveR2ObjectKey('../unsafe', 'x.mp4'), /Invalid R2 object key/);
  assert.throws(() => assertSafeR2ObjectKey('a//b'), /Invalid/);
});

test('R2 allows previously valid filenames outside strict business namespaces', () => {
  assert.equal(resolveR2ObjectKey('uploads', '用户素材/My Photo (final).png'), 'uploads/用户素材/My Photo (final).png');
});
