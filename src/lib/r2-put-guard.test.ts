import assert from 'node:assert/strict';
import test from 'node:test';

import { checkR2PutHeadStatus } from './r2-put-guard';

test('R2 upload preflight permits missing objects without force', () => {
  assert.equal(checkR2PutHeadStatus(404, false), 'new');
});

test('R2 upload preflight rejects overwrites unless explicitly forced', () => {
  assert.throws(
    () => checkR2PutHeadStatus(200, false),
    /already exists.*--force/
  );
  assert.equal(checkR2PutHeadStatus(200, true), 'existing');
});

test('R2 upload preflight fails closed on auth, rate-limit, and server errors', () => {
  for (const code of [301, 403, 429, 500, 503]) {
    assert.throws(() => checkR2PutHeadStatus(code, false), /HEAD HTTP/);
    assert.throws(() => checkR2PutHeadStatus(code, true), /HEAD HTTP/);
  }
});
