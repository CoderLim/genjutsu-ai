import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readSubmittingClaimedAt } from './billing';
import { IMAGE_TO_VIDEO_SUBMITTING_CLAIM_TTL_MS } from './constants';

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

test('submitting claim TTL is positive and finite', () => {
  assert.ok(IMAGE_TO_VIDEO_SUBMITTING_CLAIM_TTL_MS >= 60_000);
  assert.ok(Number.isFinite(IMAGE_TO_VIDEO_SUBMITTING_CLAIM_TTL_MS));
});
