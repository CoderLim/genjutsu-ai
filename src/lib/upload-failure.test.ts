import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError, SignedUploadError } from '@/lib/api-client';
import { collectUploadDiagnostics } from '@/lib/upload-diagnostics';
import {
  classifyUploadFailure,
  isUploadPathError,
  uploadFailureUserMessage,
} from '@/lib/upload-failure';
import { UploadFileReadError } from '@/lib/upload-file-preparation';

test('classifyUploadFailure maps file read errors separately from network', () => {
  const failure = classifyUploadFailure(
    new UploadFileReadError('Could not read the selected image')
  );
  assert.ok(failure);
  assert.equal(failure!.errorCode, 'UPLOAD_FILE_READ_ERROR');
  assert.equal(failure!.httpStatus, null);
  assert.equal(failure!.diagnostics?.filePreparationResult, 'failed');
});

test('classifyUploadFailure keeps HTTP and abort codes for SignedUploadError', () => {
  const http = classifyUploadFailure(
    new SignedUploadError(
      'Upload failed with HTTP 500',
      new ApiError(500, 'Upload failed with HTTP 500'),
      collectUploadDiagnostics({ attemptCount: 1, uploadElapsedMs: 10 }),
      500
    )
  );
  assert.equal(http?.errorCode, 'UPLOAD_HTTP_ERROR');
  assert.equal(http?.httpStatus, 500);

  const abortCause = new Error('aborted');
  abortCause.name = 'AbortError';
  const aborted = classifyUploadFailure(
    new SignedUploadError(
      'aborted',
      abortCause,
      collectUploadDiagnostics({ attemptCount: 1, uploadElapsedMs: 5 }),
      null
    )
  );
  assert.equal(aborted?.errorCode, 'UPLOAD_ABORTED');
});

test('classifyUploadFailure maps Failed to fetch to UPLOAD_NETWORK_ERROR', () => {
  const failure = classifyUploadFailure(
    new SignedUploadError(
      'Failed to fetch',
      new TypeError('Failed to fetch'),
      collectUploadDiagnostics({
        attemptCount: 3,
        uploadElapsedMs: 120,
        cause: new TypeError('Failed to fetch'),
      }),
      null
    )
  );
  assert.equal(failure?.errorCode, 'UPLOAD_NETWORK_ERROR');
  assert.equal(failure?.diagnostics?.uploadMethod, 'fetch');
});

test('classifyUploadFailure returns null for ordinary business errors', () => {
  assert.equal(classifyUploadFailure(new Error('Failed to trim video')), null);
  assert.equal(classifyUploadFailure(new Error('Template unavailable')), null);
  assert.equal(
    classifyUploadFailure(new ApiError(402, 'INSUFFICIENT_CREDITS')),
    null
  );
});

test('uploadFailureUserMessage keeps business errors and only hints on SignedUpload network', () => {
  assert.equal(
    uploadFailureUserMessage({
      cause: new Error('Failed to trim video'),
      fallback: 'fallback',
      androidNetworkHint: 'android hint',
    }),
    'Failed to trim video'
  );

  assert.equal(
    uploadFailureUserMessage({
      cause: new Error('Template unavailable'),
      fallback: 'fallback',
      androidNetworkHint: 'android hint',
    }),
    'Template unavailable'
  );

  assert.equal(
    uploadFailureUserMessage({
      cause: new UploadFileReadError('Could not read the selected image'),
      fallback: 'fallback',
      androidNetworkHint: 'android hint',
    }),
    'Could not read the selected image'
  );

  const signed = new SignedUploadError(
    'Failed to fetch',
    new TypeError('Failed to fetch'),
    collectUploadDiagnostics({
      attemptCount: 3,
      uploadElapsedMs: 50,
      cause: new TypeError('Failed to fetch'),
    }),
    null
  );
  // Non-Android test env: keep SignedUploadError message (not android hint).
  assert.equal(
    uploadFailureUserMessage({
      cause: signed,
      fallback: 'fallback',
      androidNetworkHint: 'android hint',
    }),
    'Failed to fetch'
  );
});

test('isUploadPathError only matches prepare/upload errors', () => {
  assert.equal(isUploadPathError(new UploadFileReadError('x')), true);
  assert.equal(
    isUploadPathError(
      new SignedUploadError(
        'x',
        new Error('x'),
        collectUploadDiagnostics({ attemptCount: 1, uploadElapsedMs: 1 })
      )
    ),
    true
  );
  assert.equal(isUploadPathError(new Error('Failed to trim video')), false);
});
