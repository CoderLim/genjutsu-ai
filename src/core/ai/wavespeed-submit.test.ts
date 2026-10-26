import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyWavespeedSubmitFailure,
  WavespeedHttpError,
} from './wavespeed';

test('definite 4xx WaveSpeed rejections are refundable', () => {
  assert.equal(
    classifyWavespeedSubmitFailure(new WavespeedHttpError(400, 'bad request')),
    'refund'
  );
  assert.equal(
    classifyWavespeedSubmitFailure(new WavespeedHttpError(401, 'unauthorized')),
    'refund'
  );
  assert.equal(
    classifyWavespeedSubmitFailure(new WavespeedHttpError(403, 'forbidden')),
    'refund'
  );
  assert.equal(
    classifyWavespeedSubmitFailure(new WavespeedHttpError(404, 'not found')),
    'refund'
  );
  assert.equal(
    classifyWavespeedSubmitFailure(
      new WavespeedHttpError(422, 'unprocessable')
    ),
    'refund'
  );
});

test('config errors are refundable (never reached provider)', () => {
  assert.equal(
    classifyWavespeedSubmitFailure(
      new WavespeedHttpError(503, 'missing key', 'WAVESPEED_NOT_CONFIGURED')
    ),
    'refund'
  );
});

test('5xx / 408 / 429 / network failures are uncertain', () => {
  assert.equal(
    classifyWavespeedSubmitFailure(new WavespeedHttpError(500, 'boom')),
    'uncertain'
  );
  assert.equal(
    classifyWavespeedSubmitFailure(new WavespeedHttpError(502, 'bad gateway')),
    'uncertain'
  );
  assert.equal(
    classifyWavespeedSubmitFailure(new WavespeedHttpError(408, 'timeout')),
    'uncertain'
  );
  assert.equal(
    classifyWavespeedSubmitFailure(new WavespeedHttpError(429, 'rate limited')),
    'uncertain'
  );
  assert.equal(
    classifyWavespeedSubmitFailure(new TypeError('fetch failed')),
    'uncertain'
  );
  assert.equal(
    classifyWavespeedSubmitFailure(new Error('network down')),
    'uncertain'
  );
});
