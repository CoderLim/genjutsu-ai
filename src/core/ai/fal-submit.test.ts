import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyFalSubmitFailure,
  isDefiniteFalSubmitRejection,
  isTransientFalHttpStatus,
  parseFalHttpStatusFromError,
} from './fal';

test('classifies definite 4xx submit rejections as refundable', () => {
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 400'),
    'refund'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 401'),
    'refund'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 403'),
    'refund'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 404'),
    'refund'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 422'),
    'refund'
  );
});

test('classifies 5xx / 429 / 408 submit failures as uncertain', () => {
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 500'),
    'uncertain'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 502'),
    'uncertain'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 429'),
    'uncertain'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 408'),
    'uncertain'
  );
  assert.equal(classifyFalSubmitFailure('network down'), 'uncertain');
});

test('HTTP status helpers match Fal transport rules', () => {
  assert.equal(
    parseFalHttpStatusFromError('request failed with status: 502'),
    502
  );
  assert.equal(isTransientFalHttpStatus(502), true);
  assert.equal(isDefiniteFalSubmitRejection(502), false);
  assert.equal(isDefiniteFalSubmitRejection(404), true);
});
