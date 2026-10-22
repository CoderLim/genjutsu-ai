import { ApiError, SignedUploadError } from '@/lib/api-client';
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

export function classifyUploadFailure(
  cause: unknown,
  options?: { file?: File | null }
): ClassifiedUploadFailure {
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

  if (
    cause instanceof ApiError &&
    Number.isInteger(cause.code) &&
    cause.code >= 400 &&
    cause.code <= 599
  ) {
    return {
      errorCode: 'UPLOAD_HTTP_ERROR',
      httpStatus: cause.code,
      diagnostics: null,
    };
  }

  if (cause instanceof Error && cause.name === 'AbortError') {
    return {
      errorCode: 'UPLOAD_ABORTED',
      httpStatus: null,
      diagnostics: null,
    };
  }

  return {
    errorCode: 'UPLOAD_NETWORK_ERROR',
    httpStatus: null,
    diagnostics: null,
  };
}

/**
 * User-facing upload failure copy. Android Chrome network failures get a
 * concrete recovery hint; other errors keep the underlying message.
 */
export function uploadFailureUserMessage(params: {
  cause: unknown;
  fallback: string;
  androidNetworkHint: string;
}): string {
  const failure = classifyUploadFailure(params.cause);
  if (failure.errorCode === 'UPLOAD_NETWORK_ERROR' && isAndroidChrome()) {
    return params.androidNetworkHint;
  }
  if (params.cause instanceof UploadFileReadError) {
    return params.cause.message;
  }
  if (params.cause instanceof Error && params.cause.message.trim()) {
    return params.cause.message;
  }
  return params.fallback;
}
