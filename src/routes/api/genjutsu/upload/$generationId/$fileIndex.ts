import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertGenerationId,
  getGenjutsuTaskById,
  getGenjutsuUploadBinding,
} from '@/modules/genjutsu/billing';
import {
  assertGenjutsuStagingKeyOwned,
  GENJUTSU_PROXY_UPLOAD_MAX_BYTES,
  GenjutsuR2BindingMissingError,
  putGenjutsuStagingObject,
  statusForGenjutsuProxyUploadError,
} from '@/modules/genjutsu/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';

function errorResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * Lightweight stage log for proxy PUT diagnosis.
 * Never logs filenames, tokens, cookies, or body bytes.
 * requestKind=proxy_put distinguishes these from attempt-failure POSTs.
 */
function logProxyUploadStage(params: {
  stage: string;
  generationId: string;
  fileIndex: number;
  detail?: string;
}) {
  const detail = params.detail ? ` ${params.detail}` : '';
  console.info(
    `genjutsu proxy_put stage=${params.stage} generationId=${params.generationId} fileIndex=${params.fileIndex}${detail}`
  );
}

async function PUT({
  request,
  params,
}: {
  request: Request;
  params: { generationId: string; fileIndex: string };
}) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 500,
    keyPrefix: 'genjutsu-upload-proxy',
  });
  if (limited) return limited;

  let generationIdForLog = params.generationId || 'unknown';
  let fileIndexForLog = Number(params.fileIndex);
  if (!Number.isInteger(fileIndexForLog)) fileIndexForLog = -1;

  try {
    logProxyUploadStage({
      stage: 'entered',
      generationId: generationIdForLog,
      fileIndex: fileIndexForLog,
    });

    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      logProxyUploadStage({
        stage: 'auth_failed',
        generationId: generationIdForLog,
        fileIndex: fileIndexForLog,
      });
      return errorResponse('Unauthorized', 401);
    }

    let generationId: string;
    try {
      generationId = assertGenerationId(params.generationId);
      generationIdForLog = generationId;
    } catch {
      logProxyUploadStage({
        stage: 'invalid_generation_id',
        generationId: generationIdForLog,
        fileIndex: fileIndexForLog,
      });
      return errorResponse('Invalid generation ID', 400);
    }

    const fileIndex = Number(params.fileIndex);
    if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex > 8) {
      logProxyUploadStage({
        stage: 'invalid_file_index',
        generationId,
        fileIndex: fileIndexForLog,
      });
      return errorResponse('Invalid file index', 400);
    }
    fileIndexForLog = fileIndex;

    const task = await getGenjutsuTaskById({
      generationId,
      userId: session.user.id,
    });
    if (!task || task.status !== 'initiated') {
      logProxyUploadStage({
        stage: 'task_not_found',
        generationId,
        fileIndex,
      });
      return errorResponse('Generation attempt not found', 404);
    }

    const binding = getGenjutsuUploadBinding(task);
    if (!binding) {
      logProxyUploadStage({
        stage: 'binding_missing',
        generationId,
        fileIndex,
      });
      return errorResponse('Upload not prepared', 400);
    }

    let storageKey: string | undefined;
    let expectedType: string | undefined;
    let expectedLength: number | undefined;

    if (binding.useDefaultTemplate) {
      // Template video is server-owned; clients only upload reference images at
      // Genjutsu indices 1..N. contentTypes/lengths are image-only (0-based).
      if (fileIndex < 1) {
        logProxyUploadStage({
          stage: 'invalid_template_index',
          generationId,
          fileIndex,
        });
        return errorResponse('Invalid file index for template preset', 400);
      }
      const imageIndex = fileIndex - 1;
      storageKey = binding.imageKeys[imageIndex];
      expectedType = binding.contentTypes[imageIndex]
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase();
      expectedLength = binding.contentLengths[imageIndex];
    } else {
      storageKey =
        fileIndex === 0 ? binding.videoKey : binding.imageKeys[fileIndex - 1];
      expectedType = binding.contentTypes[fileIndex]
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase();
      expectedLength = binding.contentLengths[fileIndex];
    }

    if (
      !storageKey ||
      !expectedType ||
      !Number.isSafeInteger(expectedLength) ||
      expectedLength! <= 0
    ) {
      logProxyUploadStage({
        stage: 'binding_incomplete',
        generationId,
        fileIndex,
      });
      return errorResponse('Upload binding incomplete', 400);
    }

    if (expectedLength! > GENJUTSU_PROXY_UPLOAD_MAX_BYTES) {
      logProxyUploadStage({
        stage: 'too_large_for_proxy',
        generationId,
        fileIndex,
        detail: `expectedLength=${expectedLength}`,
      });
      return errorResponse('File too large for proxy upload', 413);
    }

    try {
      assertGenjutsuStagingKeyOwned({
        userId: session.user.id,
        generationId,
        fileIndex,
        key: storageKey,
      });
    } catch (error: unknown) {
      logProxyUploadStage({
        stage: 'key_ownership_failed',
        generationId,
        fileIndex,
      });
      const message =
        error instanceof Error ? error.message : 'Invalid storage key';
      return errorResponse(message || 'Invalid storage key', 400);
    }

    logProxyUploadStage({
      stage: 'auth_ok',
      generationId,
      fileIndex,
    });

    const contentType =
      request.headers
        .get('content-type')
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase() || '';
    if (contentType !== expectedType) {
      logProxyUploadStage({
        stage: 'content_type_mismatch',
        generationId,
        fileIndex,
        detail: `got=${contentType || 'missing'} expected=${expectedType}`,
      });
      return errorResponse('Content-Type mismatch', 400);
    }

    const contentLengthHeader = request.headers.get('content-length');
    const contentLength = contentLengthHeader
      ? Number(contentLengthHeader)
      : NaN;
    // Keep integrity check: mismatch or missing Content-Length rejects the PUT.
    // Log explicitly so CF logs can distinguish browser CL issues from R2 fails.
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength !== expectedLength
    ) {
      logProxyUploadStage({
        stage: 'content_length_mismatch',
        generationId,
        fileIndex,
        detail: `header=${contentLengthHeader ?? 'missing'} expected=${expectedLength}`,
      });
      return errorResponse('Content-Length mismatch', 400);
    }

    if (!request.body) {
      logProxyUploadStage({
        stage: 'missing_body',
        generationId,
        fileIndex,
      });
      return errorResponse('Missing body', 400);
    }

    logProxyUploadStage({
      stage: 'r2_put_start',
      generationId,
      fileIndex,
      detail: `bytes=${expectedLength}`,
    });

    try {
      await putGenjutsuStagingObject({
        key: storageKey,
        body: request.body,
        contentType: expectedType,
        contentLength: expectedLength!,
      });
    } catch (putError: unknown) {
      console.error('genjutsu proxy upload put failed:', putError);
      logProxyUploadStage({
        stage: 'r2_put_failed',
        generationId,
        fileIndex,
      });
      const status = statusForGenjutsuProxyUploadError(putError);
      return errorResponse(
        putError instanceof GenjutsuR2BindingMissingError
          ? putError.message
          : putError instanceof Error
            ? putError.message || 'Upload failed'
            : 'Upload failed',
        status
      );
    }

    logProxyUploadStage({
      stage: 'r2_put_ok',
      generationId,
      fileIndex,
    });

    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    console.error('genjutsu proxy upload failed:', error);
    logProxyUploadStage({
      stage: 'unexpected_error',
      generationId: generationIdForLog,
      fileIndex: fileIndexForLog,
    });
    // Auth/DB/unexpected — treat as retryable server error, not client 400.
    return errorResponse(
      error instanceof Error
        ? error.message || 'Upload failed'
        : 'Upload failed',
      500
    );
  }
}

export const Route = createFileRoute(
  '/api/genjutsu/upload/$generationId/$fileIndex'
)({
  server: {
    handlers: { PUT },
  },
});
