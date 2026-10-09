import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GENJUTSU_PROVIDER_FAILED_CODE,
  GENJUTSU_PROVIDER_FAILURE_USER_MESSAGE,
  isArkRealPersonPrivacyCode,
  isUncertainProviderHttpStatus,
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

test('maps Ark PrivacyInformation codes to likeness rejection', () => {
  assert.equal(
    isArkRealPersonPrivacyCode(
      'InputVideoSensitiveContentDetected.PrivacyInformation'
    ),
    true
  );
  assert.equal(
    isArkRealPersonPrivacyCode(
      'InputImageSensitiveContentDetected.PrivacyInformation'
    ),
    true
  );

  const split = splitProviderFailureError(
    "The request failed because the input video 'content[1]' may contain real person. Request id: abc",
    'InputVideoSensitiveContentDetected.PrivacyInformation'
  );
  assert.equal(split.likeness, true);
  assert.equal(split.error, SEEDANCE_LIKENESS_REJECTION_MESSAGE);
  assert.equal(split.errorCode, 'PROVIDER_LIKENESS_REJECTED');
  assert.equal(
    split.providerCode,
    'InputVideoSensitiveContentDetected.PrivacyInformation'
  );
});

test('keeps likeness rejections actionable for users via message fallback', () => {
  const raw =
    'The prompt or media appears to contain likenesses of real people and cannot be processed.';
  const split = splitProviderFailureError(raw);
  assert.equal(split.likeness, true);
  assert.equal(split.error, SEEDANCE_LIKENESS_REJECTION_MESSAGE);
  assert.equal(split.providerError, raw);
  assert.equal(split.errorCode, 'PROVIDER_LIKENESS_REJECTED');
});

test('maps Volcengine real-person video rejection via message fallback', () => {
  const raw =
    "The request failed because the input video 'content[1]' may contain real person. Request id: 0217911282684540abef843717a049b367df527ee7bcb35a98326";
  const split = splitProviderFailureError(raw);
  assert.equal(split.likeness, true);
  assert.equal(split.error, SEEDANCE_LIKENESS_REJECTION_MESSAGE);
  assert.equal(split.errorCode, 'PROVIDER_LIKENESS_REJECTED');
  assert.equal(split.providerError, raw);
});

test('always preserves raw text for admin on provider failures', () => {
  const raw = 'Volcengine internal timeout xyz';
  const split = splitProviderFailureError(raw);
  assert.equal(split.error, GENJUTSU_PROVIDER_FAILURE_USER_MESSAGE);
  assert.equal(split.providerError, raw);
  assert.equal(split.errorCode, GENJUTSU_PROVIDER_FAILED_CODE);
});

test('treats 408 / 429 / 5xx as uncertain provider submit statuses', () => {
  assert.equal(isUncertainProviderHttpStatus(408), true);
  assert.equal(isUncertainProviderHttpStatus(429), true);
  assert.equal(isUncertainProviderHttpStatus(500), true);
  assert.equal(isUncertainProviderHttpStatus(502), true);
  assert.equal(isUncertainProviderHttpStatus(503), true);
});

test('treats definite 4xx as refundable provider submit statuses', () => {
  assert.equal(isUncertainProviderHttpStatus(400), false);
  assert.equal(isUncertainProviderHttpStatus(401), false);
  assert.equal(isUncertainProviderHttpStatus(403), false);
  assert.equal(isUncertainProviderHttpStatus(404), false);
  assert.equal(isUncertainProviderHttpStatus(422), false);
});
