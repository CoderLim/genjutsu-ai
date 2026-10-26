import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertImageToVideoGenerationId } from '@/modules/image-to-video/assert';
import {
  getImageToVideoTaskById,
  getImageToVideoUploadBinding,
} from '@/modules/image-to-video/billing';
import {
  assertImageToVideoStagingKeyOwned,
  ImageToVideoR2BindingMissingError,
  putImageToVideoStagingObject,
  statusForImageToVideoProxyUploadError,
} from '@/modules/image-to-video/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';

const SUCCESS_LOG_SAMPLE_RATE = 0.05;

function errorResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function logProxyUploadStage(params: {
  stage: string;
  generationId: string;
  detail?: string;
}) {
  const detail = params.detail ? ` ${params.detail}` : '';
  console.info(
    `image-to-video proxy_put stage=${params.stage} generationId=${params.generationId}${detail}`
  );
}

async function PUT({
  request,
  params,
}: {
  request: Request;
  params: { generationId: string };
}) {
  let generationIdForLog = params.generationId || 'unknown';

  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 500,
    keyPrefix: 'image-to-video-upload-proxy',
  });
  if (limited) {
    logProxyUploadStage({
      stage: 'rate_limited',
      generationId: generationIdForLog,
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
      generationId = assertImageToVideoGenerationId(params.generationId);
      generationIdForLog = generationId;
    } catch {
      return fail('Invalid generation ID', 400, 'invalid_generation_id');
    }

    const task = await getImageToVideoTaskById({
      generationId,
      userId: session.user.id,
    });
    if (!task || task.status !== 'initiated') {
      return fail('Generation attempt not found', 404, 'task_not_found');
    }

    const binding = getImageToVideoUploadBinding(task);
    if (!binding) {
      return fail('Upload not prepared', 400, 'binding_missing');
    }

    try {
      assertImageToVideoStagingKeyOwned({
        userId: session.user.id,
        generationId,
        imageKey: binding.stagingImageKey,
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
    if (contentType !== binding.contentType) {
      return fail(
        'Content-Type mismatch',
        400,
        'content_type_mismatch',
        `got=${contentType || 'missing'} expected=${binding.contentType}`
      );
    }

    const contentLengthHeader = request.headers.get('content-length');
    const contentLength = contentLengthHeader
      ? Number(contentLengthHeader)
      : NaN;
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength !== binding.contentLength
    ) {
      return fail(
        'Content-Length mismatch',
        400,
        'content_length_mismatch',
        `header=${contentLengthHeader ?? 'missing'} expected=${binding.contentLength}`
      );
    }

    if (!request.body) {
      return fail('Missing body', 400, 'missing_body');
    }

    stage = 'r2_put_start';

    try {
      await putImageToVideoStagingObject({
        key: binding.stagingImageKey,
        body: request.body,
        contentType: binding.contentType,
        contentLength: binding.contentLength,
      });
    } catch (putError: unknown) {
      console.error('image-to-video proxy upload put failed:', putError);
      const status = statusForImageToVideoProxyUploadError(putError);
      return fail(
        putError instanceof ImageToVideoR2BindingMissingError
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
        detail: `bytes=${binding.contentLength}`,
      });
    }

    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    console.error('image-to-video proxy upload failed:', error);
    logProxyUploadStage({
      stage: stage === 'entered' ? 'unexpected_error' : stage,
      generationId: generationIdForLog,
      detail: 'unexpected_error',
    });
    return errorResponse(
      error instanceof Error
        ? error.message || 'Upload failed'
        : 'Upload failed',
      500
    );
  }
}

export const Route = createFileRoute(
  '/api/image-to-video/upload/$generationId'
)({
  server: {
    handlers: { PUT },
  },
});
