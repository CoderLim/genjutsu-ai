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

/** Sample successful PUTs so healthy traffic does not flood Workers logs. */
const SUCCESS_LOG_SAMPLE_RATE = 0.05;

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
  let generationIdForLog = params.generationId || 'unknown';
  let fileIndexForLog = Number(params.fileIndex);
  if (!Number.isInteger(fileIndexForLog)) fileIndexForLog = -1;

  // Log rate-limits before returning so ops can distinguish "never reached
  // Worker" (unknown / no app log) from "reached Worker but 429".
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 500,
    keyPrefix: 'genjutsu-upload-proxy',
  });
  if (limited) {
    logProxyUploadStage({
      stage: 'rate_limited',
      generationId: generationIdForLog,
      fileIndex: fileIndexForLog,
      detail: 'intervalMs=500',
    });
    return limited;
  }

  let stage = 'entered';

  const fail = (
    message: string,
    status: number,
    failStage: string,
    detail?: string
  ) => {
    stage = failStage;
    logProxyUploadStage({
      stage: failStage,
      generationId: generationIdForLog,
      fileIndex: fileIndexForLog,
      detail,
    });
    return errorResponse(message, status);
  };

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return fail('Unauthorized', 401, 'auth_failed');
    }

    let generationId: string;
    try {
      generationId = assertGenerationId(params.generationId);
      generationIdForLog = generationId;
    } catch {
      return fail('Invalid generation ID', 400, 'invalid_generation_id');
    }

    const fileIndex = Number(params.fileIndex);
    if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex > 8) {
      return fail('Invalid file index', 400, 'invalid_file_index');
    }
    fileIndexForLog = fileIndex;

    const task = await getGenjutsuTaskById({
      generationId,
      userId: session.user.id,
    });
    if (!task || task.status !== 'initiated') {
      return fail('Generation attempt not found', 404, 'task_not_found');
    }

    const binding = getGenjutsuUploadBinding(task);
    if (!binding) {
      return fail('Upload not prepared', 400, 'binding_missing');
    }

    let storageKey: string | undefined;
    let expectedType: string | undefined;
    let expectedLength: number | undefined;

    if (binding.useDefaultTemplate) {
      // Template video is server-owned; clients only upload reference images at
      // Genjutsu indices 1..N. contentTypes/lengths are image-only (0-based).
      if (fileIndex < 1) {
        return fail(
          'Invalid file index for template preset',
          400,
          'invalid_template_index'
        );
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
      return fail('Upload binding incomplete', 400, 'binding_incomplete');
    }

    if (expectedLength! > GENJUTSU_PROXY_UPLOAD_MAX_BYTES) {
      return fail(
        'File too large for proxy upload',
        413,
        'too_large_for_proxy',
        `expectedLength=${expectedLength}`
      );
    }

    try {
      assertGenjutsuStagingKeyOwned({
        userId: session.user.id,
        generationId,
        fileIndex,
        key: storageKey,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Invalid storage key';
      return fail(
        message || 'Invalid storage key',
        400,
        'key_ownership_failed'
      );
    }

    stage = 'auth_ok';

    const contentType =
      request.headers
        .get('content-type')
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase() || '';
    if (contentType !== expectedType) {
      return fail(
        'Content-Type mismatch',
        400,
        'content_type_mismatch',
        `got=${contentType || 'missing'} expected=${expectedType}`
      );
    }

    const contentLengthHeader = request.headers.get('content-length');
    const contentLength = contentLengthHeader
      ? Number(contentLengthHeader)
      : NaN;
    // Keep integrity check: mismatch or missing Content-Length rejects the PUT.
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength !== expectedLength
    ) {
      return fail(
        'Content-Length mismatch',
        400,
        'content_length_mismatch',
        `header=${contentLengthHeader ?? 'missing'} expected=${expectedLength}`
      );
    }

    if (!request.body) {
      return fail('Missing body', 400, 'missing_body');
    }

    stage = 'r2_put_start';

    try {
      await putGenjutsuStagingObject({
        key: storageKey,
        body: request.body,
        contentType: expectedType,
        contentLength: expectedLength!,
      });
    } catch (putError: unknown) {
      console.error('genjutsu proxy upload put failed:', putError);
      const status = statusForGenjutsuProxyUploadError(putError);
      return fail(
        putError instanceof GenjutsuR2BindingMissingError
          ? putError.message
          : putError instanceof Error
            ? putError.message || 'Upload failed'
            : 'Upload failed',
        status,
        'r2_put_failed'
      );
    }

    if (Math.random() < SUCCESS_LOG_SAMPLE_RATE) {
      logProxyUploadStage({
        stage: 'r2_put_ok',
        generationId,
        fileIndex,
        detail: `bytes=${expectedLength}`,
      });
    }

    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    console.error('genjutsu proxy upload failed:', error);
    logProxyUploadStage({
      stage: stage === 'entered' ? 'unexpected_error' : stage,
      generationId: generationIdForLog,
      fileIndex: fileIndexForLog,
      detail: 'unexpected_error',
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
