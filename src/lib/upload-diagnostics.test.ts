import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyClientEnvironment,
  getUploadPutTimeoutMs,
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
    {
      browser: 'Safari',
      browserMajor: 17,
      os: 'iOS',
      isWebView: false,
      inAppBrowser: null,
    }
  );

  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1'
    ),
    {
      browser: 'Chrome',
      browserMajor: 120,
      os: 'iOS',
      isWebView: false,
      inAppBrowser: null,
    }
  );

  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15'
    ),
    {
      browser: 'Firefox',
      browserMajor: 120,
      os: 'iOS',
      isWebView: false,
      inAppBrowser: null,
    }
  );

  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ),
    {
      browser: 'Chrome',
      browserMajor: 120,
      os: 'Windows',
      isWebView: false,
      inAppBrowser: null,
    }
  );

  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    ),
    {
      browser: 'Edge',
      browserMajor: 120,
      os: 'Windows',
      isWebView: false,
      inAppBrowser: null,
    }
  );
});

test('classifyClientEnvironment identifies Android WebView and in-app browsers', () => {
  assert.deepEqual(
    classifyClientEnvironment(
      'Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP3A.240905.015; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0'
    ),
    {
      browser: 'Chrome',
      browserMajor: 140,
      os: 'Android',
      isWebView: true,
      inAppBrowser: 'instagram',
    }
  );
});

test('getUploadPutTimeoutMs scales with file size without timing out normal slow uploads', () => {
  assert.equal(getUploadPutTimeoutMs(1 * 1024 * 1024), 60_000);
  assert.ok(getUploadPutTimeoutMs(20 * 1024 * 1024) > 60_000);
  assert.ok(getUploadPutTimeoutMs(50 * 1024 * 1024) > 180_000);
  assert.equal(getUploadPutTimeoutMs(200 * 1024 * 1024), 8 * 60_000);
  assert.equal(getUploadPutTimeoutMs(0), 60_000);
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
      browser: 'Chrome',
      browserMajor: 140,
      os: 'Android',
      isWebView: true,
      inAppBrowser: 'instagram',
      effectiveType: '4g',
      rttMs: 220,
      downlinkMbps: 3.456,
      origin: 'https://genjutsuai.net',
      uploadHost: 'abc.r2.cloudflarestorage.com',
      errorName: 'TypeError',
      errorMessage: 'Failed to fetch\nwith newline',
      attempts: [
        {
          attempt: 1,
          elapsedMs: 168,
          errorName: 'TypeError',
          errorMessage: 'Failed to fetch',
          httpStatus: null,
        },
        {
          attempt: 2,
          elapsedMs: 171,
          errorName: 'ApiError',
          errorMessage: 'Unavailable',
          httpStatus: 503,
        },
      ],
      evil: 'drop table',
      signedUrl:
        'https://abc.r2.cloudflarestorage.com/object?X-Amz-Signature=secret',
    }),
    {
      attemptCount: 3,
      uploadElapsedMs: 8211,
      online: true,
      visibilityState: 'visible',
      browser: 'Chrome',
      browserMajor: 140,
      os: 'Android',
      isWebView: true,
      inAppBrowser: 'instagram',
      effectiveType: '4g',
      rttMs: 220,
      downlinkMbps: 3.46,
      origin: 'https://genjutsuai.net',
      uploadHost: 'abc.r2.cloudflarestorage.com',
      errorName: 'TypeError',
      errorMessage: 'Failed to fetch with newline',
      attempts: [
        {
          attempt: 1,
          elapsedMs: 168,
          errorName: 'TypeError',
          errorMessage: 'Failed to fetch',
          httpStatus: null,
        },
        {
          attempt: 2,
          elapsedMs: 171,
          errorName: 'ApiError',
          errorMessage: 'Unavailable',
          httpStatus: 503,
        },
      ],
    }
  );

  assert.deepEqual(
    sanitizeUploadDiagnostics({
      attemptCount: 99,
      uploadElapsedMs: -1,
      browser: 'HackBrowser',
      browserMajor: 10_000,
      os: 'TempleOS',
      isWebView: 'yes',
      inAppBrowser: 'evil',
      effectiveType: '10g',
      rttMs: -1,
      downlinkMbps: -2,
      origin: 'javascript:alert(1)',
      uploadHost: 'https://host/path?sig=secret',
      errorName: 'bad name with spaces',
      visibilityState: 'offline',
      attempts: [{ attempt: 0, elapsedMs: -1 }],
    }),
    {}
  );
});
