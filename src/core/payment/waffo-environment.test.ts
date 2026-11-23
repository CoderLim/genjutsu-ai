import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertWaffoMode,
  resolveWaffoEnvironment,
} from './waffo-environment';

test('Waffo Test requires local development and loopback app URL', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    assert.equal(resolveWaffoEnvironment(true, `http://${host}:3000`), 'test');
    assert.equal(resolveWaffoEnvironment(false, `http://${host}:3000`), 'prod');
  }
});

test('Preview, remote dev, malformed, and missing app URL use prod', () => {
  for (const url of [
    'https://genjutsuai.net',
    'https://preview.genjutsuai.net',
    'http://localhost.evil.com:3000',
    'http://192.168.1.20:3000',
    'not a URL',
    undefined,
  ]) {
    assert.equal(resolveWaffoEnvironment(true, url), 'prod');
  }
});

test('Waffo mode must be present and match the expected environment', () => {
  assert.doesNotThrow(() => assertWaffoMode('prod', 'prod'));
  assert.doesNotThrow(() => assertWaffoMode('test', 'test'));
  assert.throws(() => assertWaffoMode('test', 'prod'), /mode mismatch/);
  assert.throws(() => assertWaffoMode('prod', 'test'), /mode mismatch/);
  assert.throws(() => assertWaffoMode(undefined, 'prod'), /got missing/);
  assert.throws(() => assertWaffoMode(undefined, 'test'), /got missing/);
});
