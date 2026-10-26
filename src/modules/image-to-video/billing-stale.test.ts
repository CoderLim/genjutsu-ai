import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  IMAGE_TO_VIDEO_REFUNDABLE_STATUSES,
  readCompletingClaimedAt,
  readSubmittingClaimedAt,
} from './billing';
import {
  IMAGE_TO_VIDEO_COMPLETING_CLAIM_TTL_MS,
  IMAGE_TO_VIDEO_RECONCILE_MIN_AGE_MS,
  IMAGE_TO_VIDEO_SUBMITTING_CLAIM_TTL_MS,
} from './constants';

test('readSubmittingClaimedAt parses claim timestamp', () => {
  const iso = '2026-10-26T03:00:00.000Z';
  assert.equal(
    readSubmittingClaimedAt(
      JSON.stringify({ submissionClaim: 'x', submittingClaimedAt: iso })
    ),
    iso
  );
  assert.equal(readSubmittingClaimedAt(null), null);
});

test('readCompletingClaimedAt parses completing lease', () => {
  const iso = '2026-10-26T03:01:00.000Z';
  assert.equal(
    readCompletingClaimedAt(
      JSON.stringify({
        completionClaim: 'c',
        completingClaimedAt: iso,
      })
    ),
    iso
  );
  assert.equal(readCompletingClaimedAt('{}'), null);
});

test('submitting and completing claim TTLs are positive and finite', () => {
  assert.ok(IMAGE_TO_VIDEO_SUBMITTING_CLAIM_TTL_MS >= 60_000);
  assert.ok(Number.isFinite(IMAGE_TO_VIDEO_SUBMITTING_CLAIM_TTL_MS));
  assert.ok(IMAGE_TO_VIDEO_COMPLETING_CLAIM_TTL_MS >= 60_000);
  assert.ok(Number.isFinite(IMAGE_TO_VIDEO_COMPLETING_CLAIM_TTL_MS));
  assert.ok(IMAGE_TO_VIDEO_RECONCILE_MIN_AGE_MS >= 60_000);
});

test('refundable statuses include submission_unknown for confirmed upstream failure', () => {
  assert.ok(IMAGE_TO_VIDEO_REFUNDABLE_STATUSES.includes('submission_unknown'));
  assert.ok(IMAGE_TO_VIDEO_REFUNDABLE_STATUSES.includes('submitted'));
});
