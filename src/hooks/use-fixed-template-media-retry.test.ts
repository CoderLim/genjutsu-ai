import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Mirror of retry URL construction in useFixedTemplateMedia — keeps retry
 * cache-bust behavior covered without mounting React.
 */
function buildRetrySrc(src: string, retryNonce: number): string {
  if (!src || retryNonce <= 0) return src;
  const join = src.includes('?') ? '&' : '?';
  return `${src}${join}_retry=${retryNonce}`;
}

test('retry appends cache-bust without dropping prior query params', () => {
  const base = '/api/genjutsu/template?product=rumpelstiltskin&delivery=proxy';
  const retried = buildRetrySrc(base, 2);
  assert.match(retried, /product=rumpelstiltskin/);
  assert.match(retried, /delivery=proxy/);
  assert.match(retried, /_retry=2/);
});

test('first load keeps the original src', () => {
  assert.equal(
    buildRetrySrc('/api/genjutsu/template?product=hotel-lobby', 0),
    '/api/genjutsu/template?product=hotel-lobby'
  );
});
