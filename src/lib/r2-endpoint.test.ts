import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveR2Endpoint } from './r2-endpoint';

test('resolveR2Endpoint prefers explicit endpoint and strips trailing slashes', () => {
  assert.equal(
    resolveR2Endpoint({
      endpoint: 'https://custom.example.com/',
      accountId: 'acct',
    }),
    'https://custom.example.com'
  );
  assert.equal(
    resolveR2Endpoint({
      endpoint: 'https://custom.example.com///',
      accountId: '',
    }),
    'https://custom.example.com'
  );
});

test('resolveR2Endpoint builds default host from accountId', () => {
  assert.equal(
    resolveR2Endpoint({ accountId: 'abc123' }),
    'https://abc123.r2.cloudflarestorage.com'
  );
});

test('resolveR2Endpoint errors when neither endpoint nor accountId is set', () => {
  assert.throws(() => resolveR2Endpoint({}), /endpoint is required/);
  assert.throws(
    () => resolveR2Endpoint({ endpoint: '  ', accountId: '' }),
    /endpoint is required/
  );
});
