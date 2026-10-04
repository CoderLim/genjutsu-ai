import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GENJUTSU_PROVIDER_FAILED_CODE,
  GENJUTSU_PROVIDER_FAILURE_USER_MESSAGE,
  looksLikeRawProviderError,
  splitProviderFailureError,
  toUserFacingProviderError,
} from './provider-errors';
import { SEEDANCE_LIKENESS_REJECTION_MESSAGE } from './seedance';

test('detects Volcengine Safe Experience Mode dumps', () => {
  const raw =
    "Your account [2102775600] has reached the set usage limit for the [doubao-seedance-2-5] model, and the model service has been paused. To continue using this model, please visit the Model Activation page to adjust or close the 'Safe Experience Mode'. Request id: 021791126639207000000000000000000ffffac1802a3f00ff7";
  assert.equal(looksLikeRawProviderError(raw), true);
  assert.equal(
    toUserFacingProviderError(raw),
    GENJUTSU_PROVIDER_FAILURE_USER_MESSAGE
  );
});

test('keeps likeness rejections actionable for users', () => {
  const raw =
    'The prompt or media appears to contain likenesses of real people and cannot be processed.';
  const split = splitProviderFailureError(raw);
  assert.equal(split.likeness, true);
  assert.equal(split.error, SEEDANCE_LIKENESS_REJECTION_MESSAGE);
  assert.equal(split.providerError, raw);
  assert.equal(split.errorCode, 'PROVIDER_LIKENESS_REJECTED');
});

test('always preserves raw text for admin on provider failures', () => {
  const raw = 'Volcengine internal timeout xyz';
  const split = splitProviderFailureError(raw);
  assert.equal(split.error, GENJUTSU_PROVIDER_FAILURE_USER_MESSAGE);
  assert.equal(split.providerError, raw);
  assert.equal(split.errorCode, GENJUTSU_PROVIDER_FAILED_CODE);
});
