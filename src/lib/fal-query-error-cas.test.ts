import assert from 'node:assert/strict';
import test from 'node:test';

import { FAL_QUERY_PERMANENT_ERROR_THRESHOLD } from '../core/ai/fal';
import {
  nextQueryPermanentErrorCount,
  shouldParkQueryErrorsAsUnknown,
} from './fal-query-error-cas';

test('query error count starts at 1 from empty taskResult', () => {
  assert.equal(nextQueryPermanentErrorCount(null), 1);
  assert.equal(nextQueryPermanentErrorCount(undefined), 1);
  assert.equal(nextQueryPermanentErrorCount('{}'), 1);
});

test('query error count increments from prior CAS payload', () => {
  assert.equal(
    nextQueryPermanentErrorCount(
      JSON.stringify({ queryPermanentErrorCount: 2, stage: 'provider_query' })
    ),
    3
  );
});

test('park threshold matches Fal permanent-error constant', () => {
  assert.equal(FAL_QUERY_PERMANENT_ERROR_THRESHOLD, 3);
  assert.equal(shouldParkQueryErrorsAsUnknown(2), false);
  assert.equal(shouldParkQueryErrorsAsUnknown(3), true);
});
