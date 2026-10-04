import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyClientEnvironment,
  isRetryableUploadFailure,
  sanitizeUploadDiagnostics,
} from '@/lib/upload-diagnostics';

function apiError(code: number, message: string) {
  const error = new Error(message) as Error & { code: number };
  error.name = 'ApiError';
  error.code = code;
  return error;
}

test('classifyClientEnvironment maps common UA strings', () => {
  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    ),
    { browser: 'Safari', os: 'iOS' }
  );

  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1'
    ),
    { browser: 'Chrome', os: 'iOS' }
  );

  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15'
    ),
    { browser: 'Firefox', os: 'iOS' }
  );

  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ),
    { browser: 'Chrome', os: 'Windows' }
  );

  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    ),
    { browser: 'Edge', os: 'Windows' }
  );
});

test('isRetryableUploadFailure only retries transient failures', () => {
  assert.equal(
    isRetryableUploadFailure(new TypeError('Failed to fetch')),
    true
  );
  assert.equal(isRetryableUploadFailure(apiError(503, 'Unavailable')), true);
  assert.equal(isRetryableUploadFailure(apiError(429, 'Slow down')), true);
  assert.equal(isRetryableUploadFailure(apiError(403, 'Forbidden')), false);
  assert.equal(isRetryableUploadFailure(apiError(400, 'Bad request')), false);

  const aborted = new Error('aborted');
  aborted.name = 'AbortError';
  assert.equal(isRetryableUploadFailure(aborted), false);

  const timedOut = new Error('timed out');
  timedOut.name = 'UploadTimeoutError';
  assert.equal(isRetryableUploadFailure(timedOut), true);
});

test('sanitizeUploadDiagnostics accepts only safe structured fields', () => {
  assert.deepEqual(
    sanitizeUploadDiagnostics({
      attemptCount: 3,
      uploadElapsedMs: 8211,
      online: true,
      visibilityState: 'visible',
      browser: 'Safari',
      os: 'iOS',
      errorName: 'TypeError',
      evil: 'drop table',
      errorMessage: 'should be ignored',
    }),
    {
      attemptCount: 3,
      uploadElapsedMs: 8211,
      online: true,
      visibilityState: 'visible',
      browser: 'Safari',
      os: 'iOS',
      errorName: 'TypeError',
    }
  );

  assert.deepEqual(
    sanitizeUploadDiagnostics({
      attemptCount: 99,
      uploadElapsedMs: -1,
      browser: 'HackBrowser',
      os: 'TempleOS',
      errorName: 'bad name with spaces',
      visibilityState: 'offline',
    }),
    {}
  );
});
