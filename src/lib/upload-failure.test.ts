import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError, SignedUploadError } from '@/lib/api-client';
import { collectUploadDiagnostics } from '@/lib/upload-diagnostics';
import {
  classifyUploadFailure,
  uploadFailureUserMessage,
} from '@/lib/upload-failure';
import { UploadFileReadError } from '@/lib/upload-file-preparation';

test('classifyUploadFailure maps file read errors separately from network', () => {
  const failure = classifyUploadFailure(
    new UploadFileReadError('Could not read the selected image')
  );
  assert.equal(failure.errorCode, 'UPLOAD_FILE_READ_ERROR');
  assert.equal(failure.httpStatus, null);
  assert.equal(failure.diagnostics?.filePreparationResult, 'failed');
});

test('classifyUploadFailure keeps HTTP and abort codes', () => {
  const http = classifyUploadFailure(
    new SignedUploadError(
      'Upload failed with HTTP 500',
      new ApiError(500, 'Upload failed with HTTP 500'),
      collectUploadDiagnostics({ attemptCount: 1, uploadElapsedMs: 10 }),
      500
    )
  );
  assert.equal(http.errorCode, 'UPLOAD_HTTP_ERROR');
  assert.equal(http.httpStatus, 500);

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
  assert.equal(aborted.errorCode, 'UPLOAD_ABORTED');
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
  assert.equal(failure.errorCode, 'UPLOAD_NETWORK_ERROR');
  assert.equal(failure.diagnostics?.uploadMethod, 'fetch');
});

test('uploadFailureUserMessage preserves non-network messages', () => {
  const message = uploadFailureUserMessage({
    cause: new Error('Storage returned an incomplete upload batch'),
    fallback: 'fallback',
    androidNetworkHint: 'android hint',
  });
  assert.equal(message, 'Storage returned an incomplete upload batch');
});
