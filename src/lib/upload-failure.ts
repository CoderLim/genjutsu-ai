import { SignedUploadError } from '@/lib/api-client';
import {
  collectUploadDiagnostics,
  type UploadClientDiagnostics,
} from '@/lib/upload-diagnostics';
import {
  getFilePreparation,
  isAndroidChrome,
  UploadFileReadError,
  type FilePreparationMeta,
} from '@/lib/upload-file-preparation';

export type UploadFailureErrorCode =
  | 'UPLOAD_HTTP_ERROR'
  | 'UPLOAD_NETWORK_ERROR'
  | 'UPLOAD_ABORTED'
  | 'UPLOAD_FILE_READ_ERROR';

export type ClassifiedUploadFailure = {
  errorCode: UploadFailureErrorCode;
  httpStatus: number | null;
  diagnostics: UploadClientDiagnostics | null;
};

function mergePreparationIntoDiagnostics(
  diagnostics: UploadClientDiagnostics,
  preparation: FilePreparationMeta | null
): UploadClientDiagnostics {
  if (!preparation) {
    return {
      ...diagnostics,
      uploadMethod: diagnostics.uploadMethod ?? 'fetch',
    };
  }
  return {
    ...diagnostics,
    uploadMethod: diagnostics.uploadMethod ?? 'fetch',
    filePreparationMode: preparation.mode,
    filePreparationResult: preparation.result,
    fileReadError: preparation.fileReadError,
    fileSizeBucket: preparation.fileSizeBucket,
  };
}

/**
 * Classify errors that originated from the upload / file-prepare path.
 * Returns null for unrelated business errors (trim, template, provider, etc.).
 */
export function classifyUploadFailure(
  cause: unknown,
  options?: { file?: File | null }
): ClassifiedUploadFailure | null {
  const preparation = options?.file ? getFilePreparation(options.file) : null;

  if (cause instanceof UploadFileReadError) {
    const base = collectUploadDiagnostics({
      attemptCount: 1,
      uploadElapsedMs: 0,
      cause,
    });
    return {
      errorCode: 'UPLOAD_FILE_READ_ERROR',
      httpStatus: null,
      diagnostics: mergePreparationIntoDiagnostics(base, {
        mode: 'materialized',
        result: 'failed',
        fileReadError: cause.message.replace(/[\r\n\t]+/g, ' ').slice(0, 200),
        fileSizeBucket: preparation?.fileSizeBucket ?? null,
      }),
    };
  }

  if (cause instanceof SignedUploadError) {
    const diagnostics = mergePreparationIntoDiagnostics(
      {
        ...cause.diagnostics,
        uploadMethod: cause.diagnostics.uploadMethod ?? 'fetch',
      },
      preparation
    );
    if (cause.httpStatus != null) {
      return {
        errorCode: 'UPLOAD_HTTP_ERROR',
        httpStatus: cause.httpStatus,
        diagnostics,
      };
    }
    if (cause.cause instanceof Error && cause.cause.name === 'AbortError') {
      return {
        errorCode: 'UPLOAD_ABORTED',
        httpStatus: null,
        diagnostics,
      };
    }
    if (
      cause.cause instanceof Error &&
      cause.cause.name === 'UploadTimeoutError'
    ) {
      return {
        errorCode: 'UPLOAD_NETWORK_ERROR',
        httpStatus: null,
        diagnostics,
      };
    }
    if (cause.cause instanceof UploadFileReadError) {
      return {
        errorCode: 'UPLOAD_FILE_READ_ERROR',
        httpStatus: null,
        diagnostics: mergePreparationIntoDiagnostics(diagnostics, {
          mode: preparation?.mode ?? 'materialized',
          result: 'failed',
          fileReadError: cause.cause.message
            .replace(/[\r\n\t]+/g, ' ')
            .slice(0, 200),
          fileSizeBucket: preparation?.fileSizeBucket ?? null,
        }),
      };
    }
    return {
      errorCode: 'UPLOAD_NETWORK_ERROR',
      httpStatus: null,
      diagnostics,
    };
  }

  // Bare ApiError / AbortError outside SignedUploadError are ambiguous
  // (could be generate/status). Do not classify as upload.
  return null;
}

/**
 * User-facing message for the generate catch-all.
 * Android upload network hint only applies to SignedUploadError network failures.
 * Ordinary business errors keep their own message.
 */
export function uploadFailureUserMessage(params: {
  cause: unknown;
  fallback: string;
  androidNetworkHint: string;
}): string {
  if (params.cause instanceof UploadFileReadError) {
    return params.cause.message;
  }

  if (params.cause instanceof SignedUploadError) {
    const failure = classifyUploadFailure(params.cause);
    if (failure?.errorCode === 'UPLOAD_NETWORK_ERROR' && isAndroidChrome()) {
      return params.androidNetworkHint;
    }
    if (params.cause.message.trim()) return params.cause.message;
    return params.fallback;
  }

  if (params.cause instanceof Error && params.cause.message.trim()) {
    return params.cause.message;
  }
  return params.fallback;
}

/** True when the error is from the upload/file-prepare path. */
export function isUploadPathError(cause: unknown): boolean {
  return (
    cause instanceof UploadFileReadError || cause instanceof SignedUploadError
  );
}
